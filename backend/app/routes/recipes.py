from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.recipe import Recipe
from app.models.recipe_ingredient import RecipeIngredient
from app.models.food_item import FoodItem
from app.schemas.recipe import RecipeCreate, RecipeUpdate, RecipeResponse, RecipeIngredientResponse
from app.schemas.ingredient import IngredientResponse
from app.services.cost_engine import FoodCostService
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/recipes", tags=["Recipes & Costing"])

def build_recipe_response(recipe: Recipe) -> RecipeResponse:
    batch_cost = FoodCostService.calculate_recipe_cost(recipe)
    cost_per_g = FoodCostService.calculate_cost_per_gram(recipe)

    ingredients_resp = []
    for item in recipe.ingredients:
        ing_resp = None
        if item.ingredient:
            ing_resp = IngredientResponse(
                id=item.ingredient.id,
                hotel_id=item.ingredient.hotel_id,
                name=item.ingredient.name,
                unit=item.ingredient.unit,
                cost_per_unit=item.ingredient.cost_per_unit,
                created_at=item.ingredient.created_at,
                updated_at=item.ingredient.updated_at,
            )
        ingredients_resp.append(
            RecipeIngredientResponse(
                id=item.id,
                recipe_id=item.recipe_id,
                ingredient_id=item.ingredient_id,
                quantity=item.quantity,
                unit=item.unit,
                ingredient=ing_resp,
            )
        )

    return RecipeResponse(
        id=recipe.id,
        hotel_id=recipe.hotel_id,
        name=recipe.name,
        food_item_id=recipe.food_item_id,
        food_item_name=recipe.food_item.name if recipe.food_item else None,
        expected_yield_grams=recipe.expected_yield_grams,
        notes=recipe.notes,
        total_batch_cost=batch_cost,
        cost_per_gram=cost_per_g,
        ingredients=ingredients_resp,
        created_at=recipe.created_at,
        updated_at=recipe.updated_at,
    )

@router.get("", response_model=List[RecipeResponse])
def list_recipes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recipes = (
        db.query(Recipe)
        .filter(Recipe.hotel_id == current_user.hotel_id)
        .options(
            joinedload(Recipe.food_item),
            joinedload(Recipe.ingredients).joinedload(RecipeIngredient.ingredient)
        )
        .order_by(Recipe.name.asc())
        .all()
    )
    return [build_recipe_response(r) for r in recipes]

@router.post("", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
def create_recipe(
    payload: RecipeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required.")

    if payload.food_item_id:
        existing = db.query(Recipe).filter(
            Recipe.food_item_id == payload.food_item_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="A recipe is already linked to this food item.")

    recipe = Recipe(
        hotel_id=current_user.hotel_id,
        name=payload.name.strip(),
        food_item_id=payload.food_item_id,
        expected_yield_grams=payload.expected_yield_grams,
        notes=payload.notes.strip() if payload.notes else None
    )
    db.add(recipe)
    db.flush()

    for item in payload.ingredients:
        ri = RecipeIngredient(
            recipe_id=recipe.id,
            ingredient_id=item.ingredient_id,
            quantity=item.quantity,
            unit=item.unit
        )
        db.add(ri)

    db.commit()
    db.refresh(recipe)

    # Reload with relationships
    recipe = (
        db.query(Recipe)
        .filter(Recipe.id == recipe.id)
        .options(
            joinedload(Recipe.food_item),
            joinedload(Recipe.ingredients).joinedload(RecipeIngredient.ingredient)
        )
        .first()
    )
    return build_recipe_response(recipe)

@router.get("/{id}", response_model=RecipeResponse)
def get_recipe(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recipe = (
        db.query(Recipe)
        .filter(Recipe.id == id, Recipe.hotel_id == current_user.hotel_id)
        .options(
            joinedload(Recipe.food_item),
            joinedload(Recipe.ingredients).joinedload(RecipeIngredient.ingredient)
        )
        .first()
    )
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return build_recipe_response(recipe)

@router.put("/{id}", response_model=RecipeResponse)
def update_recipe(
    id: int,
    payload: RecipeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required.")

    recipe = db.query(Recipe).filter(Recipe.id == id, Recipe.hotel_id == current_user.hotel_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    if payload.name is not None:
        recipe.name = payload.name.strip()
    if payload.food_item_id is not None:
        recipe.food_item_id = payload.food_item_id
    if payload.expected_yield_grams is not None:
        recipe.expected_yield_grams = payload.expected_yield_grams
    if payload.notes is not None:
        recipe.notes = payload.notes.strip() if payload.notes else None

    if payload.ingredients is not None:
        db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe.id).delete()
        for item in payload.ingredients:
            ri = RecipeIngredient(
                recipe_id=recipe.id,
                ingredient_id=item.ingredient_id,
                quantity=item.quantity,
                unit=item.unit
            )
            db.add(ri)

    db.commit()
    db.refresh(recipe)

    recipe = (
        db.query(Recipe)
        .filter(Recipe.id == recipe.id)
        .options(
            joinedload(Recipe.food_item),
            joinedload(Recipe.ingredients).joinedload(RecipeIngredient.ingredient)
        )
        .first()
    )
    return build_recipe_response(recipe)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required.")

    recipe = db.query(Recipe).filter(Recipe.id == id, Recipe.hotel_id == current_user.hotel_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    db.delete(recipe)
    db.commit()
    return None
