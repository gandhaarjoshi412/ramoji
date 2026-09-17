from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date

from app.database import get_db
from app.models.user import User
from app.models.event import Event
from app.models.event_food import EventFood
from app.models.waste_record import WasteRecord
from app.schemas.event import (
    EventCreate,
    EventUpdate,
    EventListItemResponse,
    EventDetailResponse,
)
from app.schemas.event_food import EventFoodResponse
from app.schemas.waste_record import WasteRecordResponse
from app.services.calculation import (
    calculate_event_summary,
    calculate_waste_percentage,
    calculate_waste_cost,
    calculate_waste_per_guest,
)
from app.services.event_sync import sync_event_scans_to_event_foods
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/events", tags=["Events"])

def build_event_list_item(event: Event) -> EventListItemResponse:
    # Scale records waste
    scale_waste_kg = sum(
        float(w.net_weight_kg)
        for ef in getattr(event, "event_foods", [])
        for w in getattr(ef, "waste_records", [])
    )
    scale_waste_cost = sum(
        float(w.net_weight_kg) * float(ef.estimated_cost_per_kg or 0.0)
        for ef in getattr(event, "event_foods", [])
        for w in getattr(ef, "waste_records", [])
    )
    # Camera AI waste scans
    scan_waste_kg = sum(s.final_weight_grams / 1000.0 for s in getattr(event, "waste_scans", []))
    scan_waste_cost = sum(s.final_waste_cost for s in getattr(event, "waste_scans", []))

    if scan_waste_kg > 0 and scale_waste_kg == 0:
        total_waste_kg = round(scan_waste_kg, 2)
        total_waste_cost = round(scan_waste_cost, 2)
    elif scale_waste_kg > 0 and scan_waste_kg == 0:
        total_waste_kg = round(scale_waste_kg, 2)
        total_waste_cost = round(scale_waste_cost, 2)
    else:
        total_waste_kg = round(scan_waste_kg + scale_waste_kg, 2)
        total_waste_cost = round(scan_waste_cost + scale_waste_cost, 2)

    total_prepared_kg = round(sum(float(ef.prepared_weight_kg or 0.0) for ef in getattr(event, "event_foods", [])), 2)
    waste_percentage = calculate_waste_percentage(total_waste_kg, total_prepared_kg)
    waste_per_guest_kg = calculate_waste_per_guest(total_waste_kg, event.actual_guests)
    waste_per_guest_grams = round(waste_per_guest_kg * 1000.0, 1)

    return EventListItemResponse(
        id=event.id,
        hotel_id=event.hotel_id,
        name=event.name,
        event_type=event.event_type,
        venue=event.venue,
        event_date=event.event_date,
        expected_guests=event.expected_guests,
        actual_guests=event.actual_guests,
        status=event.status,
        notes=event.notes,
        created_at=event.created_at,
        updated_at=event.updated_at,
        total_prepared_kg=total_prepared_kg,
        total_waste_kg=total_waste_kg,
        waste_percentage=waste_percentage,
        total_waste_cost=total_waste_cost,
        waste_per_guest_kg=waste_per_guest_kg,
        waste_per_guest_grams=waste_per_guest_grams,
        food_items_count=len(getattr(event, "event_foods", [])),
    )

def build_event_detail(event: Event) -> EventDetailResponse:
    event_foods_response: List[EventFoodResponse] = []
    for ef in event.event_foods:
        food_item = ef.food_item
        prep = float(ef.prepared_weight_kg or 0.0)
        cost_kg = float(ef.estimated_cost_per_kg or 0.0)

        # Scale waste records
        scale_waste = sum(float(w.net_weight_kg) for w in ef.waste_records)
        scale_cost = sum(float(w.net_weight_kg) * cost_kg for w in ef.waste_records)

        # Camera AI waste scans
        scans_for_item = [s for s in getattr(event, "waste_scans", []) if s.food_item_id == ef.food_item_id]
        scan_waste = sum(s.final_weight_grams / 1000.0 for s in scans_for_item)
        scan_cost = sum(s.final_waste_cost for s in scans_for_item)

        if scan_waste > 0 and scale_waste == 0:
            total_item_waste = scan_waste
            item_cost = scan_cost
        elif scale_waste > 0 and scan_waste == 0:
            total_item_waste = scale_waste
            item_cost = scale_cost
        else:
            total_item_waste = scan_waste + scale_waste
            item_cost = scan_cost + scale_cost

        waste_pct = calculate_waste_percentage(total_item_waste, prep)

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

        event_foods_response.append(
            EventFoodResponse(
                id=ef.id,
                event_id=ef.event_id,
                food_item_id=ef.food_item_id,
                food_item_name=food_item.name if food_item else "Unknown Food",
                food_item_category=food_item.category if food_item else "Other",
                food_item_unit=food_item.default_unit if food_item else "kg",
                prepared_weight_kg=prep,
                estimated_cost_per_kg=cost_kg,
                notes=ef.notes,
                net_waste_kg=round(total_item_waste, 2),
                waste_percentage=waste_pct,
                waste_cost=round(item_cost, 2),
                waste_records=waste_records_resp,
            )
        )

    total_prepared_kg = round(sum(float(ef.prepared_weight_kg or 0.0) for ef in event.event_foods), 2)
    total_waste_kg = round(sum(ef_r.net_waste_kg for ef_r in event_foods_response), 2)
    total_waste_cost = round(sum(ef_r.waste_cost for ef_r in event_foods_response), 2)
    overall_waste_percentage = calculate_waste_percentage(total_waste_kg, total_prepared_kg)
    waste_per_guest_kg = calculate_waste_per_guest(total_waste_kg, event.actual_guests)
    waste_per_guest_grams = round(waste_per_guest_kg * 1000.0, 1)

    return EventDetailResponse(
        id=event.id,
        hotel_id=event.hotel_id,
        name=event.name,
        event_type=event.event_type,
        venue=event.venue,
        event_date=event.event_date,
        expected_guests=event.expected_guests,
        actual_guests=event.actual_guests,
        status=event.status,
        notes=event.notes,
        created_at=event.created_at,
        updated_at=event.updated_at,
        total_prepared_kg=total_prepared_kg,
        total_waste_kg=total_waste_kg,
        waste_percentage=overall_waste_percentage,
        total_waste_cost=total_waste_cost,
        waste_per_guest_kg=waste_per_guest_kg,
        waste_per_guest_grams=waste_per_guest_grams,
        food_items_count=len(event_foods_response),
        event_foods=event_foods_response,
    )

@router.get("", response_model=List[EventListItemResponse])
def get_events(
    status: Optional[str] = None,
    event_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        db.query(Event)
        .filter(Event.hotel_id == current_user.hotel_id)
        .options(
            joinedload(Event.event_foods)
            .joinedload(EventFood.waste_records),
            joinedload(Event.waste_scans),
        )
    )

    if status and status != "all":
        query = query.filter(Event.status == status)
    if event_type and event_type != "all":
        query = query.filter(Event.event_type == event_type)
    if date_from:
        query = query.filter(Event.event_date >= date_from)
    if date_to:
        query = query.filter(Event.event_date <= date_to)
    if search:
        query = query.filter(Event.name.ilike(f"%{search.strip()}%"))

    events = query.order_by(Event.event_date.desc(), Event.id.desc()).all()
    # Auto-sync any events that have scans but no event_foods
    synced_any = False
    for e in events:
        if e.waste_scans and not e.event_foods:
            sync_event_scans_to_event_foods(db, e.id)
            synced_any = True
    if synced_any:
        events = query.order_by(Event.event_date.desc(), Event.id.desc()).all()

    return [build_event_list_item(e) for e in events]

@router.post("", response_model=EventDetailResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=400, detail="Event name is required.")

    new_event = Event(
        hotel_id=current_user.hotel_id,
        name=payload.name.strip(),
        event_type=payload.event_type,
        venue=payload.venue.strip() if payload.venue else None,
        event_date=payload.event_date,
        expected_guests=payload.expected_guests,
        actual_guests=payload.actual_guests,
        status=payload.status,
        notes=payload.notes.strip() if payload.notes else None,
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return build_event_detail(new_event)

@router.get("/{event_id}", response_model=EventDetailResponse)
def get_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Auto-sync any camera waste scans to banquet event menu items and yield metrics
    sync_event_scans_to_event_foods(db, event_id)

    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.hotel_id == current_user.hotel_id)
        .options(
            joinedload(Event.event_foods)
            .joinedload(EventFood.food_item),
            joinedload(Event.event_foods)
            .joinedload(EventFood.waste_records)
            .joinedload(WasteRecord.recorder),
            joinedload(Event.waste_scans),
        )
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return build_event_detail(event)

@router.put("/{event_id}", response_model=EventDetailResponse)
def update_event(
    event_id: int,
    payload: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id, Event.hotel_id == current_user.hotel_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if payload.name is not None:
        event.name = payload.name.strip()
    if payload.event_type is not None:
        event.event_type = payload.event_type
    if payload.venue is not None:
        event.venue = payload.venue.strip() if payload.venue else None
    if payload.event_date is not None:
        event.event_date = payload.event_date
    if payload.expected_guests is not None:
        event.expected_guests = payload.expected_guests
    if payload.actual_guests is not None:
        event.actual_guests = payload.actual_guests
    if payload.status is not None:
        event.status = payload.status
    if payload.notes is not None:
        event.notes = payload.notes.strip() if payload.notes else None

    db.commit()
    db.refresh(event)
    return build_event_detail(event)

@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id, Event.hotel_id == current_user.hotel_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    db.delete(event)
    db.commit()
    return None
