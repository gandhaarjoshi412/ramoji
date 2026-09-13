from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User
from app.models.event import Event
from app.models.event_food import EventFood
from app.models.waste_record import WasteRecord
from app.schemas.report import EventReportResponse, ReportFoodItem
from app.schemas.report import WasteReasonSummary
from app.services.calculation import (
    calculate_event_summary,
    calculate_waste_percentage,
    calculate_waste_cost,
)
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/events/{event_id}/report", tags=["Reports"])

@router.get("", response_model=EventReportResponse)
def get_event_report(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.hotel_id == current_user.hotel_id)
        .options(
            joinedload(Event.hotel),
            joinedload(Event.event_foods).joinedload(EventFood.food_item),
            joinedload(Event.event_foods).joinedload(EventFood.waste_records),
        )
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    summary = calculate_event_summary(event.event_foods, event.actual_guests)

    food_breakdown = []
    reasons_map = {}

    for ef in event.event_foods:
        fname = ef.food_item.name if ef.food_item else "Unknown"
        fcat = ef.food_item.category if ef.food_item else "Other"
        prep = float(ef.prepared_weight_kg or 0.0)
        cost_kg = float(ef.estimated_cost_per_kg or 0.0)
        item_waste = sum(float(w.net_weight_kg) for w in ef.waste_records)
        waste_pct = calculate_waste_percentage(item_waste, prep)
        item_cost = calculate_waste_cost(item_waste, cost_kg)

        primary_reason = ef.waste_records[0].waste_reason if ef.waste_records else None

        food_breakdown.append(
            ReportFoodItem(
                food_name=fname,
                category=fcat,
                prepared_kg=prep,
                leftover_kg=round(item_waste, 2),
                waste_percentage=waste_pct,
                cost_per_kg=cost_kg,
                waste_cost=item_cost,
                primary_reason=primary_reason,
                notes=ef.notes,
            )
        )

        for w in ef.waste_records:
            r = w.waste_reason or "Other"
            if r not in reasons_map:
                reasons_map[r] = {"waste": 0.0, "count": 0}
            reasons_map[r]["waste"] += float(w.net_weight_kg)
            reasons_map[r]["count"] += 1

    total_waste_kg = summary["total_waste_kg"]
    reasons_breakdown = []
    for r_name, r_val in sorted(reasons_map.items(), key=lambda x: x[1]["waste"], reverse=True):
        reasons_breakdown.append(
            WasteReasonSummary(
                reason=r_name,
                total_waste_kg=round(r_val["waste"], 2),
                percentage=round((r_val["waste"] / total_waste_kg) * 100.0, 1) if total_waste_kg > 0 else 0.0,
                records_count=r_val["count"],
            )
        )

    return EventReportResponse(
        hotel_name=event.hotel.name if event.hotel else "Banquet Operations",
        hotel_address=event.hotel.address if event.hotel else None,
        generated_at=datetime.utcnow(),
        event_id=event.id,
        event_name=event.name,
        event_type=event.event_type,
        venue=event.venue,
        event_date=event.event_date,
        expected_guests=event.expected_guests,
        actual_guests=event.actual_guests,
        status=event.status,
        total_food_prepared_kg=summary["total_prepared_kg"],
        total_food_waste_kg=summary["total_waste_kg"],
        waste_rate_percentage=summary["overall_waste_percentage"],
        waste_per_guest_grams=summary["waste_per_guest_grams"],
        waste_per_guest_kg=summary["waste_per_guest_kg"],
        estimated_waste_cost=summary["total_waste_cost"],
        food_breakdown=food_breakdown,
        waste_reasons_breakdown=reasons_breakdown,
    )
