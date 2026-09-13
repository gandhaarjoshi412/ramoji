from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel, Field

from app.database import get_db
from app.models.user import User
from app.models.event import Event
from app.models.event_food import EventFood
from app.models.food_item import FoodItem
from app.models.waste_record import WasteRecord
from app.schemas.event_food import EventFoodResponse, EventFoodUpdate
from app.schemas.waste_record import WasteRecordResponse
from app.services.calculation import calculate_waste_percentage, calculate_waste_cost
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/events/{event_id}/foods", tags=["Event Food"])

class AddEventFoodPayload(BaseModel):
    food_item_id: Optional[int] = None
    # If adding custom food directly:
    name: Optional[str] = None
    category: Optional[str] = None
    prepared_weight_kg: float = Field(..., gt=0.0)
    estimated_cost_per_kg: float = Field(default=0.0, ge=0.0)
    notes: Optional[str] = None

def build_event_food_response(ef: EventFood) -> EventFoodResponse:
    total_waste = sum(float(w.net_weight_kg) for w in ef.waste_records)
    prep = float(ef.prepared_weight_kg or 0.0)
    cost_kg = float(ef.estimated_cost_per_kg or 0.0)
    waste_pct = calculate_waste_percentage(total_waste, prep)
    cost = calculate_waste_cost(total_waste, cost_kg)

    waste_records_resp = [
        WasteRecordResponse(
            id=w.id,
            event_food_id=w.event_food_id,
            gross_weight_kg=w.gross_weight_kg,
            container_weight_kg=w.container_weight_kg,
            net_weight_kg=w.net_weight_kg,
            waste_reason=w.waste_reason,
            notes=w.notes,
            recorded_by=w.recorded_by,
            recorded_by_name=w.recorder.name if w.recorder else None,
            recorded_at=w.recorded_at,
            weight_source=w.weight_source,
            image_url=w.image_url,
            video_url=w.video_url,
            ai_food_prediction=w.ai_food_prediction,
            ai_confidence=w.ai_confidence,
            scale_weight=w.scale_weight,
            camera_device_id=w.camera_device_id,
        )
        for w in ef.waste_records
    ]

    return EventFoodResponse(
        id=ef.id,
        event_id=ef.event_id,
        food_item_id=ef.food_item_id,
        food_item_name=ef.food_item.name if ef.food_item else "Unknown Food",
        food_item_category=ef.food_item.category if ef.food_item else "Other",
        food_item_unit=ef.food_item.default_unit if ef.food_item else "kg",
        prepared_weight_kg=prep,
        estimated_cost_per_kg=cost_kg,
        notes=ef.notes,
        net_waste_kg=round(total_waste, 2),
        waste_percentage=waste_pct,
        waste_cost=cost,
        waste_records=waste_records_resp,
    )

@router.get("", response_model=List[EventFoodResponse])
def get_event_foods(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id, Event.hotel_id == current_user.hotel_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    foods = (
        db.query(EventFood)
        .filter(EventFood.event_id == event_id)
        .options(
            joinedload(EventFood.food_item),
            joinedload(EventFood.waste_records).joinedload(WasteRecord.recorder)
        )
        .all()
    )
    return [build_event_food_response(ef) for ef in foods]

@router.post("", response_model=EventFoodResponse, status_code=status.HTTP_201_CREATED)
def add_event_food(
    event_id: int,
    payload: AddEventFoodPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id, Event.hotel_id == current_user.hotel_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    food_item_id = payload.food_item_id
    if not food_item_id:
        if not payload.name:
            raise HTTPException(status_code=400, detail="Food item ID or food name is required.")
        # Create or find existing food item in hotel catalog
        existing_fi = db.query(FoodItem).filter(
            FoodItem.hotel_id == current_user.hotel_id,
            FoodItem.name.ilike(payload.name.strip())
        ).first()
        if existing_fi:
            food_item_id = existing_fi.id
        else:
            new_fi = FoodItem(
                hotel_id=current_user.hotel_id,
                name=payload.name.strip(),
                category=payload.category.strip() if payload.category else "Main Course",
                default_unit="kg",
                default_cost_per_kg=payload.estimated_cost_per_kg
            )
            db.add(new_fi)
            db.flush()
            food_item_id = new_fi.id

    ef = EventFood(
        event_id=event_id,
        food_item_id=food_item_id,
        prepared_weight_kg=payload.prepared_weight_kg,
        estimated_cost_per_kg=payload.estimated_cost_per_kg,
        notes=payload.notes.strip() if payload.notes else None
    )
    db.add(ef)
    db.commit()
    db.refresh(ef)
    
    # Reload with relationships
    ef = (
        db.query(EventFood)
        .filter(EventFood.id == ef.id)
        .options(
            joinedload(EventFood.food_item),
            joinedload(EventFood.waste_records)
        )
        .first()
    )
    return build_event_food_response(ef)

@router.put("/{event_food_id}", response_model=EventFoodResponse)
def update_event_food(
    event_id: int,
    event_food_id: int,
    payload: EventFoodUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id, Event.hotel_id == current_user.hotel_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    ef = db.query(EventFood).filter(EventFood.id == event_food_id, EventFood.event_id == event_id).first()
    if not ef:
        raise HTTPException(status_code=404, detail="Event food item not found")

    if payload.prepared_weight_kg is not None:
        ef.prepared_weight_kg = payload.prepared_weight_kg
    if payload.estimated_cost_per_kg is not None:
        ef.estimated_cost_per_kg = payload.estimated_cost_per_kg
    if payload.notes is not None:
        ef.notes = payload.notes.strip() if payload.notes else None

    db.commit()
    db.refresh(ef)
    return build_event_food_response(ef)

@router.delete("/{event_food_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event_food(
    event_id: int,
    event_food_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id, Event.hotel_id == current_user.hotel_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    ef = db.query(EventFood).filter(EventFood.id == event_food_id, EventFood.event_id == event_id).first()
    if not ef:
        raise HTTPException(status_code=404, detail="Event food item not found")

    db.delete(ef)
    db.commit()
    return None
