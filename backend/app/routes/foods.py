from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.models.food_item import FoodItem
from app.schemas.food_item import FoodItemCreate, FoodItemResponse, FoodItemUpdate
from app.services.cost_engine import FoodCostService
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/foods", tags=["Food Items Catalog"])

def build_food_response(db: Session, item: FoodItem) -> FoodItemResponse:
    cost_per_g = FoodCostService.get_cost_per_gram_for_food(db, item)
    return FoodItemResponse(
        id=item.id,
        hotel_id=item.hotel_id,
        name=item.name,
        category=item.category,
        default_unit=item.default_unit,
        default_cost_per_kg=item.default_cost_per_kg,
        density_g_per_cm3=item.density_g_per_cm3,
        default_depth_cm=item.default_depth_cm,
        portion_scaling_factor=item.portion_scaling_factor,
        min_estimated_weight_g=item.min_estimated_weight_g,
        max_estimated_weight_g=item.max_estimated_weight_g,
        calibration_factor=item.calibration_factor,
        recipe_id=item.recipe.id if item.recipe else None,
        cost_per_gram=cost_per_g,
        created_at=item.created_at,
    )

@router.get("", response_model=List[FoodItemResponse])
def get_food_items(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        db.query(FoodItem)
        .filter(FoodItem.hotel_id == current_user.hotel_id)
        .options(joinedload(FoodItem.recipe))
    )
    if category:
        query = query.filter(FoodItem.category == category)
    items = query.order_by(FoodItem.category, FoodItem.name).all()
    return [build_food_response(db, item) for item in items]

@router.post("", response_model=FoodItemResponse, status_code=status.HTTP_201_CREATED)
def create_food_item(
    payload: FoodItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(FoodItem).filter(
        FoodItem.hotel_id == current_user.hotel_id,
        FoodItem.name.ilike(payload.name.strip())
    ).first()
    if existing:
        return build_food_response(db, existing)

    item = FoodItem(
        hotel_id=current_user.hotel_id,
        name=payload.name.strip(),
        category=payload.category.strip(),
        default_unit=payload.default_unit or "kg",
        default_cost_per_kg=payload.default_cost_per_kg,
        density_g_per_cm3=payload.density_g_per_cm3,
        default_depth_cm=payload.default_depth_cm,
        portion_scaling_factor=payload.portion_scaling_factor,
        min_estimated_weight_g=payload.min_estimated_weight_g,
        max_estimated_weight_g=payload.max_estimated_weight_g,
        calibration_factor=payload.calibration_factor,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return build_food_response(db, item)

@router.get("/{id}", response_model=FoodItemResponse)
def get_food_item(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(FoodItem).filter(FoodItem.id == id, FoodItem.hotel_id == current_user.hotel_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    return build_food_response(db, item)

@router.put("/{id}", response_model=FoodItemResponse)
def update_food_item(
    id: int,
    payload: FoodItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required.")

    item = db.query(FoodItem).filter(FoodItem.id == id, FoodItem.hotel_id == current_user.hotel_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")

    if payload.name is not None:
        item.name = payload.name.strip()
    if payload.category is not None:
        item.category = payload.category.strip()
    if payload.default_unit is not None:
        item.default_unit = payload.default_unit
    if payload.default_cost_per_kg is not None:
        item.default_cost_per_kg = payload.default_cost_per_kg
    if payload.density_g_per_cm3 is not None:
        item.density_g_per_cm3 = payload.density_g_per_cm3
    if payload.default_depth_cm is not None:
        item.default_depth_cm = payload.default_depth_cm
    if payload.portion_scaling_factor is not None:
        item.portion_scaling_factor = payload.portion_scaling_factor
    if payload.min_estimated_weight_g is not None:
        item.min_estimated_weight_g = payload.min_estimated_weight_g
    if payload.max_estimated_weight_g is not None:
        item.max_estimated_weight_g = payload.max_estimated_weight_g
    if payload.calibration_factor is not None:
        item.calibration_factor = payload.calibration_factor

    db.commit()
    db.refresh(item)
    return build_food_response(db, item)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_food_item(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required.")

    item = db.query(FoodItem).filter(FoodItem.id == id, FoodItem.hotel_id == current_user.hotel_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")

    db.delete(item)
    db.commit()
    return None
