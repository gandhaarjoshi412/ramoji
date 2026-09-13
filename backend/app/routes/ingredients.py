from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.ingredient import Ingredient
from app.schemas.ingredient import IngredientCreate, IngredientUpdate, IngredientResponse
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/ingredients", tags=["Ingredients"])

@router.get("", response_model=List[IngredientResponse])
def list_ingredients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return (
        db.query(Ingredient)
        .filter(Ingredient.hotel_id == current_user.hotel_id)
        .order_by(Ingredient.name.asc())
        .all()
    )

@router.post("", response_model=IngredientResponse, status_code=status.HTTP_201_CREATED)
def create_ingredient(
    payload: IngredientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required.")

    existing = db.query(Ingredient).filter(
        Ingredient.hotel_id == current_user.hotel_id,
        Ingredient.name.ilike(payload.name.strip())
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ingredient already exists.")

    item = Ingredient(
        hotel_id=current_user.hotel_id,
        name=payload.name.strip(),
        unit=payload.unit.strip().lower(),
        cost_per_unit=payload.cost_per_unit
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.get("/{id}", response_model=IngredientResponse)
def get_ingredient(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(Ingredient).filter(Ingredient.id == id, Ingredient.hotel_id == current_user.hotel_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return item

@router.put("/{id}", response_model=IngredientResponse)
def update_ingredient(
    id: int,
    payload: IngredientUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required.")

    item = db.query(Ingredient).filter(Ingredient.id == id, Ingredient.hotel_id == current_user.hotel_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    if payload.name is not None:
        item.name = payload.name.strip()
    if payload.unit is not None:
        item.unit = payload.unit.strip().lower()
    if payload.cost_per_unit is not None:
        item.cost_per_unit = payload.cost_per_unit

    db.commit()
    db.refresh(item)
    return item

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ingredient(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required.")

    item = db.query(Ingredient).filter(Ingredient.id == id, Ingredient.hotel_id == current_user.hotel_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    db.delete(item)
    db.commit()
    return None
