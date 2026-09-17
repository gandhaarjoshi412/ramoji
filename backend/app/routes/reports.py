from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User
from app.models.event import Event
from app.models.event_food import EventFood
from app.models.waste_record import WasteRecord
from app.schemas.report import EventReportResponse, ReportFoodItem, WasteReasonSummary
from app.services.calculation import (
    calculate_waste_percentage,
    calculate_waste_cost,
    calculate_waste_per_guest,
)
from app.services.event_sync import sync_event_scans_to_event_foods
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/events/{event_id}/report", tags=["Reports"])

@router.get("", response_model=EventReportResponse)
def get_event_report(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Auto-sync any camera waste scans to banquet event foods
    sync_event_scans_to_event_foods(db, event_id)

    event = (
        db.query(Event)
        .filter(Event.id == event_id, Event.hotel_id == current_user.hotel_id)
        .options(
            joinedload(Event.hotel),
            joinedload(Event.event_foods).joinedload(EventFood.food_item),
            joinedload(Event.event_foods).joinedload(EventFood.waste_records),
            joinedload(Event.waste_scans),
        )
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    food_breakdown = []
    reasons_map = {}

    for ef in event.event_foods:
        fname = ef.food_item.name if ef.food_item else "Unknown"
        fcat = ef.food_item.category if ef.food_item else "Other"
        prep = float(ef.prepared_weight_kg or 0.0)
        cost_kg = float(ef.estimated_cost_per_kg or 0.0)
        
        # Scale waste records
        scale_waste = sum(float(w.net_weight_kg) for w in ef.waste_records)
        scale_cost = calculate_waste_cost(scale_waste, cost_kg)

        # Camera AI waste scans
        scans_for_item = [s for s in getattr(event, "waste_scans", []) if s.food_item_id == ef.food_item_id]
        scan_waste = sum(s.final_weight_grams / 1000.0 for s in scans_for_item)
        scan_cost = sum(s.final_waste_cost for s in scans_for_item)

        if scan_waste > 0 and scale_waste == 0:
            item_waste = scan_waste
            item_cost = scan_cost
        elif scale_waste > 0 and scan_waste == 0:
            item_waste = scale_waste
            item_cost = scale_cost
        else:
            item_waste = scan_waste + scale_waste
            item_cost = scan_cost + scale_cost

        waste_pct = calculate_waste_percentage(item_waste, prep)

        primary_reason = ef.waste_records[0].waste_reason if ef.waste_records else ("Camera AI Scan" if scans_for_item else None)

        food_breakdown.append(
            ReportFoodItem(
                food_name=fname,
                category=fcat,
                prepared_kg=prep,
                leftover_kg=round(item_waste, 2),
                waste_percentage=waste_pct,
                cost_per_kg=cost_kg,
                waste_cost=round(item_cost, 2),
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

        if scans_for_item and not ef.waste_records:
            r = "Over-preparation / Leftover Buffet"
            if r not in reasons_map:
                reasons_map[r] = {"waste": 0.0, "count": 0}
            reasons_map[r]["waste"] += scan_waste
            reasons_map[r]["count"] += len(scans_for_item)

    total_prepared_kg = round(sum(f.prepared_kg for f in food_breakdown), 2)
    total_waste_kg = round(sum(f.leftover_kg for f in food_breakdown), 2)
    total_waste_cost = round(sum(f.waste_cost for f in food_breakdown), 2)
    overall_waste_percentage = calculate_waste_percentage(total_waste_kg, total_prepared_kg)
    waste_per_guest_kg = calculate_waste_per_guest(total_waste_kg, event.actual_guests)
    waste_per_guest_grams = round(waste_per_guest_kg * 1000.0, 1)

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
        total_food_prepared_kg=total_prepared_kg,
        total_food_waste_kg=total_waste_kg,
        waste_rate_percentage=overall_waste_percentage,
        waste_per_guest_grams=waste_per_guest_grams,
        waste_per_guest_kg=waste_per_guest_kg,
        estimated_waste_cost=total_waste_cost,
        food_breakdown=food_breakdown,
        waste_reasons_breakdown=reasons_breakdown,
    )
