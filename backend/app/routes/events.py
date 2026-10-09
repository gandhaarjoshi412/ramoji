from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import date

from app.database import get_db
from app.models.user import User
from app.models.event import Event
from app.models.event_category import EventCategory
from app.models.event_food import EventFood
from app.models.waste_record import WasteRecord
from app.models.waste_scan import WasteScan
from app.models.analytics_record import AnalyticsRecord
from app.schemas.event import (
    EventCreate,
    EventUpdate,
    EventListItemResponse,
    EventDetailResponse,
    EventCategoryCreate,
    EventCategoryResponse,
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

BUILTIN_CATEGORIES = [
    {"name": "Corporate", "code": "corporate", "description": "Corporate events, seminars, and business luncheons"},
    {"name": "Conference", "code": "conference", "description": "Large conferences, trade shows, conventions, and symposiums"},
    {"name": "Social", "code": "social", "description": "Social gatherings, private celebrations, anniversaries, and parties"},
    {"name": "Wedding", "code": "wedding", "description": "Weddings, receptions, sangeet, and marriage banquets"},
]

def ensure_default_categories(db: Session):
    for cat_data in BUILTIN_CATEGORIES:
        exists = db.query(EventCategory).filter(func.lower(EventCategory.name) == cat_data["name"].lower()).first()
        if not exists:
            db.add(EventCategory(
                name=cat_data["name"],
                code=cat_data["code"],
                description=cat_data["description"],
                is_builtin=True,
                hotel_id=None
            ))
        else:
            exists.is_builtin = True
            
    # Demote Birthday and Regular Hotel Service from builtin status so they don't appear in default options
    # while strictly preserving all historical records and references
    legacy_cats = db.query(EventCategory).filter(
        func.lower(EventCategory.name).in_(["birthday", "regular hotel service", "other"])
    ).all()
    for lc in legacy_cats:
        lc.is_builtin = False
        
    db.commit()

def build_event_list_item(event: Event, db: Optional[Session] = None) -> EventListItemResponse:
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
    total_leftover_kg = total_waste_kg
    total_reuse_kg = 0.0
    total_consumed_kg = max(0.0, round(total_prepared_kg - total_leftover_kg, 2))
    food_items_count = len(getattr(event, "event_foods", []))

    if food_items_count == 0 and db is not None:
        ar_list = db.query(AnalyticsRecord).filter(
            AnalyticsRecord.event_id == event.id,
            AnalyticsRecord.is_archived == False
        ).all()
        if ar_list:
            total_prepared_kg = round(sum(float(r.actual_production_kg or 0.0) for r in ar_list), 2)
            total_consumed_kg = round(sum(float(r.actual_consumption_kg or 0.0) for r in ar_list), 2)
            total_leftover_kg = round(sum(float(r.total_leftover_kg or 0.0) for r in ar_list), 2)
            total_reuse_kg = round(sum(float(r.reuse_quantity_kg or 0.0) for r in ar_list), 2)
            total_waste_kg = round(sum(float(r.total_waste_kg or 0.0) for r in ar_list), 2)
            total_waste_cost = round(sum(float(r.waste_cost or 0.0) for r in ar_list), 2)
            food_items_count = len(ar_list)

    waste_percentage = calculate_waste_percentage(total_waste_kg, total_prepared_kg)
    guest_count = event.actual_guests if event.actual_guests > 0 else event.expected_guests
    waste_per_guest_kg = calculate_waste_per_guest(total_waste_kg, guest_count)
    waste_per_guest_grams = round(waste_per_guest_kg * 1000.0, 1)
    hotel_name = event.hotel.name if (hasattr(event, "hotel") and event.hotel) else "Hotel"

    completeness = 100.0
    if guest_count <= 0: completeness -= 25.0
    if total_prepared_kg <= 0: completeness -= 25.0
    if food_items_count <= 0: completeness -= 25.0

    return EventListItemResponse(
        id=event.id,
        hotel_id=event.hotel_id,
        hotel_name=hotel_name,
        name=event.name,
        event_type=event.event_type,
        event_subtype=getattr(event, "event_subtype", None),
        client_name=getattr(event, "client_name", None),
        venue=event.venue,
        service_format=getattr(event, "service_format", "Buffet"),
        event_date=event.event_date,
        expected_guests=event.expected_guests,
        actual_guests=event.actual_guests,
        status=event.status,
        is_archived=getattr(event, "is_archived", False),
        notes=event.notes,
        created_at=event.created_at,
        updated_at=event.updated_at,
        total_prepared_kg=total_prepared_kg,
        total_consumed_kg=total_consumed_kg,
        total_leftover_kg=total_leftover_kg,
        total_reuse_kg=total_reuse_kg,
        total_waste_kg=total_waste_kg,
        waste_percentage=waste_percentage,
        total_waste_cost=total_waste_cost,
        waste_per_guest_kg=waste_per_guest_kg,
        waste_per_guest_grams=waste_per_guest_grams,
        food_items_count=food_items_count,
        data_completeness_pct=max(0.0, round(completeness, 1)),
    )

def build_event_detail(event: Event, db: Optional[Session] = None) -> EventDetailResponse:
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

    if len(event_foods_response) == 0 and db is not None:
        from app.models.analytics_record import AnalyticsRecord
        ar_list = db.query(AnalyticsRecord).filter(
            AnalyticsRecord.event_id == event.id,
            AnalyticsRecord.is_archived == False
        ).all()
        for idx, r in enumerate(ar_list):
            prep = float(r.actual_production_kg or 0.0)
            waste = float(r.total_waste_kg or 0.0)
            cost = float(r.waste_cost or 0.0)
            cost_per_kg = float(r.item_cost or (cost / waste if waste > 0 else 0.0))
            waste_pct = calculate_waste_percentage(waste, prep)
            event_foods_response.append(
                EventFoodResponse(
                    id=idx + 1,
                    event_id=event.id,
                    food_item_id=idx + 1,
                    food_item_name=r.dish_name or "Unknown Dish",
                    food_item_category=r.dish_category or "Main Course",
                    food_item_unit=r.uom or "kg",
                    prepared_weight_kg=prep,
                    estimated_cost_per_kg=round(cost_per_kg, 2),
                    notes=f"Session: {r.session or 'Service'} • Consumed: {r.actual_consumption_kg or 0} kg • Reused: {r.reuse_quantity_kg or 0} kg",
                    net_waste_kg=round(waste, 2),
                    waste_percentage=waste_pct,
                    waste_cost=round(cost, 2),
                    waste_records=[],
                )
            )
        if ar_list:
            total_prepared_kg = round(sum(float(r.actual_production_kg or 0.0) for r in ar_list), 2)
            total_waste_kg = round(sum(float(r.total_waste_kg or 0.0) for r in ar_list), 2)
            total_waste_cost = round(sum(float(r.waste_cost or 0.0) for r in ar_list), 2)

    overall_waste_percentage = calculate_waste_percentage(total_waste_kg, total_prepared_kg)
    guest_count = event.actual_guests if event.actual_guests > 0 else event.expected_guests
    waste_per_guest_kg = calculate_waste_per_guest(total_waste_kg, guest_count)
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

@router.get("/categories", response_model=List[EventCategoryResponse])
def get_event_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ensure_default_categories(db)
    query = db.query(EventCategory).filter(
        (EventCategory.is_builtin == True) |
        (EventCategory.hotel_id == current_user.hotel_id) |
        (EventCategory.hotel_id.is_(None))
    )
    return query.order_by(EventCategory.is_builtin.desc(), EventCategory.name.asc()).all()

@router.post("/categories", response_model=EventCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_event_category(
    payload: EventCategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cat_name = payload.name.strip()
    if not cat_name:
        raise HTTPException(status_code=400, detail="Category name cannot be empty.")

    # Check duplicate
    existing = db.query(EventCategory).filter(
        func.lower(EventCategory.name) == cat_name.lower(),
        (EventCategory.hotel_id == current_user.hotel_id) | (EventCategory.hotel_id.is_(None))
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Category '{cat_name}' already exists.")

    new_cat = EventCategory(
        name=cat_name,
        code=payload.code.strip() if payload.code else cat_name.lower().replace(" ", "_"),
        description=payload.description.strip() if payload.description else None,
        is_builtin=False,
        hotel_id=current_user.hotel_id,
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat

@router.delete("/categories/{id}", status_code=status.HTTP_200_OK)
def delete_event_category(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cat = db.query(EventCategory).filter(EventCategory.id == id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")
    if cat.is_builtin:
        raise HTTPException(status_code=400, detail="Built-in categories cannot be deleted.")
    if current_user.role != "admin" and cat.hotel_id != current_user.hotel_id:
        raise HTTPException(status_code=403, detail="Permission denied.")

    db.delete(cat)
    db.commit()
    return {"status": "success", "message": f"Category '{cat.name}' deleted."}

@router.get("", response_model=List[EventListItemResponse])
def get_events(
    status: Optional[str] = None,
    event_type: Optional[str] = None,
    hotel_id: Optional[int] = None,
    hotel: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = None,
    include_archived: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        db.query(Event)
        .options(
            joinedload(Event.hotel),
            joinedload(Event.event_foods)
            .joinedload(EventFood.waste_records),
            joinedload(Event.waste_scans),
        )
    )

    if not include_archived:
        query = query.filter(Event.is_archived == False)

    if hotel_id and hotel_id > 0:
        query = query.filter(Event.hotel_id == hotel_id)
    elif hotel and hotel != "all":
        from app.models.hotel import Hotel
        h_match = db.query(Hotel).filter(Hotel.name == hotel).first()
        if h_match:
            query = query.filter(Event.hotel_id == h_match.id)
    elif current_user.role != "admin":
        query = query.filter(Event.hotel_id == current_user.hotel_id)

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

    return [build_event_list_item(e, db=db) for e in events]

@router.post("", response_model=EventDetailResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=400, detail="Event name is required.")

    target_hotel_id = payload.hotel_id if (payload.hotel_id and current_user.role == "admin") else current_user.hotel_id
    from app.models.hotel import Hotel
    hotel_obj = db.query(Hotel).filter(Hotel.id == target_hotel_id).first()
    hotel_name = hotel_obj.name if hotel_obj else "Dolphin Hotels"

    new_event = Event(
        hotel_id=target_hotel_id,
        name=payload.name.strip(),
        event_type=payload.event_type,
        event_subtype=payload.event_subtype,
        client_name=payload.client_name.strip() if payload.client_name else None,
        venue=payload.venue.strip() if payload.venue else None,
        service_format=payload.service_format or "Buffet",
        event_date=payload.event_date,
        expected_guests=payload.expected_guests,
        actual_guests=payload.actual_guests,
        status=payload.status,
        is_archived=False,
        notes=payload.notes.strip() if payload.notes else None,
    )
    db.add(new_event)
    db.flush()

    # Process initial dishes if provided
    if payload.dishes:
        from app.models.food_item import FoodItem
        from app.models.event_food import EventFood
        from app.models.analytics_record import AnalyticsRecord

        pax = new_event.actual_guests or new_event.expected_guests or 50
        sess_name = (payload.sessions[0] if payload.sessions else "Dinner")

        for d in payload.dishes:
            d_name = d.get("name") or d.get("dish_name") or "Dish"
            d_cat = d.get("category") or "Main Course"
            prep_kg = float(d.get("prepared_kg") or d.get("actual_production_kg") or 10.0)
            cost_kg = float(d.get("cost_per_kg") or d.get("item_cost") or 120.0)
            waste_kg = float(d.get("waste_kg") or d.get("total_waste_kg") or 0.0)
            reuse_kg = float(d.get("reuse_kg") or d.get("reuse_quantity_kg") or 0.0)
            leftover_kg = float(d.get("leftover_kg") or d.get("total_leftover_kg") or (waste_kg + reuse_kg))
            cons_kg = max(0.0, round(prep_kg - leftover_kg, 2))
            waste_cost = round(waste_kg * cost_kg, 2)

            food = db.query(FoodItem).filter(
                FoodItem.hotel_id == target_hotel_id,
                func.lower(FoodItem.name) == d_name.lower()
            ).first()
            if not food:
                food = FoodItem(
                    hotel_id=target_hotel_id,
                    name=d_name,
                    category=d_cat,
                    default_unit="kg",
                    default_cost_per_kg=cost_kg,
                )
                db.add(food)
                db.flush()

            ef = EventFood(
                event_id=new_event.id,
                food_item_id=food.id,
                prepared_weight_kg=prep_kg,
                estimated_cost_per_kg=cost_kg,
                notes=f"Manually created with event {new_event.name}",
            )
            db.add(ef)

            # Mirror to AnalyticsRecord
            ar = AnalyticsRecord(
                hotel_id=target_hotel_id,
                hotel_name=hotel_name,
                event_id=new_event.id,
                event_name=new_event.name,
                event_type=new_event.event_type,
                event_subtype=new_event.event_subtype or new_event.event_type,
                client_name=new_event.client_name,
                service_type=new_event.service_format or "Buffet",
                session=sess_name,
                record_date=new_event.event_date,
                pax=pax,
                dish_name=d_name,
                dish_category=d_cat,
                food_type="Veg" if "veg" in d_name.lower() or "paneer" in d_name.lower() else "Non-Veg",
                uom="Kg",
                item_cost=cost_kg,
                actual_production_kg=prep_kg,
                actual_consumption_kg=cons_kg,
                total_leftover_kg=leftover_kg,
                location_buffet_return_kg=leftover_kg,
                reuse_quantity_kg=reuse_kg,
                total_waste_kg=waste_kg,
                other_disposition_kg=0.0,
                reconciliation_variance_kg=round(leftover_kg - (reuse_kg + waste_kg), 2),
                waste_cost=waste_cost,
                waste_percentage=round(waste_kg / prep_kg * 100.0, 2) if prep_kg > 0 else 0.0,
                waste_per_head_grams=round(waste_kg / pax * 1000.0, 1) if pax > 0 else 0.0,
                data_source="Manual Entry",
                is_verified=True,
                is_archived=False,
            )
            db.add(ar)

    db.commit()
    db.refresh(new_event)
    return build_event_detail(new_event, db=db)

@router.get("/{event_id}", response_model=EventDetailResponse)
def get_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sync_event_scans_to_event_foods(db, event_id, create_missing=False)

    event_query = db.query(Event).filter(Event.id == event_id)
    if current_user.role != "admin":
        event_query = event_query.filter(Event.hotel_id == current_user.hotel_id)

    event = (
        event_query.options(
            joinedload(Event.hotel),
            joinedload(Event.event_foods)
            .joinedload(EventFood.food_item),
            joinedload(Event.event_foods)
            .joinedload(EventFood.waste_records)
            .joinedload(WasteRecord.recorder),
            joinedload(Event.waste_scans),
        )
        .first()
    )
    if not event or getattr(event, "is_archived", False):
        raise HTTPException(status_code=404, detail="Event not found")
    return build_event_detail(event, db=db)

@router.put("/{event_id}", response_model=EventDetailResponse)
def update_event(
    event_id: int,
    payload: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event_query = db.query(Event).filter(Event.id == event_id)
    if current_user.role != "admin":
        event_query = event_query.filter(Event.hotel_id == current_user.hotel_id)
    event = event_query.first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if payload.name is not None:
        event.name = payload.name.strip()
    if payload.event_type is not None:
        event.event_type = payload.event_type
    if payload.event_subtype is not None:
        event.event_subtype = payload.event_subtype
    if payload.client_name is not None:
        event.client_name = payload.client_name.strip() if payload.client_name else None
    if payload.venue is not None:
        event.venue = payload.venue.strip() if payload.venue else None
    if payload.service_format is not None:
        event.service_format = payload.service_format
    if payload.event_date is not None:
        event.event_date = payload.event_date
    if payload.expected_guests is not None:
        event.expected_guests = payload.expected_guests
    if payload.actual_guests is not None:
        event.actual_guests = payload.actual_guests
    if payload.status is not None:
        event.status = payload.status
    if payload.is_archived is not None:
        event.is_archived = payload.is_archived
    if payload.notes is not None:
        event.notes = payload.notes.strip() if payload.notes else None
    if payload.hotel_id is not None and current_user.role == "admin":
        event.hotel_id = payload.hotel_id

    # Sync updates to linked AnalyticsRecords
    ar_updates = {
        "event_name": event.name,
        "event_type": event.event_type,
        "event_subtype": event.event_subtype or event.event_type,
        "client_name": event.client_name,
        "service_type": event.service_format or "Buffet",
        "record_date": event.event_date,
        "pax": event.actual_guests or event.expected_guests or 50,
        "is_archived": event.is_archived,
    }
    if event.hotel_id:
        from app.models.hotel import Hotel
        h_obj = db.query(Hotel).filter(Hotel.id == event.hotel_id).first()
        if h_obj:
            ar_updates["hotel_id"] = h_obj.id
            ar_updates["hotel_name"] = h_obj.name

    db.query(AnalyticsRecord).filter(AnalyticsRecord.event_id == event_id).update(ar_updates)

    db.commit()
    db.refresh(event)
    return build_event_detail(event, db=db)

@router.get("/{event_id}/delete-impact")
def get_event_delete_impact(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    from app.models.hotel import Hotel
    from app.models.analytics_record import AnalyticsRecord

    foods_count = db.query(EventFood).filter(EventFood.event_id == event_id).count()
    scans_count = db.query(WasteScan).filter(WasteScan.event_id == event_id).count()
    analytics_count = db.query(AnalyticsRecord).filter(AnalyticsRecord.event_id == event_id).count()

    hotel = db.query(Hotel).filter(Hotel.id == event.hotel_id).first()
    hotel_name = hotel.name if hotel else "Hotel"

    return {
        "event_id": event.id,
        "event_name": event.name,
        "hotel_id": event.hotel_id,
        "hotel_name": hotel_name,
        "event_date": str(event.event_date),
        "event_type": event.event_type,
        "food_items_count": foods_count,
        "waste_scans_count": scans_count,
        "analytics_records_count": analytics_count,
        "is_archived": getattr(event, "is_archived", False),
        "message": f"Archiving '{event.name}' will safely remove {analytics_count} records and {scans_count} scans from active analytics dashboards while preserving full audit history."
    }

@router.post("/{event_id}/restore")
def restore_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    from app.models.analytics_record import AnalyticsRecord
    event.is_archived = False
    db.query(AnalyticsRecord).filter(AnalyticsRecord.event_id == event_id).update({"is_archived": False})
    db.commit()
    return {"status": "success", "message": f"Event '{event.name}' successfully restored.", "is_archived": False}

@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    hard_delete: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event_query = db.query(Event).filter(Event.id == event_id)
    if current_user.role != "admin":
        event_query = event_query.filter(Event.hotel_id == current_user.hotel_id)
    event = event_query.first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    from app.models.analytics_record import AnalyticsRecord

    if hard_delete and current_user.role == "admin":
        db.query(AnalyticsRecord).filter(AnalyticsRecord.event_id == event_id).delete()
        db.query(WasteScan).filter(WasteScan.event_id == event_id).delete()
        db.delete(event)
        db.commit()
    else:
        # Safe soft delete / archival by default
        event.is_archived = True
        db.query(AnalyticsRecord).filter(AnalyticsRecord.event_id == event_id).update({"is_archived": True})
        db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)

