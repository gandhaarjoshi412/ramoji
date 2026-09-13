from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict

from app.database import get_db
from app.models.user import User
from app.models.event import Event
from app.models.event_food import EventFood
from app.models.waste_record import WasteRecord
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    TopWasteFoodItem,
    WasteTrendItem,
    WasteReasonSummary,
)
from app.services.calculation import calculate_event_summary, calculate_waste_percentage, calculate_waste_cost
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    events = (
        db.query(Event)
        .filter(Event.hotel_id == current_user.hotel_id)
        .options(
            joinedload(Event.event_foods).joinedload(EventFood.food_item),
            joinedload(Event.event_foods).joinedload(EventFood.waste_records),
        )
        .order_by(Event.event_date.asc())
        .all()
    )

    total_events = len(events)
    completed_events = sum(1 for e in events if e.status == "Completed")
    upcoming_events = sum(1 for e in events if e.status == "Upcoming")
    active_events = sum(1 for e in events if e.status == "Active")
    total_guests_served = sum(e.actual_guests for e in events if e.actual_guests)

    total_prepared_kg = 0.0
    total_waste_kg = 0.0
    total_waste_cost = 0.0

    # For food-level aggregation
    food_agg: Dict[str, Dict[str, float]] = {}
    # For reasons aggregation
    reasons_agg: Dict[str, Dict[str, float]] = {}
    # For trends
    waste_trends: List[WasteTrendItem] = []

    for event in events:
        ev_summary = calculate_event_summary(event.event_foods, event.actual_guests)
        total_prepared_kg += ev_summary["total_prepared_kg"]
        total_waste_kg += ev_summary["total_waste_kg"]
        total_waste_cost += ev_summary["total_waste_cost"]

        waste_trends.append(
            WasteTrendItem(
                event_id=event.id,
                event_name=event.name,
                event_date=str(event.event_date),
                event_type=event.event_type,
                actual_guests=event.actual_guests,
                prepared_kg=ev_summary["total_prepared_kg"],
                waste_kg=ev_summary["total_waste_kg"],
                waste_percentage=ev_summary["overall_waste_percentage"],
                waste_cost=ev_summary["total_waste_cost"],
            )
        )

        for ef in event.event_foods:
            fname = ef.food_item.name if ef.food_item else "Unknown"
            fcat = ef.food_item.category if ef.food_item else "Other"
            prep = float(ef.prepared_weight_kg or 0.0)
            cost_kg = float(ef.estimated_cost_per_kg or 0.0)
            item_waste = sum(float(w.net_weight_kg) for w in ef.waste_records)

            if fname not in food_agg:
                food_agg[fname] = {
                    "category": fcat,
                    "prepared": 0.0,
                    "waste": 0.0,
                    "cost": 0.0,
                    "events": 0,
                }
            food_agg[fname]["prepared"] += prep
            food_agg[fname]["waste"] += item_waste
            food_agg[fname]["cost"] += item_waste * cost_kg
            food_agg[fname]["events"] += 1

            for w in ef.waste_records:
                reason = w.waste_reason or "Other"
                if reason not in reasons_agg:
                    reasons_agg[reason] = {"waste": 0.0, "count": 0}
                reasons_agg[reason]["waste"] += float(w.net_weight_kg)
                reasons_agg[reason]["count"] += 1

    overall_waste_percentage = (
        round((total_waste_kg / total_prepared_kg) * 100.0, 2)
        if total_prepared_kg > 0
        else 0.0
    )

    avg_waste_per_guest_grams = (
        round((total_waste_kg / total_guests_served) * 1000.0, 1)
        if total_guests_served > 0
        else 0.0
    )

    # Sort top wasted foods by waste weight descending
    top_wasted_foods: List[TopWasteFoodItem] = []
    for fname, data in sorted(food_agg.items(), key=lambda x: x[1]["waste"], reverse=True)[:6]:
        top_wasted_foods.append(
            TopWasteFoodItem(
                food_name=fname,
                category=data["category"],
                total_prepared_kg=round(data["prepared"], 2),
                total_waste_kg=round(data["waste"], 2),
                waste_percentage=calculate_waste_percentage(data["waste"], data["prepared"]),
                total_waste_cost=round(data["cost"], 2),
                events_count=int(data["events"]),
            )
        )

    # Sort waste reasons
    waste_reasons: List[WasteReasonSummary] = []
    for r_name, r_data in sorted(reasons_agg.items(), key=lambda x: x[1]["waste"], reverse=True):
        waste_reasons.append(
            WasteReasonSummary(
                reason=r_name,
                total_waste_kg=round(r_data["waste"], 2),
                percentage=round((r_data["waste"] / total_waste_kg) * 100.0, 1) if total_waste_kg > 0 else 0.0,
                records_count=int(r_data["count"]),
            )
        )

    return DashboardSummaryResponse(
        total_events=total_events,
        completed_events=completed_events,
        upcoming_events=upcoming_events,
        active_events=active_events,
        total_guests_served=total_guests_served,
        total_prepared_kg=round(total_prepared_kg, 2),
        total_waste_kg=round(total_waste_kg, 2),
        overall_waste_percentage=overall_waste_percentage,
        total_waste_cost=round(total_waste_cost, 2),
        average_waste_per_guest_grams=avg_waste_per_guest_grams,
        top_wasted_foods=top_wasted_foods,
        waste_trends=waste_trends,
        waste_reasons=waste_reasons,
    )

@router.get("/top-waste-foods", response_model=List[TopWasteFoodItem])
def get_top_waste_foods(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    summary = get_dashboard_summary(current_user=current_user, db=db)
    return summary.top_wasted_foods[:limit]
