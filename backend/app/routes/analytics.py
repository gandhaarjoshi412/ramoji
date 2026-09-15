from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict

from app.database import get_db
from app.models.user import User
from app.models.event import Event
from app.models.event_food import EventFood
from app.models.waste_scan import WasteScan
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    TopWasteFoodItem,
    WasteByEventItem,
    WasteTrendPoint,
)
from app.schemas.analytics import EventAnalyticsResponse, EventFoodWasteSummary
from app.routes.scan import build_scan_response
from app.utils.security import get_current_user

router = APIRouter(tags=["Analytics & Dashboard"])

@router.get("/api/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    events = (
        db.query(Event)
        .filter(Event.hotel_id == current_user.hotel_id)
        .options(joinedload(Event.waste_scans))
        .order_by(Event.event_date.asc())
        .all()
    )

    total_events = len(events)
    completed_events = sum(1 for e in events if e.status == "Completed")
    active_events = sum(1 for e in events if e.status == "Active")
    upcoming_events = sum(1 for e in events if e.status == "Upcoming")
    total_guests_served = sum(e.actual_guests for e in events if e.actual_guests)

    all_event_foods = (
        db.query(EventFood)
        .join(Event, EventFood.event_id == Event.id)
        .filter(Event.hotel_id == current_user.hotel_id)
        .all()
    )
    total_food_prepared_kg = round(sum(float(ef.prepared_weight_kg or 0.0) for ef in all_event_foods), 2)

    all_scans = (
        db.query(WasteScan)
        .join(Event, WasteScan.event_id == Event.id)
        .filter(Event.hotel_id == current_user.hotel_id)
        .all()
    )

    total_scans = len(all_scans)
    total_waste_g = sum(s.final_weight_grams for s in all_scans)
    total_waste_cost = sum(s.final_waste_cost for s in all_scans)
    total_waste_kg = round(total_waste_g / 1000.0, 2)

    avg_waste_per_guest_grams = (
        round(total_waste_g / total_guests_served, 1) if total_guests_served > 0 else 0.0
    )

    avg_ai_confidence = (
        round(sum(s.ai_confidence for s in all_scans) / total_scans * 100.0, 1)
        if total_scans > 0 else 0.0
    )

    human_corrections_count = sum(1 for s in all_scans if s.human_food_correction or s.human_weight_correction is not None)

    # Food aggregations
    food_map: Dict[str, Dict[str, float]] = {}
    for s in all_scans:
        fname = s.final_food_name
        cat = s.food_item.category if s.food_item else "Main Course"
        if fname not in food_map:
            food_map[fname] = {"category": cat, "waste_g": 0.0, "cost": 0.0, "scans": 0}
        food_map[fname]["waste_g"] += s.final_weight_grams
        food_map[fname]["cost"] += s.final_waste_cost
        food_map[fname]["scans"] += 1

    top_wasted_foods: List[TopWasteFoodItem] = []
    for fname, d in sorted(food_map.items(), key=lambda x: x[1]["waste_g"], reverse=True)[:6]:
        top_wasted_foods.append(
            TopWasteFoodItem(
                food_name=fname,
                category=d["category"],
                total_waste_kg=round(d["waste_g"] / 1000.0, 2),
                total_waste_cost=round(d["cost"], 2),
                scans_count=int(d["scans"]),
            )
        )

    # Event breakdowns and trends
    waste_by_event: List[WasteByEventItem] = []
    waste_trends: List[WasteTrendPoint] = []

    for ev in events:
        ev_scans = ev.waste_scans
        ev_waste_g = sum(s.final_weight_grams for s in ev_scans)
        ev_cost = sum(s.final_waste_cost for s in ev_scans)
        ev_kg = round(ev_waste_g / 1000.0, 2)

        waste_by_event.append(
            WasteByEventItem(
                event_id=ev.id,
                event_name=ev.name,
                event_date=str(ev.event_date),
                event_type=ev.event_type,
                status=ev.status or "Completed",
                actual_guests=ev.actual_guests,
                total_waste_kg=ev_kg,
                total_waste_cost=round(ev_cost, 2),
                scans_count=len(ev_scans),
            )
        )

        if len(ev_scans) > 0:
            waste_trends.append(
                WasteTrendPoint(
                    date=str(ev.event_date),
                    event_name=ev.name,
                    waste_kg=ev_kg,
                    waste_cost=round(ev_cost, 2),
                )
            )

    return DashboardSummaryResponse(
        total_events=total_events,
        completed_events=completed_events,
        active_events=active_events,
        upcoming_events=upcoming_events,
        total_scans=total_scans,
        total_guests_served=total_guests_served,
        total_food_prepared_kg=total_food_prepared_kg,
        total_prepared_kg=total_food_prepared_kg,
        total_estimated_waste_kg=total_waste_kg, total_waste_kg=total_waste_kg,
        total_estimated_waste_cost=round(total_waste_cost, 2), total_waste_cost=round(total_waste_cost, 2),
        average_waste_per_guest_grams=avg_waste_per_guest_grams,
        average_ai_confidence=avg_ai_confidence,
        human_corrections_count=human_corrections_count,
        top_wasted_foods=top_wasted_foods,
        waste_by_event=waste_by_event,
        waste_trends=waste_trends,
    )

@router.get("/api/dashboard/waste-by-food", response_model=List[TopWasteFoodItem])
def get_waste_by_food(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    summary = get_dashboard_summary(current_user=current_user, db=db)
    return summary.top_wasted_foods

@router.get("/api/dashboard/waste-by-event", response_model=List[WasteByEventItem])
def get_waste_by_event(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    summary = get_dashboard_summary(current_user=current_user, db=db)
    return summary.waste_by_event

@router.get("/api/events/{id}/analytics", response_model=EventAnalyticsResponse)
def get_event_analytics(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = (
        db.query(Event)
        .filter(Event.id == id, Event.hotel_id == current_user.hotel_id)
        .options(
            joinedload(Event.waste_scans).joinedload(WasteScan.food_item)
        )
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    scans = event.waste_scans
    total_scans = len(scans)
    total_g = sum(s.final_weight_grams for s in scans)
    total_cost = sum(s.final_waste_cost for s in scans)
    total_kg = round(total_g / 1000.0, 2)

    waste_per_guest = (
        round(total_g / event.actual_guests, 1) if event.actual_guests and event.actual_guests > 0 else 0.0
    )

    avg_conf = (
        round(sum(s.ai_confidence for s in scans) / total_scans * 100.0, 1)
        if total_scans > 0 else 0.0
    )

    corrections_count = sum(1 for s in scans if s.human_food_correction or s.human_weight_correction is not None)

    # Food breakdown for this event
    f_map: Dict[str, Dict[str, float]] = {}
    for s in scans:
        fname = s.final_food_name
        cat = s.food_item.category if s.food_item else "Main Course"
        if fname not in f_map:
            f_map[fname] = {"category": cat, "waste_g": 0.0, "cost": 0.0, "scans": 0}
        f_map[fname]["waste_g"] += s.final_weight_grams
        f_map[fname]["cost"] += s.final_waste_cost
        f_map[fname]["scans"] += 1

    breakdown: List[EventFoodWasteSummary] = []
    for fname, d in sorted(f_map.items(), key=lambda x: x[1]["waste_g"], reverse=True):
        breakdown.append(
            EventFoodWasteSummary(
                food_name=fname,
                category=d["category"],
                total_waste_grams=round(d["waste_g"], 1),
                total_waste_kg=round(d["waste_g"] / 1000.0, 2),
                total_waste_cost=round(d["cost"], 2),
                scans_count=int(d["scans"]),
            )
        )

    return EventAnalyticsResponse(
        event_id=event.id,
        event_name=event.name,
        event_date=str(event.event_date),
        event_type=event.event_type,
        venue=event.venue,
        expected_guests=event.expected_guests,
        actual_guests=event.actual_guests,
        status=event.status,
        total_scans_count=total_scans,
        total_estimated_waste_kg=total_kg,
        total_estimated_waste_grams=round(total_g, 1),
        total_estimated_waste_cost=round(total_cost, 2),
        waste_per_guest_grams=waste_per_guest,
        average_ai_confidence=avg_conf,
        human_corrections_count=corrections_count,
        food_breakdown=breakdown,
        scans=[build_scan_response(s) for s in sorted(scans, key=lambda x: x.created_at, reverse=True)],
    )
