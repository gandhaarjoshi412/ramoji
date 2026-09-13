from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.event import Event
from app.models.event_food import EventFood
from app.models.waste_record import WasteRecord
from app.schemas.waste_record import WasteRecordCreate, WasteRecordUpdate, WasteRecordResponse
from app.services.calculation import calculate_net_weight, CalculationError
from app.services.scale import ManualScaleProvider
from app.utils.security import get_current_user

router = APIRouter(tags=["Waste Records"])

def build_waste_response(w: WasteRecord) -> WasteRecordResponse:
    return WasteRecordResponse(
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

@router.get("/api/events/{event_id}/waste", response_model=List[WasteRecordResponse])
def get_event_waste_records(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id, Event.hotel_id == current_user.hotel_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    records = (
        db.query(WasteRecord)
        .join(EventFood, WasteRecord.event_food_id == EventFood.id)
        .filter(EventFood.event_id == event_id)
        .options(joinedload(WasteRecord.recorder))
        .order_by(WasteRecord.recorded_at.desc())
        .all()
    )
    return [build_waste_response(r) for r in records]

@router.post("/api/events/{event_id}/waste", response_model=WasteRecordResponse, status_code=status.HTTP_201_CREATED)
def record_event_waste(
    event_id: int,
    payload: WasteRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id, Event.hotel_id == current_user.hotel_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    ef = db.query(EventFood).filter(
        EventFood.id == payload.event_food_id,
        EventFood.event_id == event_id
    ).first()
    if not ef:
        raise HTTPException(status_code=404, detail="Event food item not found")

    # Validate and calculate net weight server-side
    try:
        net_weight = calculate_net_weight(payload.gross_weight_kg, payload.container_weight_kg)
    except CalculationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Weight source provider handling
    weight_source = payload.weight_source or "Manual"
    if weight_source == "Manual":
        scale = ManualScaleProvider(manual_weight=payload.gross_weight_kg)
        reading = scale.get_weight()
        recorded_scale_weight = reading.weight_kg
    else:
        recorded_scale_weight = payload.scale_weight

    record = WasteRecord(
        event_food_id=ef.id,
        gross_weight_kg=round(payload.gross_weight_kg, 3),
        container_weight_kg=round(payload.container_weight_kg, 3),
        net_weight_kg=net_weight,
        waste_reason=payload.waste_reason.strip(),
        notes=payload.notes.strip() if payload.notes else None,
        recorded_by=current_user.id,
        recorded_at=datetime.utcnow(),
        weight_source=weight_source,
        image_url=payload.image_url,
        video_url=payload.video_url,
        ai_food_prediction=payload.ai_food_prediction,
        ai_confidence=payload.ai_confidence,
        scale_weight=recorded_scale_weight,
        camera_device_id=payload.camera_device_id,
    )
    db.add(record)
    
    # If event status is Upcoming, update to Active/Completed based on recording
    if event.status == "Upcoming":
        event.status = "Active"

    db.commit()
    db.refresh(record)
    record.recorder = current_user
    return build_waste_response(record)

@router.put("/api/waste/{waste_id}", response_model=WasteRecordResponse)
def update_waste_record(
    waste_id: int,
    payload: WasteRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = (
        db.query(WasteRecord)
        .join(EventFood, WasteRecord.event_food_id == EventFood.id)
        .join(Event, EventFood.event_id == Event.id)
        .filter(WasteRecord.id == waste_id, Event.hotel_id == current_user.hotel_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Waste record not found")

    new_gross = payload.gross_weight_kg if payload.gross_weight_kg is not None else record.gross_weight_kg
    new_tare = payload.container_weight_kg if payload.container_weight_kg is not None else record.container_weight_kg

    try:
        new_net = calculate_net_weight(new_gross, new_tare)
    except CalculationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    record.gross_weight_kg = round(new_gross, 3)
    record.container_weight_kg = round(new_tare, 3)
    record.net_weight_kg = new_net

    if payload.waste_reason is not None:
        record.waste_reason = payload.waste_reason.strip()
    if payload.notes is not None:
        record.notes = payload.notes.strip() if payload.notes else None
    if payload.weight_source is not None:
        record.weight_source = payload.weight_source

    db.commit()
    db.refresh(record)
    return build_waste_response(record)

@router.delete("/api/waste/{waste_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_waste_record(
    waste_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = (
        db.query(WasteRecord)
        .join(EventFood, WasteRecord.event_food_id == EventFood.id)
        .join(Event, EventFood.event_id == Event.id)
        .filter(WasteRecord.id == waste_id, Event.hotel_id == current_user.hotel_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Waste record not found")

    db.delete(record)
    db.commit()
    return None
