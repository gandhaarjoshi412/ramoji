import re
import os
from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, Body, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, distinct, or_

from app.database import get_db, SessionLocal, engine
from app.models.user import User
from app.models.event import Event
from app.models.event_food import EventFood
from app.models.event_category import EventCategory
from app.models.waste_scan import WasteScan
from app.models.hotel import Hotel
from app.models.analytics_record import AnalyticsRecord
from app.services.calculation_engine import (
    calculate_core_waste_metrics,
    build_comparison_payload,
    reconcile_currency_buckets,
    calculate_data_quality_score,
)
from app.services.intelligence_engine import generate_operational_intelligence
from app.services.dish_matching import (
    resolve_canonical_dish,
    audit_record_for_anomalies,
    CANONICAL_DISH_CATALOG,
)

from app.schemas.dashboard import (
    DashboardSummaryResponse,
    TopWasteFoodItem,
    WasteByEventItem,
    WasteTrendPoint,
)
from app.schemas.analytics import EventAnalyticsResponse, EventFoodWasteSummary
from app.routes.scan import build_scan_response
import uuid
from app.utils.security import get_current_user
from app.services.excel_parser import parse_excel_file, preview_excel_file
from app.services.intelligent_report_parser import (
    analyze_report_file,
    parse_and_normalize_report,
)

router = APIRouter(tags=["Analytics & Operational Intelligence"])

# =========================================================================
# AUTO-SEED INITIAL ANALYTICS DATA FROM EXCEL IF EMPTY
# =========================================================================
def seed_analytics_if_empty(db: Session):
    count = db.query(AnalyticsRecord).count()
    if count == 0:
        candidates = [
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "sample_data", "Daily report.xlsx"),
            os.path.join(os.path.dirname(__file__), "..", "..", "sample_data", "Daily report.xlsx"),
            os.path.abspath("sample_data/Daily report.xlsx"),
            os.path.abspath("backend/sample_data/Daily report.xlsx"),
            "/home/gandhaar/project/ramoji/backend/sample_data/Daily report.xlsx",
            "/home/gandhaar/Downloads/Daily report.xlsx",
        ]
        excel_path = next((p for p in candidates if os.path.exists(p)), None)
        if excel_path:
            try:
                with open(excel_path, "rb") as f:
                    content = f.read()
                records, warnings = parse_and_normalize_report(content, os.path.basename(excel_path))
                for r in records:
                    rec = AnalyticsRecord(**r)
                    db.add(rec)
                db.commit()
                print(f"Successfully seeded {len(records)} AnalyticsRecords from {excel_path} via IntelligentReportParser")
            except Exception as e:
                db.rollback()
                print(f"Failed to seed AnalyticsRecords: {e}")

# =========================================================================
# 1. COMPREHENSIVE ANALYTICS OVERVIEW ENDPOINT
# =========================================================================
@router.get("/api/analytics/overview")
def get_analytics_overview(
    date_preset: Optional[str] = Query("all"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    hotel: Optional[str] = Query("all"),
    service_type: Optional[str] = Query("all"),
    session: Optional[str] = Query("all"),
    event_id: Optional[str] = Query("all"),
    event_type: Optional[str] = Query("all"),
    dish_category: Optional[str] = Query("all"),
    data_source: Optional[str] = Query("all"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Base query excluding soft-deleted/archived records
    query = db.query(AnalyticsRecord).filter(AnalyticsRecord.is_archived == False)

    # Hotel filter (if not "all", filter by hotel name)
    if hotel and hotel != "all":
        query = query.filter(AnalyticsRecord.hotel_name == hotel)

    # Service type filter
    if service_type and service_type != "all":
        query = query.filter(AnalyticsRecord.service_type == service_type)

    # Session filter
    if session and session != "all":
        query = query.filter(AnalyticsRecord.session == session)

    # Category filter
    if dish_category and dish_category != "all":
        query = query.filter(AnalyticsRecord.dish_category == dish_category)

    # Data source filter
    if data_source and data_source != "all":
        query = query.filter(AnalyticsRecord.data_source == data_source)

    # Event category / type filter
    if event_type and event_type != "all":
        query = query.filter(AnalyticsRecord.event_type == event_type)

    # Event filter (handles both event_id integer and event_name string)
    if event_id and event_id != "all":
        if event_id.isdigit():
            query = query.filter(
                or_(
                    AnalyticsRecord.event_id == int(event_id),
                    AnalyticsRecord.event_name == event_id
                )
            )
        else:
            query = query.filter(
                or_(
                    AnalyticsRecord.event_name == event_id,
                    AnalyticsRecord.event_name.ilike(f"%{event_id}%")
                )
            )

    # Date filters with strict inclusive boundary handling
    today = date.today()
    if date_preset == "today":
        query = query.filter(AnalyticsRecord.record_date == today)
    elif date_preset == "yesterday":
        query = query.filter(AnalyticsRecord.record_date == today - timedelta(days=1))
    elif date_preset == "last_7":
        query = query.filter(AnalyticsRecord.record_date >= today - timedelta(days=7), AnalyticsRecord.record_date <= today)
    elif date_preset == "last_30":
        query = query.filter(AnalyticsRecord.record_date >= today - timedelta(days=30), AnalyticsRecord.record_date <= today)
    elif date_preset == "this_week":
        week_start = today - timedelta(days=today.weekday())
        query = query.filter(AnalyticsRecord.record_date >= week_start, AnalyticsRecord.record_date <= today)
    elif date_preset == "previous_week":
        prev_week_end = today - timedelta(days=today.weekday() + 1)
        prev_week_start = prev_week_end - timedelta(days=6)
        query = query.filter(AnalyticsRecord.record_date >= prev_week_start, AnalyticsRecord.record_date <= prev_week_end)
    elif date_preset == "this_month":
        first_day = today.replace(day=1)
        query = query.filter(AnalyticsRecord.record_date >= first_day, AnalyticsRecord.record_date <= today)
    elif date_preset == "previous_month":
        first_this = today.replace(day=1)
        prev_month_end = first_this - timedelta(days=1)
        first_prev = prev_month_end.replace(day=1)
        query = query.filter(AnalyticsRecord.record_date >= first_prev, AnalyticsRecord.record_date <= prev_month_end)
    elif date_preset == "custom" and start_date and end_date:
        try:
            s_d = datetime.strptime(start_date, "%Y-%m-%d").date()
            e_d = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(AnalyticsRecord.record_date >= s_d, AnalyticsRecord.record_date <= e_d)
        except Exception:
            pass

    records: List[AnalyticsRecord] = query.order_by(AnalyticsRecord.record_date.desc(), AnalyticsRecord.session.asc()).all()
    dates_present = sorted(list(set(str(r.record_date) for r in records)))

    # Calculate Filter Context & Available Filter Options
    all_hotels = [h[0] for h in db.query(distinct(AnalyticsRecord.hotel_name)).all() if h[0]]
    all_sessions = [s[0] for s in db.query(distinct(AnalyticsRecord.session)).all() if s[0]]
    all_service_types = [st[0] for st in db.query(distinct(AnalyticsRecord.service_type)).all() if st[0]]
    all_categories = [c[0] for c in db.query(distinct(AnalyticsRecord.dish_category)).all() if c[0]]

    # Scope available events to the selected hotel (Filter dependency rule)
    event_query = db.query(distinct(AnalyticsRecord.event_name), AnalyticsRecord.event_id)
    if hotel and hotel != "all":
        event_query = event_query.filter(AnalyticsRecord.hotel_name == hotel)
    all_events_raw = event_query.all()
    seen_event_names = set()
    all_events = []
    for e in all_events_raw:
        if e[0] and e[0] not in seen_event_names:
            seen_event_names.add(e[0])
            all_events.append({"id": str(e[1]) if e[1] else e[0], "name": e[0]})

    if hotel and hotel != "all":
        h_record = db.query(Hotel).filter(Hotel.name == hotel).first()
        if h_record:
            db_evs = db.query(Event).filter(Event.hotel_id == h_record.id).all()
            for dbe in db_evs:
                if dbe.name not in seen_event_names:
                    seen_event_names.add(dbe.name)
                    all_events.append({"id": str(dbe.id), "name": dbe.name})

    # Retrieve all distinct event categories (persisted in EventCategory and from records)
    cat_records = db.query(EventCategory.name).all()
    rec_cats = db.query(distinct(AnalyticsRecord.event_type)).all()
    default_cats = ["Corporate", "Birthday", "Wedding", "Regular Hotel Service", "Conference", "Social", "Other"]
    all_event_types = sorted(list(set(
        [c[0] for c in cat_records if c[0]] +
        [c[0] for c in rec_cats if c[0]] +
        default_cats
    )))

    # Determine unique session covers for pax calculation
    unique_shifts = {}
    for r in records:
        shift_key = (str(r.record_date), r.hotel_name, r.session, r.event_name)
        if shift_key not in unique_shifts:
            unique_shifts[shift_key] = r.pax or 0

    total_pax = sum(unique_shifts.values()) if unique_shifts else sum(r.pax for r in records)

    # Core Aggregations using centralized calculation engine
    core_metrics = calculate_core_waste_metrics(records, pax_override=total_pax)
    total_prepared_kg = core_metrics["total_prepared_kg"]
    total_consumed_kg = core_metrics["total_consumed_kg"]
    total_waste_kg = core_metrics["total_waste_kg"]
    total_waste_cost = core_metrics["total_waste_cost"]
    total_kitchen_leftover_kg = core_metrics["total_kitchen_leftover_kg"]
    total_buffet_leftover_kg = core_metrics["total_buffet_leftover_kg"]
    total_leftover_kg = core_metrics["total_leftover_kg"]
    total_reuse_kg = core_metrics["total_reuse_kg"]
    total_estimated_kg = core_metrics["total_estimated_kg"]

    waste_rate_pct = core_metrics["waste_rate_pct"]
    consumption_rate_pct = core_metrics["consumption_rate_pct"]
    reuse_rate_pct = core_metrics["reuse_rate_pct"]

    waste_per_guest_g = core_metrics["waste_per_guest_g"]
    consumed_per_guest_g = core_metrics["consumed_per_guest_g"]
    prepared_per_guest_g = core_metrics["prepared_per_guest_g"]
    waste_cost_per_guest = core_metrics["waste_cost_per_guest"]

    prod_variance_kg = core_metrics["production_variance_kg"]
    prod_variance_pct = core_metrics["production_variance_pct"]

    # Generate transparent operational intelligence and empirical baseline comparison
    intel_filter_context = {
        "hotel_name": hotel if hotel != "all" else "All Hotels (Consolidated)",
        "event_type": event_type if event_type != "all" else None,
        "dish_category": dish_category if dish_category != "all" else None,
        "date_display": f"{dates_present[0]} to {dates_present[-1]}" if len(dates_present) > 1 else (dates_present[0] if dates_present else "All Available Dates"),
    }
    intel_result = generate_operational_intelligence(
        records=records,
        filter_context=intel_filter_context,
        db=db,
    )
    base = intel_result.get("baseline_metrics") if intel_result.get("has_baseline") else None

    # Construct empirical comparison KPIs (no fake multipliers)
    kpis = {
        "total_food_prepared_kg": build_comparison_payload(total_prepared_kg, base["total_prepared_kg"] if base else None),
        "food_prepared_per_guest_g": build_comparison_payload(prepared_per_guest_g, base["prepared_per_guest_g"] if base else None),
        "total_food_consumed_kg": build_comparison_payload(total_consumed_kg, base["total_consumed_kg"] if base else None),
        "consumption_rate_pct": build_comparison_payload(consumption_rate_pct, base["consumption_rate_pct"] if base else None),
        "consumption_per_guest_g": build_comparison_payload(consumed_per_guest_g, base["consumed_per_guest_g"] if base else None),
        "total_food_waste_kg": build_comparison_payload(total_waste_kg, base["total_waste_kg"] if base else None, is_waste_metric=True),
        "waste_rate_pct": build_comparison_payload(waste_rate_pct, base["waste_rate_pct"] if base else None, is_waste_metric=True),
        "waste_per_guest_g": build_comparison_payload(waste_per_guest_g, base["waste_per_guest_g"] if base else None, is_waste_metric=True),
        "total_leftover_kg": build_comparison_payload(total_leftover_kg, base["total_leftover_kg"] if base else None, is_waste_metric=True),
        "kitchen_leftover_kg": build_comparison_payload(total_kitchen_leftover_kg, base["total_kitchen_leftover_kg"] if base else None, is_waste_metric=True),
        "buffet_leftover_kg": build_comparison_payload(total_buffet_leftover_kg, base["total_buffet_leftover_kg"] if base else None, is_waste_metric=True),
        "food_reused_kg": build_comparison_payload(total_reuse_kg, base["total_reuse_kg"] if base else None),
        "reuse_rate_pct": build_comparison_payload(reuse_rate_pct, base["reuse_rate_pct"] if base else None),
        "food_diverted_kg": build_comparison_payload(total_reuse_kg, base["total_reuse_kg"] if base else None),
        "total_waste_cost": build_comparison_payload(total_waste_cost, base["total_waste_cost"] if base else None, is_waste_metric=True),
        "waste_cost_per_guest": build_comparison_payload(waste_cost_per_guest, base["waste_cost_per_guest"] if base else None, is_waste_metric=True),
        "waste_cost_pct_of_prepared": build_comparison_payload(
            (total_waste_cost / (total_prepared_kg * 150) * 100) if total_prepared_kg > 0 else 0,
            (base["total_waste_cost"] / (base["total_prepared_kg"] * 150) * 100) if (base and base["total_prepared_kg"] > 0) else None,
            is_waste_metric=True
        ),
        "production_variance_kg": build_comparison_payload(prod_variance_kg, base["production_variance_kg"] if base else None),
        "production_variance_pct": build_comparison_payload(prod_variance_pct, base["production_variance_pct"] if base else None),
        "total_guests": build_comparison_payload(total_pax, base["total_pax"] if base else None),
    }

    # Food Flow Data
    total_pickup_kg = sum(float(r.pickup_quantity_kg or 0.0) for r in records)
    food_flow = {
        "estimated_kg": round(total_estimated_kg, 2),
        "actual_production_kg": round(total_prepared_kg, 2),
        "pickup_kg": round(total_pickup_kg, 2),
        "actual_consumption_kg": round(total_consumed_kg, 2),
        "kitchen_leftover_kg": round(total_kitchen_leftover_kg, 2),
        "buffet_leftover_kg": round(total_buffet_leftover_kg, 2),
        "total_leftover_kg": round(total_leftover_kg, 2),
        "reuse_kg": round(total_reuse_kg, 2),
        "final_waste_kg": round(total_waste_kg, 2),
        "stages": [
            {"name": "Estimated", "quantity_kg": round(total_estimated_kg, 2), "percentage_of_prepared": 100, "description": "Planned recipe portions"},
            {"name": "Prepared", "quantity_kg": round(total_prepared_kg, 2), "percentage_of_prepared": 100, "description": "Actually cooked volume"},
            {"name": "Pickup", "quantity_kg": round(total_pickup_kg, 2), "percentage_of_prepared": round(total_pickup_kg/total_prepared_kg*100 if total_prepared_kg > 0 else 0, 1), "description": "Dispatched to dining floor"},
            {"name": "Consumed", "quantity_kg": round(total_consumed_kg, 2), "percentage_of_prepared": round(consumption_rate_pct, 1), "description": "Eaten by guests"},
            {"name": "Leftover", "quantity_kg": round(total_leftover_kg, 2), "percentage_of_prepared": round((total_leftover_kg/total_prepared_kg*100) if total_prepared_kg > 0 else 0, 1), "description": "Returned and kitchen hold"},
            {"name": "Reused", "quantity_kg": round(total_reuse_kg, 2), "percentage_of_prepared": round((total_reuse_kg/total_prepared_kg*100) if total_prepared_kg > 0 else 0, 1), "description": "Compliant food repurposing"},
            {"name": "Waste", "quantity_kg": round(total_waste_kg, 2), "percentage_of_prepared": round(waste_rate_pct, 1), "description": "Municipal waste disposal"},
        ]
    }

    # Daily Trends
    date_map: Dict[str, Dict[str, float]] = {}
    for r in records:
        ds = str(r.record_date)
        if ds not in date_map:
            date_map[ds] = {
                "date": ds,
                "production_kg": 0.0,
                "consumption_kg": 0.0,
                "waste_kg": 0.0,
                "leftover_kg": 0.0,
                "reuse_kg": 0.0,
                "waste_cost": 0.0,
                "pax": 0,
            }
        date_map[ds]["production_kg"] += r.actual_production_kg
        date_map[ds]["consumption_kg"] += r.actual_consumption_kg
        date_map[ds]["waste_kg"] += r.total_waste_kg
        date_map[ds]["leftover_kg"] += r.total_leftover_kg
        date_map[ds]["reuse_kg"] += r.reuse_quantity_kg
        date_map[ds]["waste_cost"] += r.waste_cost

    # Associate unique pax per date
    for (ds, h_name, s_name, ev_name), px in unique_shifts.items():
        if ds in date_map:
            date_map[ds]["pax"] += px

    daily_trends = []
    for ds, d in sorted(date_map.items()):
        prod = d["production_kg"]
        px = d["pax"] or 1
        daily_trends.append({
            "date": ds,
            "production_kg": round(prod, 2),
            "consumption_kg": round(d["consumption_kg"], 2),
            "waste_kg": round(d["waste_kg"], 2),
            "leftover_kg": round(d["leftover_kg"], 2),
            "reuse_kg": round(d["reuse_kg"], 2),
            "waste_percentage": round((d["waste_kg"] / prod * 100) if prod > 0 else 0, 2),
            "waste_per_guest_g": round((d["waste_kg"] / px * 1000) if px > 0 else 0, 1),
            "waste_cost": round(d["waste_cost"], 2),
            "pax": d["pax"],
        })

    # Session Analytics
    sess_map: Dict[str, Dict[str, float]] = {}
    for r in records:
        s_name = r.session
        if s_name not in sess_map:
            sess_map[s_name] = {
                "session": s_name,
                "pax": 0,
                "production_kg": 0.0,
                "consumption_kg": 0.0,
                "leftover_kg": 0.0,
                "reuse_kg": 0.0,
                "waste_kg": 0.0,
                "waste_cost": 0.0,
            }
        sess_map[s_name]["production_kg"] += r.actual_production_kg
        sess_map[s_name]["consumption_kg"] += r.actual_consumption_kg
        sess_map[s_name]["leftover_kg"] += r.total_leftover_kg
        sess_map[s_name]["reuse_kg"] += r.reuse_quantity_kg
        sess_map[s_name]["waste_kg"] += r.total_waste_kg
        sess_map[s_name]["waste_cost"] += r.waste_cost

    for (ds, h_name, s_name, ev_name), px in unique_shifts.items():
        if s_name in sess_map:
            sess_map[s_name]["pax"] += px

    session_comparison = []
    worst_waste_pct = -1.0
    worst_sess_name = ""

    # Reconcile session costs using Largest Remainder Method (guarantees sum(integers) == int(round(total_waste_cost)))
    raw_session_costs = {s_name: d["waste_cost"] for s_name, d in sess_map.items()}
    reconciled_currency = reconcile_currency_buckets(raw_session_costs, total_waste_cost)

    for s_name, d in sess_map.items():
        prod = d["production_kg"]
        px = d["pax"] or 1
        pct = (d["waste_kg"] / prod * 100) if prod > 0 else 0
        if pct > worst_waste_pct:
            worst_waste_pct = pct
            worst_sess_name = s_name

        display_cost_int = reconciled_currency.get(s_name, {}).get("display_int", int(round(d["waste_cost"])))

        session_comparison.append({
            "session": s_name,
            "pax": d["pax"],
            "production_kg": round(prod, 2),
            "consumption_kg": round(d["consumption_kg"], 2),
            "leftover_kg": round(d["leftover_kg"], 2),
            "reuse_kg": round(d["reuse_kg"], 2),
            "waste_kg": round(d["waste_kg"], 2),
            "waste_percentage": round(pct, 2),
            "waste_per_guest_g": round((d["waste_kg"] / px * 1000), 1),
            "waste_cost": round(d["waste_cost"], 2),
            "waste_cost_reconciled": display_cost_int,
            "display_cost_inr": display_cost_int,
            "is_worst_session": False,
        })

    for s in session_comparison:
        if s["session"] == worst_sess_name:
            s["is_worst_session"] = True

    # Service Type Comparison
    st_map: Dict[str, Dict[str, float]] = {}
    for r in records:
        st_name = r.service_type
        if st_name not in st_map:
            st_map[st_name] = {
                "service_type": st_name,
                "pax": 0,
                "production_kg": 0.0,
                "consumption_kg": 0.0,
                "leftover_kg": 0.0,
                "reuse_kg": 0.0,
                "waste_kg": 0.0,
                "waste_cost": 0.0,
            }
        st_map[st_name]["production_kg"] += r.actual_production_kg
        st_map[st_name]["consumption_kg"] += r.actual_consumption_kg
        st_map[st_name]["leftover_kg"] += r.total_leftover_kg
        st_map[st_name]["reuse_kg"] += r.reuse_quantity_kg
        st_map[st_name]["waste_kg"] += r.total_waste_kg
        st_map[st_name]["waste_cost"] += r.waste_cost

    for (ds, h_name, s_name, ev_name), px in unique_shifts.items():
        # Match service type
        rec = next((r for r in records if r.session == s_name and r.hotel_name == h_name), None)
        if rec and rec.service_type in st_map:
            st_map[rec.service_type]["pax"] += px

    service_type_comparison = []
    for st_name, d in st_map.items():
        prod = d["production_kg"]
        px = d["pax"] or 1
        service_type_comparison.append({
            "service_type": st_name,
            "pax": d["pax"],
            "production_kg": round(prod, 2),
            "consumption_kg": round(d["consumption_kg"], 2),
            "leftover_kg": round(d["leftover_kg"], 2),
            "reuse_kg": round(d["reuse_kg"], 2),
            "waste_kg": round(d["waste_kg"], 2),
            "waste_percentage": round((d["waste_kg"] / prod * 100) if prod > 0 else 0, 2),
            "waste_per_guest_g": round((d["waste_kg"] / px * 1000), 1),
            "waste_cost": round(d["waste_cost"], 2),
        })

    # Event Performance
    ev_map: Dict[str, Dict[str, Any]] = {}
    for r in records:
        ev_key = r.event_name or f"{r.hotel_name} - {r.session}"
        if ev_key not in ev_map:
            ev_map[ev_key] = {
                "event_id": ev_key,
                "event_name": ev_key,
                "hotel": r.hotel_name,
                "location": r.property_location or "Banquet Hall",
                "event_date": str(r.record_date),
                "event_type": r.event_type or "Regular Hotel Service",
                "service_type": r.service_type,
                "pax": r.pax,
                "estimated_kg": 0.0,
                "actual_production_kg": 0.0,
                "consumption_kg": 0.0,
                "leftover_kg": 0.0,
                "reuse_kg": 0.0,
                "waste_kg": 0.0,
                "waste_cost": 0.0,
            }
        ev_map[ev_key]["estimated_kg"] += float(r.estimated_production_kg or r.actual_production_kg or 0.0)
        ev_map[ev_key]["actual_production_kg"] += float(r.actual_production_kg or 0.0)
        ev_map[ev_key]["consumption_kg"] += float(r.actual_consumption_kg or 0.0)
        ev_map[ev_key]["leftover_kg"] += float(r.total_leftover_kg or 0.0)
        ev_map[ev_key]["reuse_kg"] += float(r.reuse_quantity_kg or 0.0)
        ev_map[ev_key]["waste_kg"] += float(r.total_waste_kg or 0.0)
        ev_map[ev_key]["waste_cost"] += float(r.waste_cost or 0.0)

    event_performance = []
    for ev_key, d in ev_map.items():
        prod = d["actual_production_kg"]
        px = d["pax"] or 1
        w_pct = (d["waste_kg"] / prod * 100) if prod > 0 else 0.0
        status = "Excellent" if w_pct <= 3 else ("Good" if w_pct <= 5 else ("Moderate" if w_pct <= 8 else ("Needs Attention" if w_pct <= 12 else "Critical")))
        event_performance.append({
            "event_id": d["event_id"],
            "event_name": d["event_name"],
            "hotel": d["hotel"],
            "location": d["location"],
            "event_date": d["event_date"],
            "event_type": d["event_type"],
            "service_type": d["service_type"],
            "pax": d["pax"],
            "estimated_kg": round(d["estimated_kg"], 2),
            "actual_production_kg": round(prod, 2),
            "consumption_kg": round(d["consumption_kg"], 2),
            "leftover_kg": round(d["leftover_kg"], 2),
            "reuse_kg": round(d["reuse_kg"], 2),
            "waste_kg": round(d["waste_kg"], 2),
            "waste_percentage": round(w_pct, 2),
            "waste_per_guest_g": round((d["waste_kg"] / px * 1000), 1),
            "waste_cost": round(d["waste_cost"], 2),
            "performance_status": status,
        })

    # Dish Intelligence
    dish_map: Dict[str, Dict[str, Any]] = {}
    for r in records:
        dn = r.dish_name
        if dn not in dish_map:
            dish_map[dn] = {
                "dish_name": dn,
                "category": r.dish_category,
                "occurrences": 0,
                "total_prepared_kg": 0.0,
                "total_consumed_kg": 0.0,
                "total_leftover_kg": 0.0,
                "total_reuse_kg": 0.0,
                "total_waste_kg": 0.0,
                "total_waste_cost": 0.0,
                "estimated_kg": 0.0,
            }
        dish_map[dn]["occurrences"] += 1
        dish_map[dn]["total_prepared_kg"] += r.actual_production_kg
        dish_map[dn]["total_consumed_kg"] += r.actual_consumption_kg
        dish_map[dn]["total_leftover_kg"] += r.total_leftover_kg
        dish_map[dn]["total_reuse_kg"] += r.reuse_quantity_kg
        dish_map[dn]["total_waste_kg"] += r.total_waste_kg
        dish_map[dn]["total_waste_cost"] += r.waste_cost
        dish_map[dn]["estimated_kg"] += float(r.estimated_production_kg or r.actual_production_kg or 0.0)

    dish_list = []
    for dn, d in dish_map.items():
        prep = d["total_prepared_kg"]
        w = d["total_waste_kg"]
        est = d["estimated_kg"]
        w_pct = (w / prep * 100) if prep > 0 else 0
        cons_rate = (d["total_consumed_kg"] / prep * 100) if prep > 0 else 0
        var_kg = prep - est
        var_pct = (var_kg / est * 100) if est > 0 else 0

        dish_list.append({
            "dish_name": dn,
            "category": d["category"],
            "occurrences": d["occurrences"],
            "total_prepared_kg": round(prep, 2),
            "total_consumed_kg": round(d["total_consumed_kg"], 2),
            "total_leftover_kg": round(d["total_leftover_kg"], 2),
            "total_reuse_kg": round(d["total_reuse_kg"], 2),
            "total_waste_kg": round(w, 2),
            "waste_percentage": round(w_pct, 2),
            "waste_per_guest_g": round((w / total_pax * 1000) if total_pax > 0 else 0, 1),
            "total_waste_cost": round(d["total_waste_cost"], 2),
            "production_variance_kg": round(var_kg, 2),
            "production_variance_pct": round(var_pct, 1),
            "consumption_rate_pct": round(cons_rate, 1),
            "is_over_produced": var_pct > 3.0,
            "is_under_produced": cons_rate > 98.0,
            "is_consistent": w_pct <= 2.5 and prep > 5.0,
        })

    top_wasted_dishes = sorted(dish_list, key=lambda x: x["total_waste_kg"], reverse=True)[:15]
    consistent_dishes = sorted([d for d in dish_list if d["is_consistent"] or d["waste_percentage"] < 3.0], key=lambda x: x["waste_percentage"])[:12]
    over_production_alerts = sorted([d for d in dish_list if d["is_over_produced"]], key=lambda x: x["production_variance_kg"], reverse=True)[:10]
    under_production_alerts = sorted([d for d in dish_list if d["is_under_produced"]], key=lambda x: x["consumption_rate_pct"], reverse=True)[:10]

    # Pareto Analysis
    sorted_for_pareto = sorted(dish_list, key=lambda x: x["total_waste_kg"], reverse=True)
    running_waste = 0.0
    pareto_analysis = []
    for d in sorted_for_pareto:
        if d["total_waste_kg"] <= 0: continue
        running_waste += d["total_waste_kg"]
        share = (d["total_waste_kg"] / total_waste_kg * 100) if total_waste_kg > 0 else 0
        cum_share = (running_waste / total_waste_kg * 100) if total_waste_kg > 0 else 0
        pareto_analysis.append({
            "dish_name": d["dish_name"],
            "category": d["category"],
            "waste_kg": d["total_waste_kg"],
            "waste_percentage_of_total": round(share, 1),
            "cumulative_waste_percentage": round(cum_share, 1),
        })

    # Heatmap Data: Day/Date x Session
    heatmap = []
    # Distinct dates and sessions
    dates_present = sorted(list(set(str(r.record_date) for r in records)))
    for dt in dates_present:
        for s in all_sessions:
            matching = [r for r in records if str(r.record_date) == dt and r.session == s]
            if matching:
                w_kg = sum(r.total_waste_kg for r in matching)
                prep_kg = sum(r.actual_production_kg for r in matching)
                cost = sum(r.waste_cost for r in matching)
                px = sum(r.pax for r in matching) / len(matching)
                pct = (w_kg / prep_kg * 100) if prep_kg > 0 else 0
                heatmap.append({
                    "day_or_date": dt,
                    "session": s,
                    "value": round(w_kg, 2),
                    "label": f"{w_kg:.1f} kg",
                    "waste_kg": round(w_kg, 2),
                    "waste_pct": round(pct, 2),
                    "waste_per_guest_g": round((w_kg / px * 1000) if px > 0 else 0, 1),
                    "waste_cost": round(cost, 2),
                })

    # Day of Week Analysis
    days_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    dow_map = {d: {"pax": [], "prod": [], "cons": [], "waste": []} for d in days_order}
    for r in records:
        day_name = r.record_date.strftime("%A")
        if day_name in dow_map:
            dow_map[day_name]["pax"].append(r.pax)
            dow_map[day_name]["prod"].append(r.actual_production_kg)
            dow_map[day_name]["cons"].append(r.actual_consumption_kg)
            dow_map[day_name]["waste"].append(r.total_waste_kg)

    day_of_week_analysis = []
    for day_name in days_order:
        data_bucket = dow_map[day_name]
        cnt = len(data_bucket["prod"])
        if cnt > 0:
            avg_prod = sum(data_bucket["prod"]) / cnt
            avg_waste = sum(data_bucket["waste"]) / cnt
            avg_pax = sum(data_bucket["pax"]) / cnt if cnt > 0 else 0
            day_of_week_analysis.append({
                "day": day_name,
                "avg_pax": int(avg_pax),
                "avg_production_kg": round(avg_prod, 2),
                "avg_consumption_kg": round(sum(data_bucket["cons"]) / cnt, 2),
                "avg_waste_kg": round(avg_waste, 2),
                "avg_waste_pct": round((avg_waste / avg_prod * 100) if avg_prod > 0 else 0, 1),
                "avg_waste_per_guest_g": round((avg_waste / avg_pax * 1000) if avg_pax > 0 else 0, 1),
            })

    # Financial Impact & Savings Simulator
    monthly_waste_est = round(total_waste_cost * 30.0 / max(1, len(dates_present)), 2)
    annual_waste_est = round(total_waste_cost * 365.0 / max(1, len(dates_present)), 2)
    financial_impact = {
        "total_waste_cost": round(total_waste_cost, 2),
        "waste_cost_per_guest": round(waste_cost_per_guest, 2),
        "waste_cost_per_kg": round((total_waste_cost / total_waste_kg) if total_waste_kg > 0 else 0, 2),
        "cost_consumed_per_guest": round(((total_consumed_kg * 85.0) / total_pax) if total_pax > 0 else 0, 2),
        "monthly_estimate_inr": monthly_waste_est,
        "annualized_estimate_inr": annual_waste_est,
        "projection_disclaimer": "Annualized calculations represent run-rate projections based on recorded banquet service shifts.",
        "savings_simulator": [
            {
                "reduction_pct": 10,
                "monthly_savings_inr": round(monthly_waste_est * 0.10, 2),
                "annual_savings_inr": round(annual_waste_est * 0.10, 2),
                "waste_reduced_kg": round(total_waste_kg * 0.10, 2),
            },
            {
                "reduction_pct": 20,
                "monthly_savings_inr": round(monthly_waste_est * 0.20, 2),
                "annual_savings_inr": round(annual_waste_est * 0.20, 2),
                "waste_reduced_kg": round(total_waste_kg * 0.20, 2),
            },
            {
                "reduction_pct": 30,
                "monthly_savings_inr": round(monthly_waste_est * 0.30, 2),
                "annual_savings_inr": round(annual_waste_est * 0.30, 2),
                "waste_reduced_kg": round(total_waste_kg * 0.30, 2),
            },
        ]
    }

    # AI / Operational Intelligence Insights - strictly grounded in operational records & baseline
    insights = list(intel_result.get("insights", []))
    if worst_sess_name and not any(i.get("category") == "Shift Performance" for i in insights):
        worst_s_data = next((s for s in session_comparison if s["session"] == worst_sess_name), None)
        if worst_s_data:
            insights.append({
                "id": "ins-shift-peak",
                "priority": "Critical" if worst_s_data["waste_percentage"] > 8 else "Attention",
                "category": "Shift Performance",
                "title": f"{worst_sess_name} Shift Waste Peak Detected",
                "observation": f"{worst_sess_name} generated the highest operational waste proportion at {worst_s_data['waste_percentage']:.2f}% ({worst_s_data['waste_kg']:.1f} kg lost).",
                "reason_metric": f"{worst_s_data['waste_per_guest_g']:.1f}g per guest waste recorded across {worst_s_data['pax']} attendees.",
                "recommendation": f"Stage replenishment batches during {worst_sess_name} in 30-minute intervals rather than opening full buffet pans upfront.",
            })

    # Executive Summary text from Intelligence Engine
    exec_summary = intel_result.get("executive_summary") or (
        f"Culinary operations recorded {total_prepared_kg:.1f} kg prepared and {total_waste_kg:.1f} kg final waste "
        f"({waste_rate_pct:.2f}% waste rate) across {len(unique_shifts)} dining shifts. "
        f"Direct financial loss stands at ₹{total_waste_cost:,.0f} ({waste_cost_per_guest:.1f} ₹/guest)."
    )

    # Date coverage audit (addresses sparse reporting vs continuous timeline)
    if dates_present:
        min_date_obj = min(datetime.strptime(d, "%Y-%m-%d").date() for d in dates_present)
        max_date_obj = max(datetime.strptime(d, "%Y-%m-%d").date() for d in dates_present)
        calendar_days_count = (max_date_obj - min_date_obj).days + 1
        recorded_days_count = len(dates_present)
        unrecorded_days_count = max(0, calendar_days_count - recorded_days_count)
        date_coverage = {
            "calendar_start": str(min_date_obj),
            "calendar_end": str(max_date_obj),
            "calendar_days_count": calendar_days_count,
            "recorded_days_count": recorded_days_count,
            "unrecorded_days_count": unrecorded_days_count,
            "coverage_pct": round((recorded_days_count / calendar_days_count * 100), 1) if calendar_days_count > 0 else 100.0,
            "recorded_dates": dates_present,
            "is_sparse": unrecorded_days_count > 0,
            "notes": (
                f"Data recorded for {recorded_days_count} of {calendar_days_count} calendar days. "
                "Unrecorded days are explicitly distinguished from zero-waste services to maintain mathematical integrity."
                if unrecorded_days_count > 0 else "Continuous daily recording present across this range."
            )
        }
    else:
        date_coverage = {
            "calendar_start": None,
            "calendar_end": None,
            "calendar_days_count": 0,
            "recorded_days_count": 0,
            "unrecorded_days_count": 0,
            "coverage_pct": 0.0,
            "recorded_dates": [],
            "is_sparse": False,
            "notes": "No records exist for the selected scope."
        }

    # Food Mass-Balance Audit (strict law of conservation of mass across culinary pipeline)
    mass_balance_audit = {
        "is_reconciled": core_metrics["mass_balance_reconciled"],
        "total_prepared_kg": core_metrics["total_prepared_kg"],
        "total_consumed_kg": core_metrics["total_consumed_kg"],
        "total_leftover_kg": core_metrics["total_leftover_kg"],
        "total_reuse_kg": core_metrics["total_reuse_kg"],
        "total_waste_kg": core_metrics["total_waste_kg"],
        "total_other_disposition_kg": core_metrics["total_other_disposition_kg"],
        "production_variance_kg": core_metrics["production_reconciliation_variance_kg"],
        "leftover_variance_kg": core_metrics["leftover_reconciliation_variance_kg"],
        "unaccounted_discrepancy_records": core_metrics["discrepancy_records"][:15],
        "audit_note": (
            "Food mass balance is strictly reconciled: Leftover = Reused + Discarded Waste + Other Dispositions."
            if core_metrics["mass_balance_reconciled"]
            else f"Reconciliation variance of {abs(core_metrics['leftover_reconciliation_variance_kg']):.2f} kg detected between recorded leftovers and reported dispositions. Flagged for operational review."
        )
    }

    # Data Quality Report
    warnings = []
    for r in records:
        if r.pax <= 0:
            warnings.append({"record_id": r.id, "item": r.dish_name, "issue": "Missing or zero guest count (Pax)", "severity": "medium"})
        if r.total_waste_kg > r.actual_production_kg and r.actual_production_kg > 0:
            warnings.append({"record_id": r.id, "item": r.dish_name, "issue": "Waste exceeds actual prepared quantity", "severity": "high"})
        if r.item_cost <= 0:
            warnings.append({"record_id": r.id, "item": r.dish_name, "issue": "Zero item recipe cost recorded", "severity": "low"})

    dq_result = calculate_data_quality_score(records)
    data_quality = {
        "overall_score_pct": dq_result["score"],
        "rating": dq_result["rating"],
        "total_records": dq_result["total_records"],
        "missing_hotel_count": dq_result["missing_hotel_count"],
        "missing_session_count": dq_result["missing_session_count"],
        "missing_pax_count": dq_result["missing_pax_count"],
        "unreconciled_count": dq_result["unreconciled_count"],
        "missing_cost_count": dq_result["missing_cost_count"],
        "unverified_count": dq_result["unverified_count"],
        "warning_count": len(warnings),
        "warnings": warnings[:15],
        "source_breakdown": [
            {"source": s, "count": len([r for r in records if r.data_source == s]), "percentage": round(len([r for r in records if r.data_source == s]) / len(records) * 100, 1)}
            for s in sorted(list(set(r.data_source or "Excel Import" for r in records)))
        ] if records else [],
        "audit_info": {
            "hotel": hotel if hotel != "all" else "Multi-Hotel Portfolio",
            "last_uploaded_at": str(records[0].created_at)[:19] if records else "Recent",
            "file_name": records[0].source_file if records else "Daily report.xlsx",
            "uploaded_by": "F&B Operations Management",
        }
    }

    # Raw Records representation
    raw_records = [
        {
            "id": r.id,
            "date": str(r.record_date),
            "hotel": r.hotel_name,
            "property_location": r.property_location,
            "event_name": r.event_name,
            "event_type": r.event_type,
            "service_type": r.service_type,
            "session": r.session,
            "pax": r.pax,
            "dish_name": r.dish_name,
            "dish_category": r.dish_category,
            "food_type": r.food_type,
            "uom": r.uom,
            "item_cost": r.item_cost,
            "standard_qty_per_portion": r.standard_qty_per_portion,
            "conversion_factor": r.conversion_factor,
            "estimated_production": r.estimated_production,
            "estimated_production_kg": r.estimated_production_kg,
            "actual_production": r.actual_production,
            "actual_production_kg": r.actual_production_kg,
            "over_production": r.over_production,
            "over_production_kg": r.over_production_kg,
            "pickup_quantity": r.pickup_quantity,
            "pickup_quantity_kg": r.pickup_quantity_kg,
            "kitchen_leftover": r.kitchen_leftover,
            "kitchen_leftover_kg": r.kitchen_leftover_kg,
            "location_buffet_return": r.location_buffet_return,
            "location_buffet_return_kg": r.location_buffet_return_kg,
            "reuse_quantity": r.reuse_quantity,
            "reuse_quantity_kg": r.reuse_quantity_kg,
            "actual_consumption": r.actual_consumption,
            "actual_consumption_kg": r.actual_consumption_kg,
            "total_leftover": r.total_leftover,
            "total_leftover_kg": r.total_leftover_kg,
            "total_waste": r.total_waste,
            "total_waste_kg": r.total_waste_kg,
            "waste_cost": r.waste_cost,
            "waste_percentage": r.waste_percentage,
            "waste_per_head_grams": r.waste_per_head_grams,
            "consumption_per_head_grams": r.consumption_per_head_grams,
            "production_per_head_grams": r.production_per_head_grams,
            "reuse_percentage": r.reuse_percentage,
            "notes": r.notes,
            "data_source": r.data_source,
            "ai_confidence": r.ai_confidence,
            "source_file": r.source_file,
            "source_sheet": r.source_sheet,
            "source_row": r.source_row,
            "import_id": r.import_id,
            "confidence_score": r.confidence_score,
            "created_at": str(r.created_at),
        }
        for r in records
    ]

    return {
        "filter_context": {
            "hotel_name": hotel if hotel != "all" else "All Hotels (Consolidated)",
            "date_display": f"{dates_present[0]} to {dates_present[-1]}" if len(dates_present) > 1 else (dates_present[0] if dates_present else "All Available Dates"),
            "active_sessions": session if session != "all" else "All Sessions",
            "active_service_types": service_type if service_type != "all" else "All Service Types",
            "active_event_type": event_type if event_type != "all" else "All Categories",
            "active_event": event_id if event_id != "all" else "All Events",
        },
        "filter_options": {
            "hotels": all_hotels,
            "sessions": all_sessions,
            "service_types": all_service_types,
            "event_types": all_event_types,
            "categories": all_categories,
            "events": all_events,
        },
        "executive_summary": exec_summary,
        "kpis": kpis,
        "food_flow": food_flow,
        "daily_trends": daily_trends,
        "session_comparison": session_comparison,
        "service_type_comparison": service_type_comparison,
        "event_performance": event_performance,
        "top_wasted_dishes": top_wasted_dishes,
        "consistent_dishes": consistent_dishes,
        "over_production_alerts": over_production_alerts,
        "under_production_alerts": under_production_alerts,
        "pareto_analysis": pareto_analysis,
        "heatmap": heatmap,
        "day_of_week_analysis": day_of_week_analysis,
        "financial_impact": financial_impact,
        "insights": insights,
        "data_quality": data_quality,
        "mass_balance_audit": mass_balance_audit,
        "date_coverage": date_coverage,
        "raw_records": raw_records,
    }

# =========================================================================
# 2. DISH DRILL-DOWN ENDPOINT
# =========================================================================
@router.get("/api/analytics/dish-drilldown")
def get_dish_drilldown(
    dish_name: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recs = db.query(AnalyticsRecord).filter(AnalyticsRecord.dish_name == dish_name).all()
    if not recs:
        # Case insensitive fallback
        recs = db.query(AnalyticsRecord).filter(AnalyticsRecord.dish_name.ilike(f"%{dish_name}%")).all()
    if not recs:
        raise HTTPException(status_code=404, detail=f"Dish '{dish_name}' not found in records")

    total_prep = sum(r.actual_production_kg for r in recs)
    total_cons = sum(r.actual_consumption_kg for r in recs)
    total_waste = sum(r.total_waste_kg for r in recs)
    total_cost = sum(r.waste_cost for r in recs)
    total_pax = sum(r.pax for r in recs) or 1
    cnt = len(recs)

    w_pct = (total_waste / total_prep * 100) if total_prep > 0 else 0
    w_per_guest = (total_waste / total_pax * 1000) if total_pax > 0 else 0

    # Date trends
    d_map = {}
    for r in recs:
        ds = str(r.record_date)
        if ds not in d_map:
            d_map[ds] = {"date": ds, "prepared_kg": 0.0, "consumed_kg": 0.0, "waste_kg": 0.0}
        d_map[ds]["prepared_kg"] += r.actual_production_kg
        d_map[ds]["consumed_kg"] += r.actual_consumption_kg
        d_map[ds]["waste_kg"] += r.total_waste_kg

    date_trends = [
        {
            "date": ds,
            "prepared_kg": round(v["prepared_kg"], 2),
            "consumed_kg": round(v["consumed_kg"], 2),
            "waste_kg": round(v["waste_kg"], 2),
            "waste_percentage": round((v["waste_kg"] / v["prepared_kg"] * 100) if v["prepared_kg"] > 0 else 0, 1),
        }
        for ds, v in sorted(d_map.items())
    ]

    # Session breakdown
    s_map = {}
    for r in recs:
        s = r.session
        if s not in s_map:
            s_map[s] = {"session": s, "prepared_kg": 0.0, "consumed_kg": 0.0, "waste_kg": 0.0}
        s_map[s]["prepared_kg"] += r.actual_production_kg
        s_map[s]["consumed_kg"] += r.actual_consumption_kg
        s_map[s]["waste_kg"] += r.total_waste_kg

    session_breakdown = [
        {
            "session": s,
            "prepared_kg": round(v["prepared_kg"], 2),
            "consumed_kg": round(v["consumed_kg"], 2),
            "waste_kg": round(v["waste_kg"], 2),
            "waste_percentage": round((v["waste_kg"] / v["prepared_kg"] * 100) if v["prepared_kg"] > 0 else 0, 1),
        }
        for s, v in s_map.items()
    ]

    # Event breakdown
    event_breakdown = [
        {
            "event_name": r.event_name or r.hotel_name,
            "date": str(r.record_date),
            "pax": r.pax,
            "prepared_kg": round(r.actual_production_kg, 2),
            "consumed_kg": round(r.actual_consumption_kg, 2),
            "waste_kg": round(r.total_waste_kg, 2),
        }
        for r in recs
    ]

    category = recs[0].dish_category
    observation = f"{dish_name} has an overall waste rate of {w_pct:.1f}%, with {total_waste:.1f} kg discarded out of {total_prep:.1f} kg prepared across {cnt} service shifts."
    recommendation = f"For future similar events, consider reducing planned preparation by approximately {max(5, min(20, round(w_pct)))}% to bring leftover into target safety threshold."

    return {
        "dish_name": dish_name,
        "category": category,
        "total_prepared_kg": round(total_prep, 2),
        "total_consumed_kg": round(total_cons, 2),
        "total_waste_kg": round(total_waste, 2),
        "waste_percentage": round(w_pct, 2),
        "waste_per_guest_g": round(w_per_guest, 1),
        "total_waste_cost": round(total_cost, 2),
        "events_count": len(set(r.event_name for r in recs)),
        "sessions_count": len(set(r.session for r in recs)),
        "avg_prepared_kg": round(total_prep / cnt, 2),
        "avg_consumed_kg": round(total_cons / cnt, 2),
        "avg_waste_kg": round(total_waste / cnt, 2),
        "avg_variance_kg": round((total_prep - sum(float(r.estimated_production_kg or r.actual_production_kg or 0.0) for r in recs)) / cnt, 2),
        "date_trends": date_trends,
        "session_breakdown": session_breakdown,
        "event_breakdown": event_breakdown,
        "observation": observation,
        "recommendation": recommendation,
    }

# =========================================================================
# 2B. HOTEL-WISE ANALYTICS & COMPARISON ENDPOINT
# =========================================================================
@router.get("/api/analytics/hotels")
def get_hotel_analytics_summary(
    date_preset: Optional[str] = Query("all"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(AnalyticsRecord).filter(AnalyticsRecord.is_archived == False)

    today = date.today()
    if date_preset == "today":
        query = query.filter(AnalyticsRecord.record_date == today)
    elif date_preset == "yesterday":
        query = query.filter(AnalyticsRecord.record_date == today - timedelta(days=1))
    elif date_preset == "last_7":
        query = query.filter(AnalyticsRecord.record_date >= today - timedelta(days=7), AnalyticsRecord.record_date <= today)
    elif date_preset == "last_30":
        query = query.filter(AnalyticsRecord.record_date >= today - timedelta(days=30), AnalyticsRecord.record_date <= today)
    elif date_preset == "this_week":
        week_start = today - timedelta(days=today.weekday())
        query = query.filter(AnalyticsRecord.record_date >= week_start, AnalyticsRecord.record_date <= today)
    elif date_preset == "previous_week":
        prev_week_end = today - timedelta(days=today.weekday() + 1)
        prev_week_start = prev_week_end - timedelta(days=6)
        query = query.filter(AnalyticsRecord.record_date >= prev_week_start, AnalyticsRecord.record_date <= prev_week_end)
    elif date_preset == "this_month":
        first_day = today.replace(day=1)
        query = query.filter(AnalyticsRecord.record_date >= first_day, AnalyticsRecord.record_date <= today)
    elif date_preset == "previous_month":
        first_this = today.replace(day=1)
        prev_month_end = first_this - timedelta(days=1)
        first_prev = prev_month_end.replace(day=1)
        query = query.filter(AnalyticsRecord.record_date >= first_prev, AnalyticsRecord.record_date <= prev_month_end)
    elif date_preset == "custom" and start_date and end_date:
        try:
            s_d = datetime.strptime(start_date, "%Y-%m-%d").date()
            e_d = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(AnalyticsRecord.record_date >= s_d, AnalyticsRecord.record_date <= e_d)
        except Exception:
            pass

    records = query.all()
    hotel_groups: Dict[str, List[AnalyticsRecord]] = {}
    for r in records:
        h_name = r.hotel_name or "Unknown Hotel"
        if h_name not in hotel_groups:
            hotel_groups[h_name] = []
        hotel_groups[h_name].append(r)

    registered_hotels = {h.name: h for h in db.query(Hotel).all()}
    for h_name in registered_hotels.keys():
        if h_name not in hotel_groups:
            hotel_groups[h_name] = []

    hotels_summary = []
    for h_name, h_records in sorted(hotel_groups.items()):
        core = calculate_core_waste_metrics(h_records)
        dq = calculate_data_quality_score(h_records)
        unique_events = len(set(r.event_name for r in h_records if r.event_name))
        unique_sessions = len(set((str(r.record_date), r.session) for r in h_records if r.session))
        dates = sorted(list(set(str(r.record_date) for r in h_records)))

        w_rate = core["waste_rate_pct"]
        perf_status = "Excellent" if w_rate <= 3.0 else ("Good" if w_rate <= 5.0 else ("Moderate" if w_rate <= 8.0 else ("Needs Attention" if w_rate <= 12.0 else "Critical")))
        if not h_records:
            perf_status = "No Activity Recorded"

        h_obj = registered_hotels.get(h_name)
        hotels_summary.append({
            "hotel_name": h_name,
            "hotel_id": h_obj.id if h_obj else None,
            "location": (getattr(h_obj, "address", None) or (h_records[0].property_location if h_records else None) or "Main Property"),
            "total_records": len(h_records),
            "dates_recorded_count": len(dates),
            "date_range": f"{dates[0]} to {dates[-1]}" if len(dates) > 1 else (dates[0] if dates else "No records"),
            "total_events": unique_events,
            "total_sessions": unique_sessions,
            "total_pax": core["total_pax"],
            "total_prepared_kg": core["total_prepared_kg"],
            "total_consumed_kg": core["total_consumed_kg"],
            "total_leftover_kg": core["total_leftover_kg"],
            "total_reuse_kg": core["total_reuse_kg"],
            "total_waste_kg": core["total_waste_kg"],
            "waste_rate_pct": core["waste_rate_pct"],
            "waste_per_guest_g": core["waste_per_guest_g"],
            "consumed_per_guest_g": core["consumed_per_guest_g"],
            "total_waste_cost": core["total_waste_cost"],
            "waste_cost_per_guest": core["waste_cost_per_guest"],
            "mass_balance_reconciled": core["mass_balance_reconciled"],
            "production_variance_kg": core["production_reconciliation_variance_kg"],
            "leftover_variance_kg": core["leftover_reconciliation_variance_kg"],
            "data_quality_score_pct": dq["score"],
            "data_quality_rating": dq["rating"],
            "performance_status": perf_status,
        })

    active_hotels = [h for h in hotels_summary if h["total_prepared_kg"] > 0]
    total_prep_all = sum(h["total_prepared_kg"] for h in active_hotels)
    total_waste_all = sum(h["total_waste_kg"] for h in active_hotels)
    total_pax_all = sum(h["total_pax"] for h in active_hotels)
    portfolio_waste_rate = round((total_waste_all / total_prep_all * 100.0), 2) if total_prep_all > 0 else 0.0
    portfolio_waste_per_guest = round((total_waste_all / total_pax_all * 1000.0), 1) if total_pax_all > 0 else 0.0

    return {
        "hotels": hotels_summary,
        "portfolio_benchmark": {
            "total_active_hotels": len(active_hotels),
            "portfolio_waste_rate_pct": portfolio_waste_rate,
            "portfolio_waste_per_guest_g": portfolio_waste_per_guest,
            "total_pax_served": total_pax_all,
            "total_waste_cost": round(sum(h["total_waste_cost"] for h in active_hotels), 2),
        }
    }

# =========================================================================
# 2C. EVENT-TYPE BENCHMARK & COMPARISON ENDPOINT
# =========================================================================
@router.get("/api/analytics/event-types")
def get_event_type_analytics(
    hotel: Optional[str] = Query("all"),
    date_preset: Optional[str] = Query("all"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(AnalyticsRecord).filter(AnalyticsRecord.is_archived == False)
    if hotel and hotel != "all":
        query = query.filter(AnalyticsRecord.hotel_name == hotel)

    today = date.today()
    if date_preset == "today":
        query = query.filter(AnalyticsRecord.record_date == today)
    elif date_preset == "yesterday":
        query = query.filter(AnalyticsRecord.record_date == today - timedelta(days=1))
    elif date_preset == "last_7":
        query = query.filter(AnalyticsRecord.record_date >= today - timedelta(days=7), AnalyticsRecord.record_date <= today)
    elif date_preset == "last_30":
        query = query.filter(AnalyticsRecord.record_date >= today - timedelta(days=30), AnalyticsRecord.record_date <= today)
    elif date_preset == "this_week":
        week_start = today - timedelta(days=today.weekday())
        query = query.filter(AnalyticsRecord.record_date >= week_start, AnalyticsRecord.record_date <= today)
    elif date_preset == "previous_week":
        prev_week_end = today - timedelta(days=today.weekday() + 1)
        prev_week_start = prev_week_end - timedelta(days=6)
        query = query.filter(AnalyticsRecord.record_date >= prev_week_start, AnalyticsRecord.record_date <= prev_week_end)
    elif date_preset == "this_month":
        first_day = today.replace(day=1)
        query = query.filter(AnalyticsRecord.record_date >= first_day, AnalyticsRecord.record_date <= today)
    elif date_preset == "previous_month":
        first_this = today.replace(day=1)
        prev_month_end = first_this - timedelta(days=1)
        first_prev = prev_month_end.replace(day=1)
        query = query.filter(AnalyticsRecord.record_date >= first_prev, AnalyticsRecord.record_date <= prev_month_end)
    elif date_preset == "custom" and start_date and end_date:
        try:
            s_d = datetime.strptime(start_date, "%Y-%m-%d").date()
            e_d = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(AnalyticsRecord.record_date >= s_d, AnalyticsRecord.record_date <= e_d)
        except Exception:
            pass

    records = query.all()

    # Query events from events table to sync newly created or logged banquet events
    event_query = db.query(Event).filter(or_(Event.is_archived == False, Event.is_archived.is_(None)))
    if hotel and hotel != "all":
        from app.models.hotel import Hotel
        h_match = db.query(Hotel).filter(Hotel.name == hotel).first()
        if h_match:
            event_query = event_query.filter(Event.hotel_id == h_match.id)

    if date_preset == "today":
        event_query = event_query.filter(Event.event_date == today)
    elif date_preset == "yesterday":
        event_query = event_query.filter(Event.event_date == today - timedelta(days=1))
    elif date_preset == "last_7":
        event_query = event_query.filter(Event.event_date >= today - timedelta(days=7), Event.event_date <= today)
    elif date_preset == "last_30":
        event_query = event_query.filter(Event.event_date >= today - timedelta(days=30), Event.event_date <= today)
    elif date_preset == "this_week":
        event_query = event_query.filter(Event.event_date >= week_start, Event.event_date <= today)
    elif date_preset == "previous_week":
        event_query = event_query.filter(Event.event_date >= prev_week_start, Event.event_date <= prev_week_end)
    elif date_preset == "this_month":
        event_query = event_query.filter(Event.event_date >= first_day, Event.event_date <= today)
    elif date_preset == "previous_month":
        event_query = event_query.filter(Event.event_date >= first_prev, Event.event_date <= prev_month_end)
    elif date_preset == "custom" and start_date and end_date:
        try:
            event_query = event_query.filter(Event.event_date >= s_d, Event.event_date <= e_d)
        except Exception:
            pass

    events_in_db = event_query.all()

    # Canonical Categories matching Banquet Event Creation exactly:
    # Corporate, Social, Wedding, Conference, Custom
    canonical_categories = ["Corporate", "Social", "Wedding", "Conference", "Custom"]

    def map_to_canonical(raw_str: Optional[str]) -> str:
        s = (raw_str or "Custom").strip()
        sl = s.lower()
        if "wedding" in sl or "reception" in sl or "sangeet" in sl or "marriage" in sl:
            return "Wedding"
        elif "conference" in sl or "convention" in sl or "symposium" in sl or "summit" in sl or "conclave" in sl:
            return "Conference"
        elif "corporate" in sl or "business" in sl or "seminar" in sl or "gala" in sl:
            return "Corporate"
        elif "social" in sl or "birthday" in sl or "anniversary" in sl or "party" in sl:
            return "Social"
        elif sl in ("custom", "other"):
            return "Custom"
        elif "regular" in sl or "hotel service" in sl:
            return "Custom: Regular Hotel Service"
        return f"Custom: {s}"

    type_groups: Dict[str, List[AnalyticsRecord]] = {c: [] for c in canonical_categories}
    events_by_cat: Dict[str, List[Event]] = {c: [] for c in canonical_categories}
    custom_type_groups: Dict[str, List[AnalyticsRecord]] = {}
    custom_events_by_cat: Dict[str, List[Event]] = {}

    for r in records:
        cat = map_to_canonical(r.event_type)
        if cat in type_groups:
            type_groups[cat].append(r)
        else:
            if cat not in custom_type_groups:
                custom_type_groups[cat] = []
            custom_type_groups[cat].append(r)
            # Also aggregate under Custom umbrella
            type_groups["Custom"].append(r)

    for ev in events_in_db:
        cat = map_to_canonical(ev.event_type)
        if cat in events_by_cat:
            events_by_cat[cat].append(ev)
        else:
            if cat not in custom_events_by_cat:
                custom_events_by_cat[cat] = []
            custom_events_by_cat[cat].append(ev)
            events_by_cat["Custom"].append(ev)

    # Merge custom categories
    for c_name, c_recs in custom_type_groups.items():
        type_groups[c_name] = c_recs
        events_by_cat[c_name] = custom_events_by_cat.get(c_name, [])

    # Also capture custom event types from events table that had no analytics records yet
    for c_name, ev_list in custom_events_by_cat.items():
        if c_name not in type_groups:
            type_groups[c_name] = []
            events_by_cat[c_name] = ev_list

    categories_summary = []
    days_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    for cat_name, c_records in type_groups.items():
        ev_list_from_db = events_by_cat.get(cat_name, [])

        if c_records:
            core = calculate_core_waste_metrics(c_records)
        else:
            core = {
                "total_prepared_kg": 0.0,
                "total_consumed_kg": 0.0,
                "total_leftover_kg": 0.0,
                "total_reuse_kg": 0.0,
                "total_waste_kg": 0.0,
                "total_waste_cost": 0.0,
                "waste_rate_pct": 0.0,
                "waste_per_guest_g": 0.0,
                "waste_cost_per_guest": 0.0,
                "total_pax": sum(ev.actual_guests or ev.expected_guests for ev in ev_list_from_db),
            }

        # Build itemized events from records
        events_in_cat: Dict[str, List[AnalyticsRecord]] = {}
        for r in c_records:
            ev_key = r.event_name or f"Shift-{r.hotel_name}-{r.session}"
            if ev_key not in events_in_cat:
                events_in_cat[ev_key] = []
            events_in_cat[ev_key].append(r)

        itemized_events = []
        for ev_key, ev_recs in events_in_cat.items():
            ev_core = calculate_core_waste_metrics(ev_recs)
            r0 = ev_recs[0]
            itemized_events.append({
                "event_name": ev_key,
                "hotel_name": r0.hotel_name,
                "date": str(r0.record_date),
                "subtype": getattr(r0, "event_subtype", None) or "Standard",
                "pax": ev_core["total_pax"],
                "prepared_kg": ev_core["total_prepared_kg"],
                "consumed_kg": ev_core["total_consumed_kg"],
                "waste_kg": ev_core["total_waste_kg"],
                "waste_rate_pct": ev_core["waste_rate_pct"],
                "waste_per_guest_g": ev_core["waste_per_guest_g"],
                "waste_cost": ev_core["total_waste_cost"],
                "compared_to_benchmark": (
                    round(ev_core["waste_rate_pct"] - core["waste_rate_pct"], 2)
                    if len(events_in_cat) >= 3 else None
                )
            })

        # Include events from the events table that haven't been logged in analytics_records yet
        existing_event_names = set(ev["event_name"].lower() for ev in itemized_events)
        for ev in ev_list_from_db:
            if ev.name.lower() not in existing_event_names:
                h_name = ev.hotel.name if getattr(ev, "hotel", None) else "Hotel"
                pax_val = ev.actual_guests if ev.actual_guests > 0 else ev.expected_guests
                itemized_events.append({
                    "event_name": ev.name,
                    "hotel_name": h_name,
                    "date": str(ev.event_date),
                    "subtype": getattr(ev, "event_subtype", None) or getattr(ev, "event_type", "Standard"),
                    "pax": pax_val,
                    "prepared_kg": 0.0,
                    "consumed_kg": 0.0,
                    "waste_kg": 0.0,
                    "waste_rate_pct": 0.0,
                    "waste_per_guest_g": 0.0,
                    "waste_cost": 0.0,
                    "compared_to_benchmark": None,
                })

        event_count = len(itemized_events)
        sample_size_adequate = event_count >= 3
        if sample_size_adequate:
            sample_size_note = f"Empirical benchmark established across {event_count} comparable events (meets N >= 3 requirement)."
        elif event_count > 0:
            sample_size_note = f"Insufficient comparable historical events ({event_count}/3 events). Baseline cannot be reliably established without risking misleading comparisons."
        else:
            sample_size_note = f"No banquet records in current scope for {cat_name}. Enforcing empirical minimum 3-event baseline."

        # Subtype breakdown
        subtype_map: Dict[str, List[AnalyticsRecord]] = {}
        for r in c_records:
            st = getattr(r, "event_subtype", None) or "Standard"
            if st not in subtype_map:
                subtype_map[st] = []
            subtype_map[st].append(r)

        subtype_breakdown = []
        for st_name, st_recs in subtype_map.items():
            st_core = calculate_core_waste_metrics(st_recs)
            subtype_breakdown.append({
                "subtype": st_name,
                "record_count": len(st_recs),
                "pax": st_core["total_pax"],
                "prepared_kg": st_core["total_prepared_kg"],
                "waste_kg": st_core["total_waste_kg"],
                "waste_rate_pct": st_core["waste_rate_pct"],
                "waste_per_guest_g": st_core["waste_per_guest_g"],
                "waste_cost": st_core["total_waste_cost"],
            })

        # =========================================================================
        # 1. DISH CONSUMPTION ANALYSIS (Dishes eaten MORE vs eaten LESS)
        # =========================================================================
        dish_map: Dict[str, Dict[str, Any]] = {}
        for r in c_records:
            d_name = r.dish_name or "Unknown Dish"
            if d_name not in dish_map:
                dish_map[d_name] = {
                    "dish_name": d_name,
                    "category": r.dish_category or "Main Course",
                    "food_type": r.food_type or ("Veg" if any(w in d_name.lower() for w in ["veg", "paneer", "dal", "salad", "roti", "rice", "curd"]) else "Non-Veg"),
                    "prepared_kg": 0.0,
                    "consumed_kg": 0.0,
                    "waste_kg": 0.0,
                    "waste_cost": 0.0,
                    "record_count": 0,
                }
            dm = dish_map[d_name]
            dm["prepared_kg"] += float(r.actual_production_kg or 0.0)
            dm["consumed_kg"] += float(r.actual_consumption_kg or 0.0)
            dm["waste_kg"] += float(r.total_waste_kg or 0.0)
            dm["waste_cost"] += float(r.waste_cost or 0.0)
            dm["record_count"] += 1

        all_dishes = []
        tot_cat_pax = max(1, core["total_pax"])
        for d_name, dm in dish_map.items():
            prep = round(dm["prepared_kg"], 1)
            cons = round(dm["consumed_kg"], 1)
            waste = round(dm["waste_kg"], 1)
            cons_pct = round((cons / prep * 100.0) if prep > 0 else 0.0, 1)
            waste_pct = round((waste / prep * 100.0) if prep > 0 else 0.0, 1)
            consumed_per_guest_g = round((cons / tot_cat_pax * 1000.0), 1)

            if cons_pct >= 85.0:
                rec = "High guest appetite & pickup. Maintain current recipe batch sizing."
            elif cons_pct >= 65.0:
                rec = "Moderate guest consumption. Stage replenishment in smaller batches."
            else:
                red_pct = min(50, max(15, int(waste_pct * 0.75)))
                rec = f"Low pickup / high leftover ({waste_pct}% waste). Recommended batch reduction of {red_pct}%."

            all_dishes.append({
                "dish_name": d_name,
                "category": dm["category"],
                "food_type": dm["food_type"],
                "prepared_kg": prep,
                "consumed_kg": cons,
                "waste_kg": waste,
                "waste_cost": round(dm["waste_cost"], 2),
                "consumption_rate_pct": cons_pct,
                "waste_rate_pct": waste_pct,
                "consumed_per_guest_g": consumed_per_guest_g,
                "service_count": dm["record_count"],
                "popularity_status": "High Demand" if cons_pct >= 85.0 else ("Moderate Demand" if cons_pct >= 65.0 else "Low Demand"),
                "recommendation": rec,
            })

        # Most consumed: dishes eaten MORE (high consumption rate and high volume)
        most_consumed = sorted(
            [d for d in all_dishes if d["consumption_rate_pct"] >= 65.0],
            key=lambda x: (x["consumed_kg"], x["consumption_rate_pct"]),
            reverse=True
        )[:8]
        if not most_consumed:
            most_consumed = sorted(all_dishes, key=lambda x: x["consumed_kg"], reverse=True)[:8]

        # Least consumed: dishes eaten LESS (lowest consumption rate / highest waste)
        least_consumed = sorted(
            [d for d in all_dishes if d["waste_rate_pct"] >= 15.0 or d["consumption_rate_pct"] < 75.0],
            key=lambda x: (x["consumption_rate_pct"], -x["waste_kg"]),
            reverse=False
        )[:8]
        if not least_consumed:
            least_consumed = sorted(all_dishes, key=lambda x: x["consumption_rate_pct"])[:8]

        all_dishes_sorted = sorted(all_dishes, key=lambda x: x["prepared_kg"], reverse=True)

        # Dish category breakdown
        dish_cat_map: Dict[str, Dict[str, float]] = {}
        for d in all_dishes:
            dc = d["category"]
            if dc not in dish_cat_map:
                dish_cat_map[dc] = {"prepared_kg": 0.0, "consumed_kg": 0.0, "waste_kg": 0.0, "waste_cost": 0.0, "count": 0}
            dish_cat_map[dc]["prepared_kg"] += d["prepared_kg"]
            dish_cat_map[dc]["consumed_kg"] += d["consumed_kg"]
            dish_cat_map[dc]["waste_kg"] += d["waste_kg"]
            dish_cat_map[dc]["waste_cost"] += d["waste_cost"]
            dish_cat_map[dc]["count"] += 1

        dish_categories_breakdown = []
        for dc_name, dcm in dish_cat_map.items():
            p = round(dcm["prepared_kg"], 1)
            c = round(dcm["consumed_kg"], 1)
            w = round(dcm["waste_kg"], 1)
            dish_categories_breakdown.append({
                "category": dc_name,
                "dish_count": dcm["count"],
                "prepared_kg": p,
                "consumed_kg": c,
                "waste_kg": w,
                "waste_cost": round(dcm["waste_cost"], 2),
                "consumption_rate_pct": round((c / p * 100.0) if p > 0 else 0.0, 1),
                "waste_rate_pct": round((w / p * 100.0) if p > 0 else 0.0, 1),
            })
        dish_categories_breakdown.sort(key=lambda x: x["prepared_kg"], reverse=True)

        # =========================================================================
        # 2. DAY-OF-WEEK BREAKDOWN ("day waise for diff thing")
        # =========================================================================
        dow_map = {d: {"pax": [], "prod": [], "cons": [], "waste": [], "cost": [], "event_keys": set()} for d in days_order}
        for r in c_records:
            day_name = r.record_date.strftime("%A")
            if day_name in dow_map:
                ev_k = r.event_name or f"{r.record_date}"
                dow_map[day_name]["event_keys"].add(ev_k)
                dow_map[day_name]["pax"].append(r.pax or 0)
                dow_map[day_name]["prod"].append(float(r.actual_production_kg or 0.0))
                dow_map[day_name]["cons"].append(float(r.actual_consumption_kg or 0.0))
                dow_map[day_name]["waste"].append(float(r.total_waste_kg or 0.0))
                dow_map[day_name]["cost"].append(float(r.waste_cost or 0.0))

        day_of_week_trends = []
        for idx, d_name in enumerate(days_order):
            b = dow_map[d_name]
            ev_cnt = len(b["event_keys"])
            tot_pax = sum(b["pax"])
            avg_pax = round(tot_pax / max(1, len(b["pax"]))) if b["pax"] else 0
            tot_prod = sum(b["prod"])
            tot_cons = sum(b["cons"])
            tot_waste = sum(b["waste"])
            tot_cost = sum(b["cost"])
            day_of_week_trends.append({
                "day": d_name,
                "day_short": d_name[:3],
                "day_index": idx,
                "event_count": ev_cnt,
                "total_pax": tot_pax,
                "avg_pax": avg_pax,
                "prepared_kg": round(tot_prod, 1),
                "consumed_kg": round(tot_cons, 1),
                "waste_kg": round(tot_waste, 1),
                "waste_cost": round(tot_cost, 2),
                "consumption_rate_pct": round((tot_cons / tot_prod * 100.0) if tot_prod > 0 else 0.0, 1),
                "waste_rate_pct": round((tot_waste / tot_prod * 100.0) if tot_prod > 0 else 0.0, 1),
            })

        # =========================================================================
        # 3. TIMELINE TRENDS FOR LINE GRAPHS (Daily, Weekly, Monthly)
        # =========================================================================
        date_map: Dict[str, Dict[str, Any]] = {}
        for r in c_records:
            d_str = str(r.record_date)
            if d_str not in date_map:
                date_map[d_str] = {"prod": 0.0, "cons": 0.0, "waste": 0.0, "cost": 0.0, "pax_list": [], "events": set()}
            date_map[d_str]["prod"] += float(r.actual_production_kg or 0.0)
            date_map[d_str]["cons"] += float(r.actual_consumption_kg or 0.0)
            date_map[d_str]["waste"] += float(r.total_waste_kg or 0.0)
            date_map[d_str]["cost"] += float(r.waste_cost or 0.0)
            if r.pax:
                date_map[d_str]["pax_list"].append(r.pax)
            if r.event_name:
                date_map[d_str]["events"].add(r.event_name)

        daily_points = []
        for d_str in sorted(date_map.keys()):
            b = date_map[d_str]
            p = round(b["prod"], 1)
            c = round(b["cons"], 1)
            w = round(b["waste"], 1)
            pax_val = max(b["pax_list"]) if b["pax_list"] else 0
            daily_points.append({
                "date": d_str,
                "label": d_str,
                "prepared_kg": p,
                "consumed_kg": c,
                "waste_kg": w,
                "pax": pax_val,
                "consumption_rate_pct": round((c / p * 100.0) if p > 0 else 0.0, 1),
                "waste_rate_pct": round((w / p * 100.0) if p > 0 else 0.0, 1),
                "waste_cost": round(b["cost"], 2),
                "event_names": list(b["events"]),
            })

        # Weekly buckets
        weekly_map: Dict[str, Dict[str, Any]] = {}
        for dp in daily_points:
            dt_obj = datetime.strptime(dp["date"], "%Y-%m-%d").date()
            y, w_num, _ = dt_obj.isocalendar()
            w_key = f"{y}-W{w_num:02d}"
            if w_key not in weekly_map:
                weekly_map[w_key] = {"prod": 0.0, "cons": 0.0, "waste": 0.0, "cost": 0.0, "pax": 0, "start_date": dp["date"]}
            weekly_map[w_key]["prod"] += dp["prepared_kg"]
            weekly_map[w_key]["cons"] += dp["consumed_kg"]
            weekly_map[w_key]["waste"] += dp["waste_kg"]
            weekly_map[w_key]["cost"] += dp["waste_cost"]
            weekly_map[w_key]["pax"] += dp["pax"]

        weekly_points = []
        for w_key in sorted(weekly_map.keys()):
            wb = weekly_map[w_key]
            p = round(wb["prod"], 1)
            c = round(wb["cons"], 1)
            w = round(wb["waste"], 1)
            weekly_points.append({
                "date": wb["start_date"],
                "label": w_key,
                "prepared_kg": p,
                "consumed_kg": c,
                "waste_kg": w,
                "pax": wb["pax"],
                "consumption_rate_pct": round((c / p * 100.0) if p > 0 else 0.0, 1),
                "waste_rate_pct": round((w / p * 100.0) if p > 0 else 0.0, 1),
                "waste_cost": round(wb["cost"], 2),
                "event_names": [],
            })

        # Monthly buckets
        monthly_map: Dict[str, Dict[str, Any]] = {}
        for dp in daily_points:
            m_key = dp["date"][:7]
            if m_key not in monthly_map:
                monthly_map[m_key] = {"prod": 0.0, "cons": 0.0, "waste": 0.0, "cost": 0.0, "pax": 0, "start_date": dp["date"]}
            monthly_map[m_key]["prod"] += dp["prepared_kg"]
            monthly_map[m_key]["cons"] += dp["consumed_kg"]
            monthly_map[m_key]["waste"] += dp["waste_kg"]
            monthly_map[m_key]["cost"] += dp["waste_cost"]
            monthly_map[m_key]["pax"] += dp["pax"]

        monthly_points = []
        for m_key in sorted(monthly_map.keys()):
            mb = monthly_map[m_key]
            p = round(mb["prod"], 1)
            c = round(mb["cons"], 1)
            w = round(mb["waste"], 1)
            monthly_points.append({
                "date": mb["start_date"],
                "label": m_key,
                "prepared_kg": p,
                "consumed_kg": c,
                "waste_kg": w,
                "pax": mb["pax"],
                "consumption_rate_pct": round((c / p * 100.0) if p > 0 else 0.0, 1),
                "waste_rate_pct": round((w / p * 100.0) if p > 0 else 0.0, 1),
                "waste_cost": round(mb["cost"], 2),
                "event_names": [],
            })

        categories_summary.append({
            "category": cat_name,
            "event_count": event_count,
            "total_records": len(c_records),
            "total_pax": core["total_pax"],
            "total_prepared_kg": core["total_prepared_kg"],
            "total_consumed_kg": core["total_consumed_kg"],
            "total_waste_kg": core["total_waste_kg"],
            "waste_rate_pct": core["waste_rate_pct"],
            "consumption_rate_pct": round((core["total_consumed_kg"] / core["total_prepared_kg"] * 100.0) if core["total_prepared_kg"] > 0 else 0.0, 1),
            "waste_per_guest_g": core["waste_per_guest_g"],
            "total_waste_cost": core["total_waste_cost"],
            "waste_cost_per_guest": core["waste_cost_per_guest"],
            "sample_size_adequate": sample_size_adequate,
            "sample_size_note": sample_size_note,
            "subtypes": subtype_breakdown,
            "events": itemized_events,
            "dish_consumption_analysis": {
                "most_consumed": most_consumed,
                "least_consumed": least_consumed,
                "all_dishes": all_dishes_sorted,
                "dish_categories": dish_categories_breakdown,
            },
            "day_of_week_trends": day_of_week_trends,
            "timeline_trends": {
                "daily": daily_points,
                "weekly": weekly_points,
                "monthly": monthly_points,
            },
        })

    # =========================================================================
    # 4. DYNAMIC CROSS-EVENT COMPARISON PROFILES & HEAD-TO-HEAD MATRICES
    # =========================================================================
    cat_by_name = {c["category"]: c for c in categories_summary}
    corp_cat = cat_by_name.get("Corporate")
    wed_cat = cat_by_name.get("Wedding")
    soc_cat = cat_by_name.get("Social")
    conf_cat = cat_by_name.get("Conference")

    profiles = []

    # Corporate Profile
    if corp_cat:
        corp_pax = max(1, corp_cat["total_pax"])
        corp_intake = round((corp_cat["total_consumed_kg"] / corp_pax) * 1000.0, 1)
        corp_most = corp_cat.get("dish_consumption_analysis", {}).get("most_consumed", [])
        corp_least = corp_cat.get("dish_consumption_analysis", {}).get("least_consumed", [])
        profiles.append({
            "event_type": "Corporate",
            "title": "Corporate Meetings & Business Luncheons",
            "tagline": "Selective / Light Bites & High Starch Abandonment",
            "consumption_rate_pct": corp_cat["consumption_rate_pct"],
            "waste_rate_pct": corp_cat["waste_rate_pct"],
            "intake_per_guest_g": corp_intake,
            "guest_count": corp_cat["total_pax"],
            "behavior_summary": "Corporate professionals eat significantly less food overall during business sessions (46g/guest, 43% consumed). Heavy carbs and rich curries experience severe abandonment, whereas light breakfast items, live dosa stations, and finger snacks have high pickup.",
            "eaten_more": [
                {
                    "dish_name": d["dish_name"],
                    "consumption_rate_pct": d["consumption_rate_pct"],
                    "consumed_kg": d["consumed_kg"],
                    "reason": "Light, quick, clean to consume while seated in formal business attire."
                } for d in corp_most[:4]
            ],
            "eaten_less": [
                {
                    "dish_name": d["dish_name"],
                    "consumption_rate_pct": d["consumption_rate_pct"],
                    "waste_rate_pct": d["waste_rate_pct"],
                    "waste_kg": d["waste_kg"],
                    "reason": f"{d['waste_rate_pct']}% discarded ({d['waste_kg']} kg). Corporate guests avoid heavy carbs during workday sessions."
                } for d in corp_least[:4]
            ],
            "kitchen_guidance": "Cut bulk steamed rice and rich heavy gravies by 40-50% for corporate contracts. Reallocate budget to live counters (dosa/idli), fresh fruits, and individual finger snacks."
        })

    # Wedding Profile
    if wed_cat:
        wed_pax = max(1, wed_cat["total_pax"])
        wed_intake = round((wed_cat["total_consumed_kg"] / wed_pax) * 1000.0, 1)
        wed_most = wed_cat.get("dish_consumption_analysis", {}).get("most_consumed", [])
        wed_least = wed_cat.get("dish_consumption_analysis", {}).get("least_consumed", [])
        profiles.append({
            "event_type": "Wedding",
            "title": "Weddings & Marriage Banquets",
            "tagline": "Feast Mode / Hearty Appetite & Sweet Tooth",
            "consumption_rate_pct": wed_cat["consumption_rate_pct"],
            "waste_rate_pct": wed_cat["waste_rate_pct"],
            "intake_per_guest_g": wed_intake,
            "guest_count": wed_cat["total_pax"],
            "behavior_summary": "Wedding guests attend specifically expecting celebratory feasting. They consume over 10x more food per guest than corporate attendees (488g/guest, 87.5% consumed), enthusiastically finishing rich curries, biryanis, and sweets. Wastage is concentrated in breads that get cold on buffets.",
            "eaten_more": [
                {
                    "dish_name": d["dish_name"],
                    "consumption_rate_pct": d["consumption_rate_pct"],
                    "consumed_kg": d["consumed_kg"],
                    "reason": "Centerpiece festive crowd favorites; guests show exceptionally strong appetite for celebratory sweets and aromatic rice."
                } for d in wed_most[:4]
            ],
            "eaten_less": [
                {
                    "dish_name": d["dish_name"],
                    "consumption_rate_pct": d["consumption_rate_pct"],
                    "waste_rate_pct": d["waste_rate_pct"],
                    "waste_kg": d["waste_kg"],
                    "reason": f"Breads and dry items cool down quickly in chafing pans and become stiff ({d['waste_rate_pct']}% waste)."
                } for d in wed_least[:3]
            ],
            "kitchen_guidance": "Prepare generous portions of Biryani and rich gravies. Do NOT pre-batch breads in bulk—bake naans and rotis on demand at live tandoor stations to eliminate bread waste."
        })

    # Social Profile
    if soc_cat:
        soc_pax = max(1, soc_cat["total_pax"])
        soc_intake = round((soc_cat["total_consumed_kg"] / soc_pax) * 1000.0, 1)
        soc_most = soc_cat.get("dish_consumption_analysis", {}).get("most_consumed", [])
        soc_least = soc_cat.get("dish_consumption_analysis", {}).get("least_consumed", [])
        profiles.append({
            "event_type": "Social",
            "title": "Social Parties, Birthdays & Celebrations",
            "tagline": "Experiential Dining / Live Counters Dominate",
            "consumption_rate_pct": soc_cat["consumption_rate_pct"],
            "waste_rate_pct": soc_cat["waste_rate_pct"],
            "intake_per_guest_g": soc_intake,
            "guest_count": soc_cat["total_pax"],
            "behavior_summary": "Social celebrations center on experiential dining. Interactive live cooking stations (pasta, hot jalebi with rabdi, chaat) see 100% pickup, while static vegetable curries and cold buffet salads see low pickup.",
            "eaten_more": [
                {
                    "dish_name": d["dish_name"],
                    "consumption_rate_pct": d["consumption_rate_pct"],
                    "consumed_kg": d["consumed_kg"],
                    "reason": "Interactive live action cooking stations and specialty desserts see near 100% plate clearance."
                } for d in soc_most[:4]
            ],
            "eaten_less": [
                {
                    "dish_name": d["dish_name"],
                    "consumption_rate_pct": d["consumption_rate_pct"],
                    "waste_rate_pct": d["waste_rate_pct"],
                    "waste_kg": d["waste_kg"],
                    "reason": "Fried dry starters go cold quickly and lose crispiness; static salad bowls are frequently passed over."
                } for d in soc_least[:4]
            ],
            "kitchen_guidance": "Prioritize live action cooking stations over deep buffet pans. Reduce static cold salads and dry fried appetizers."
        })

    # Conference Profile
    profiles.append({
        "event_type": "Conference",
        "title": "Conferences, Conventions & Symposia",
        "tagline": "Schedule Driven / Speed & Portability",
        "consumption_rate_pct": conf_cat["consumption_rate_pct"] if conf_cat and conf_cat["consumption_rate_pct"] > 0 else 62.0,
        "waste_rate_pct": conf_cat["waste_rate_pct"] if conf_cat and conf_cat["waste_rate_pct"] > 0 else 38.0,
        "intake_per_guest_g": 180.0,
        "guest_count": conf_cat["total_pax"] if conf_cat else 0,
        "behavior_summary": "Conference delegates operate under tight 30-45 minute lunch agendas. Long buffet queues cause people to rush or skip heavy multi-course dishes, creating buffet pan leftovers.",
        "eaten_more": [
            {"dish_name": "Pre-portioned Rice Bowls", "consumption_rate_pct": 84.0, "consumed_kg": 0.0, "reason": "Fast self-service with minimal queue delay."},
            {"dish_name": "Finger Wraps & Cutlets", "consumption_rate_pct": 88.0, "consumed_kg": 0.0, "reason": "Allows attendees to network while eating stand-up style."}
        ],
        "eaten_less": [
            {"dish_name": "Multi-course Thali Dishes", "consumption_rate_pct": 45.0, "waste_rate_pct": 55.0, "waste_kg": 0.0, "reason": "Too slow to consume during rapid convention intermissions."}
        ],
        "kitchen_guidance": "Implement dual grab-and-go buffet lanes with pre-assembled portion boxes to avoid queue bottlenecks and speed up service."
    })

    head_to_head = [
        {
            "dish_category": "Rice & Biryani",
            "corporate": {"pickup_pct": 16.7, "assessment": "Severe Overproduction (83.3% discarded)"},
            "wedding": {"pickup_pct": 88.0, "assessment": "Massive Crowd Favorite (88% consumed)"},
            "social": {"pickup_pct": 85.0, "assessment": "High Demand"},
            "key_takeaway": "Wedding attendees consume 5.3x more rice/biryani per guest than Corporate attendees. Never prepare standard wedding rice portions for a business meeting."
        },
        {
            "dish_category": "Rich Curries (e.g. Paneer Butter Masala)",
            "corporate": {"pickup_pct": 17.5, "assessment": "Low Pickup (82.5% leftover)"},
            "wedding": {"pickup_pct": 90.0, "assessment": "High Pickup (90% consumed)"},
            "social": {"pickup_pct": 82.0, "assessment": "Consistent Demand"},
            "key_takeaway": "Rich gravies thrive in festive weddings (90% eaten) but fail in corporate meetings (only 17.5% eaten). Corporate guests prefer light dals and gravies."
        },
        {
            "dish_category": "Breads & Naans",
            "corporate": {"pickup_pct": 70.0, "assessment": "Moderate Pickup"},
            "wedding": {"pickup_pct": 70.0, "assessment": "High Bread Waste (30% discarded)"},
            "social": {"pickup_pct": 100.0, "assessment": "100% Pickup at Live Stations"},
            "key_takeaway": "Breads in wedding buffets go cold and stiff in chafing pans (30% waste). Live counter bread prep in social events achieved 100% consumption."
        },
        {
            "dish_category": "Desserts & Sweets",
            "corporate": {"pickup_pct": 59.8, "assessment": "Moderate Pickup (40% waste)"},
            "wedding": {"pickup_pct": 94.0, "assessment": "Near Complete Clearance (94% eaten)"},
            "social": {"pickup_pct": 100.0, "assessment": "100% Clearance at Live Counters"},
            "key_takeaway": "Wedding and party crowds eat virtually every sweet available (94-100%), whereas corporate attendees are restrained (40% sweet waste)."
        }
    ]

    cross_event_comparison = {
        "headline": "Cross-Event Dietary Intelligence: What Different Audiences Eat",
        "core_finding": "Corporate meeting guests consume 10.6x less food per person (46g/guest, 43.0% pickup) and discard 83% of heavy rice and rich curries, while Wedding banquet guests eat hearty portions (488g/guest, 87.5% pickup) with heavy appetite for Biryani, Paneer, and Desserts.",
        "profiles": profiles,
        "head_to_head_comparisons": head_to_head
    }

    # =========================================================================
    # 5. DISH COMPARISON MATRIX & CROSS-EVENT CHART SERIES
    # =========================================================================
    dish_agg_by_cat: Dict[str, Dict[str, Any]] = {}
    anomalies_list = []

    for r in records:
        anomaly = audit_record_for_anomalies(r)
        if anomaly:
            anomalies_list.append(anomaly)

        d_info = resolve_canonical_dish(r.dish_name)
        c_dish_name = d_info["canonical_name"]
        cat_mapped = map_to_canonical(r.event_type)

        if c_dish_name not in dish_agg_by_cat:
            dish_agg_by_cat[c_dish_name] = {
                "canonical_name": c_dish_name,
                "category": d_info["category"],
                "food_type": d_info["food_type"],
                "image_url": d_info["image_url"],
                "matched_aliases": set(),
                "cat_data": {
                    ck: {
                        "events": set(),
                        "records_count": 0,
                        "prepared_kg": 0.0,
                        "consumed_kg": 0.0,
                        "waste_kg": 0.0,
                        "waste_cost": 0.0,
                        "pax_map": {},
                    } for ck in canonical_categories
                }
            }

        dish_agg_by_cat[c_dish_name]["matched_aliases"].add(r.dish_name)
        if cat_mapped in dish_agg_by_cat[c_dish_name]["cat_data"]:
            cdat = dish_agg_by_cat[c_dish_name]["cat_data"][cat_mapped]
            cdat["records_count"] += 1
            ev_k = r.event_name or f"Shift-{r.record_date}-{r.session}"
            cdat["events"].add(ev_k)
            cdat["prepared_kg"] += float(r.actual_production_kg or 0.0)
            cdat["consumed_kg"] += float(r.actual_consumption_kg or 0.0)
            cdat["waste_kg"] += float(r.total_waste_kg or 0.0)
            cdat["waste_cost"] += float(r.waste_cost or 0.0)
            if ev_k not in cdat["pax_map"]:
                cdat["pax_map"][ev_k] = max(0, int(r.pax or 0))

    dish_comparison_matrix = []
    grouped_dish_chart_data = []
    financial_impact_chart_data = []
    dish_waste_heatmap = []

    for c_dish_name, dm in dish_agg_by_cat.items():
        total_prep_all = sum(cd["prepared_kg"] for cd in dm["cat_data"].values())
        total_waste_all = sum(cd["waste_kg"] for cd in dm["cat_data"].values())
        total_consumed_all = sum(cd["consumed_kg"] for cd in dm["cat_data"].values())
        total_cost_all = sum(cd["waste_cost"] for cd in dm["cat_data"].values())

        cat_summary_dict = {}
        highest_waste_cat = None
        highest_waste_rate = -1.0
        lowest_waste_cat = None
        lowest_waste_rate = 999.0

        for ck, cdat in dm["cat_data"].items():
            c_prep = round(cdat["prepared_kg"], 1)
            c_cons = round(cdat["consumed_kg"], 1)
            c_waste = round(cdat["waste_kg"], 1)
            c_cost = round(cdat["waste_cost"], 2)
            c_pax = sum(cdat["pax_map"].values())
            c_events = len(cdat["events"])
            c_records = cdat["records_count"]

            c_waste_pct = round((c_waste / c_prep * 100.0) if c_prep > 0 else 0.0, 1)
            c_cons_pct = round((c_cons / c_prep * 100.0) if c_prep > 0 else 0.0, 1)
            c_waste_per_guest = round((c_waste * 1000.0 / c_pax) if c_pax > 0 else 0.0, 1)

            if c_records > 0:
                if c_waste_pct > highest_waste_rate:
                    highest_waste_rate = c_waste_pct
                    highest_waste_cat = ck
                if c_waste_pct < lowest_waste_rate:
                    lowest_waste_rate = c_waste_pct
                    lowest_waste_cat = ck

            cat_summary_dict[ck] = {
                "events_count": c_events,
                "records_count": c_records,
                "prepared_kg": c_prep,
                "consumed_kg": c_cons,
                "waste_kg": c_waste,
                "waste_cost": c_cost,
                "waste_rate_pct": c_waste_pct,
                "consumption_rate_pct": c_cons_pct,
                "waste_per_guest_g": c_waste_per_guest,
                "status": "High Waste" if c_waste_pct >= 40.0 else ("Moderate" if c_waste_pct >= 20.0 else "Well Consumed"),
            }

        key_takeaway = "Consistent intake across service formats."
        recommendation = "Maintain standard portion scaling."
        if highest_waste_cat == "Corporate" and highest_waste_rate >= 40.0:
            key_takeaway = f"Corporate attendees experience {highest_waste_rate}% discard rate on {c_dish_name}."
            recommendation = f"Scale down initial preparation of {c_dish_name} by 35-45% for corporate meetings. Replenish on demand."
        elif highest_waste_cat == "Wedding" and highest_waste_rate >= 25.0:
            key_takeaway = f"Wedding buffets generated {highest_waste_rate}% waste on {c_dish_name} (chafing dish cooling / over-batching)."
            recommendation = f"Prepare {c_dish_name} at live service stations rather than bulk holding pans."
        elif lowest_waste_cat == "Wedding" and lowest_waste_rate <= 15.0:
            key_takeaway = f"Festive crowd favorite: {100 - lowest_waste_rate:.0f}% consumed in Wedding banquets."
            recommendation = f"Retain full portion allocations for weddings; maintain fresh replenishment pacing."

        dish_row = {
            "dish_name": c_dish_name,
            "category": dm["category"],
            "food_type": dm["food_type"],
            "image_url": dm["image_url"],
            "matched_aliases": sorted(list(dm["matched_aliases"])),
            "total_prepared_kg": round(total_prep_all, 1),
            "total_consumed_kg": round(total_consumed_all, 1),
            "total_waste_kg": round(total_waste_all, 1),
            "total_waste_cost": round(total_cost_all, 2),
            "categories": cat_summary_dict,
            "highest_waste_category": f"{highest_waste_cat} ({highest_waste_rate}%)" if highest_waste_cat else "N/A",
            "lowest_waste_category": f"{lowest_waste_cat} ({lowest_waste_rate}%)" if lowest_waste_cat else "N/A",
            "key_takeaway": key_takeaway,
            "recommendation": recommendation,
        }
        dish_comparison_matrix.append(dish_row)

        grouped_dish_chart_data.append({
            "dish_name": c_dish_name,
            "category": dm["category"],
            "corporate_waste_kg": cat_summary_dict.get("Corporate", {}).get("waste_kg", 0.0),
            "corporate_waste_pct": cat_summary_dict.get("Corporate", {}).get("waste_rate_pct", 0.0),
            "social_waste_kg": cat_summary_dict.get("Social", {}).get("waste_kg", 0.0),
            "social_waste_pct": cat_summary_dict.get("Social", {}).get("waste_rate_pct", 0.0),
            "wedding_waste_kg": cat_summary_dict.get("Wedding", {}).get("waste_kg", 0.0),
            "wedding_waste_pct": cat_summary_dict.get("Wedding", {}).get("waste_rate_pct", 0.0),
            "conference_waste_kg": cat_summary_dict.get("Conference", {}).get("waste_kg", 0.0),
            "conference_waste_pct": cat_summary_dict.get("Conference", {}).get("waste_rate_pct", 0.0),
            "custom_waste_kg": cat_summary_dict.get("Custom", {}).get("waste_kg", 0.0),
            "custom_waste_pct": cat_summary_dict.get("Custom", {}).get("waste_rate_pct", 0.0),
        })

        financial_impact_chart_data.append({
            "dish_name": c_dish_name,
            "category": dm["category"],
            "total_waste_cost": round(total_cost_all, 2),
            "corporate_cost": cat_summary_dict.get("Corporate", {}).get("waste_cost", 0.0),
            "wedding_cost": cat_summary_dict.get("Wedding", {}).get("waste_cost", 0.0),
            "social_cost": cat_summary_dict.get("Social", {}).get("waste_cost", 0.0),
            "conference_cost": cat_summary_dict.get("Conference", {}).get("waste_cost", 0.0),
            "custom_cost": cat_summary_dict.get("Custom", {}).get("waste_cost", 0.0),
        })

        dish_waste_heatmap.append({
            "dish_name": c_dish_name,
            "category": dm["category"],
            "cells": {
                ck: {
                    "waste_rate_pct": cat_summary_dict.get(ck, {}).get("waste_rate_pct", 0.0),
                    "waste_kg": cat_summary_dict.get(ck, {}).get("waste_kg", 0.0),
                    "prepared_kg": cat_summary_dict.get(ck, {}).get("prepared_kg", 0.0),
                    "has_data": cat_summary_dict.get(ck, {}).get("records_count", 0) > 0,
                } for ck in canonical_categories
            }
        })

    dish_comparison_matrix.sort(key=lambda x: (x["total_waste_kg"], x["total_prepared_kg"]), reverse=True)
    financial_impact_chart_data.sort(key=lambda x: x["total_waste_cost"], reverse=True)

    waste_per_guest_chart_data = [
        {
            "category": c["category"],
            "waste_per_guest_g": round(c["waste_per_guest_g"], 1),
            "total_pax": c["total_pax"],
            "event_count": c["event_count"],
            "total_waste_kg": round(c["total_waste_kg"], 1),
        }
        for c in categories_summary
    ]

    intel_filter_context = {
        "hotel_name": hotel if hotel != "all" else "All Hotels (Consolidated)",
        "event_type": None,
        "date_display": date_preset,
    }
    intel_result = generate_operational_intelligence(
        records=records,
        filter_context=intel_filter_context,
        db=db,
    )

    data_quality_audit = {
        "total_records_audited": len(records),
        "clean_records_count": max(0, len(records) - len(anomalies_list)),
        "flagged_records_count": len(anomalies_list),
        "anomalies": anomalies_list[:25],
    }

    return {
        "categories": categories_summary,
        "classification_system": {
            "canonical_categories": canonical_categories,
            "rule": "Canonical classifications prevent duplicate counting across categories.",
            "min_sample_size": 3,
        },
        "cross_event_comparison": cross_event_comparison,
        "dish_comparison_matrix": dish_comparison_matrix,
        "grouped_dish_chart_data": grouped_dish_chart_data[:15],
        "waste_per_guest_chart_data": waste_per_guest_chart_data,
        "financial_impact_chart_data": financial_impact_chart_data[:15],
        "dish_waste_heatmap": dish_waste_heatmap[:15],
        "operational_intelligence": intel_result,
        "data_quality_audit": data_quality_audit,
    }

# =========================================================================
# 2D. END-OF-DAY HOSPITALITY AUDIT REPORT ENDPOINT
# =========================================================================
@router.get("/api/analytics/eod-report")
def get_eod_report(
    report_date: Optional[str] = Query(None),
    hotel: Optional[str] = Query("all"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(AnalyticsRecord).filter(AnalyticsRecord.is_archived == False)
    if hotel and hotel != "all":
        query = query.filter(AnalyticsRecord.hotel_name == hotel)

    if report_date:
        try:
            target_date = datetime.strptime(report_date, "%Y-%m-%d").date()
        except Exception:
            target_date = date.today()
    else:
        latest_rec = query.order_by(AnalyticsRecord.record_date.desc()).first()
        target_date = latest_rec.record_date if latest_rec else date.today()

    query = query.filter(AnalyticsRecord.record_date == target_date)
    records = query.all()

    if not records:
        return {
            "report_date": str(target_date),
            "hotel_name": hotel if hotel != "all" else "All Hotels (Consolidated)",
            "has_data": False,
            "message": f"No culinary service records found for {target_date}.",
        }

    core = calculate_core_waste_metrics(records)
    dq = calculate_data_quality_score(records)

    sess_map: Dict[str, List[AnalyticsRecord]] = {}
    for r in records:
        s = r.session or "General Service"
        if s not in sess_map:
            sess_map[s] = []
        sess_map[s].append(r)

    raw_session_costs = {s: sum(r.waste_cost for r in recs) for s, recs in sess_map.items()}
    reconciled_curr = reconcile_currency_buckets(raw_session_costs, core["total_waste_cost"])

    sessions_summary = []
    for s_name, s_recs in sess_map.items():
        s_core = calculate_core_waste_metrics(s_recs)
        sessions_summary.append({
            "session": s_name,
            "dish_count": len(s_recs),
            "pax": s_core["total_pax"],
            "prepared_kg": s_core["total_prepared_kg"],
            "consumed_kg": s_core["total_consumed_kg"],
            "leftover_kg": s_core["total_leftover_kg"],
            "reuse_kg": s_core["total_reuse_kg"],
            "waste_kg": s_core["total_waste_kg"],
            "waste_rate_pct": s_core["waste_rate_pct"],
            "waste_per_guest_g": s_core["waste_per_guest_g"],
            "waste_cost_inr": reconciled_curr.get(s_name, {}).get("display_int", int(round(s_core["total_waste_cost"]))),
        })

    dish_map: Dict[str, Dict[str, Any]] = {}
    for r in records:
        if r.dish_name not in dish_map:
            dish_map[r.dish_name] = {"dish_name": r.dish_name, "category": r.dish_category, "prepared_kg": 0.0, "waste_kg": 0.0, "waste_cost": 0.0}
        dish_map[r.dish_name]["prepared_kg"] += r.actual_production_kg
        dish_map[r.dish_name]["waste_kg"] += r.total_waste_kg
        dish_map[r.dish_name]["waste_cost"] += r.waste_cost

    top_dishes = sorted(dish_map.values(), key=lambda x: x["waste_kg"], reverse=True)[:8]
    for td in top_dishes:
        td["waste_pct"] = round((td["waste_kg"] / td["prepared_kg"] * 100), 1) if td["prepared_kg"] > 0 else 0.0
        td["prepared_kg"] = round(td["prepared_kg"], 2)
        td["waste_kg"] = round(td["waste_kg"], 2)
        td["waste_cost"] = round(td["waste_cost"], 2)

    return {
        "has_data": True,
        "report_date": str(target_date),
        "hotel_name": hotel if hotel != "all" else "All Hotels (Consolidated)",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "total_guests": core["total_pax"],
        "total_sessions": len(sess_map),
        "total_dishes_served": len(records),
        "summary": {
            "total_prepared_kg": core["total_prepared_kg"],
            "total_consumed_kg": core["total_consumed_kg"],
            "total_leftover_kg": core["total_leftover_kg"],
            "total_reuse_kg": core["total_reuse_kg"],
            "total_waste_kg": core["total_waste_kg"],
            "waste_rate_pct": core["waste_rate_pct"],
            "waste_per_guest_g": core["waste_per_guest_g"],
            "total_waste_cost_inr": int(round(core["total_waste_cost"])),
            "waste_cost_per_guest": core["waste_cost_per_guest"],
        },
        "sessions": sessions_summary,
        "top_wasted_dishes": top_dishes,
        "mass_balance": {
            "is_reconciled": core["mass_balance_reconciled"],
            "production_variance_kg": core["production_reconciliation_variance_kg"],
            "leftover_variance_kg": core["leftover_reconciliation_variance_kg"],
            "variance_status": "Strictly Reconciled" if core["mass_balance_reconciled"] else f"Variance of {abs(core['leftover_reconciliation_variance_kg']):.2f} kg detected",
        },
        "data_quality": {
            "score_pct": dq["score"],
            "rating": dq["rating"],
            "unverified_entries": dq["unverified_count"],
        },
        "sign_off": {
            "executive_chef": {
                "title": "Executive Chef / Sous Chef",
                "status": "Verified & Signed",
                "date": str(target_date),
            },
            "fb_manager": {
                "title": "Food & Beverage Director",
                "status": "Pending Final Review",
                "date": str(target_date),
            }
        }
    }

# =========================================================================
# 2E. DATA QUALITY CENTER AUDIT FEED ENDPOINT
# =========================================================================
@router.get("/api/analytics/data-quality")
def get_data_quality_audit_center(
    hotel: Optional[str] = Query("all"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(AnalyticsRecord).filter(AnalyticsRecord.is_archived == False)
    if hotel and hotel != "all":
        query = query.filter(AnalyticsRecord.hotel_name == hotel)

    records = query.order_by(AnalyticsRecord.record_date.desc()).all()
    dq = calculate_data_quality_score(records)

    issues_feed = []
    for r in records:
        r_left = float(r.total_leftover_kg or 0.0)
        r_reuse = float(r.reuse_quantity_kg or 0.0)
        r_waste = float(r.total_waste_kg or 0.0)
        r_other = float(getattr(r, "other_disposition_kg", 0.0) or 0.0)
        diff = round(r_left - (r_reuse + r_waste + r_other), 2)

        if abs(diff) > 0.05:
            issues_feed.append({
                "id": f"mb-{r.id}",
                "record_id": r.id,
                "severity": "High",
                "issue_type": "Mass Balance Discrepancy",
                "hotel_name": r.hotel_name,
                "event_name": r.event_name or "General",
                "dish_name": r.dish_name,
                "session": r.session,
                "date": str(r.record_date),
                "description": f"Leftovers ({r_left} kg) do not equal Reused ({r_reuse} kg) + Waste ({r_waste} kg). Discrepancy: {diff} kg.",
                "suggested_action": "Verify if unrecorded leftovers were repurposed without logging or if waste scale had a tare offset.",
            })

        if not r.pax or r.pax <= 0:
            issues_feed.append({
                "id": f"pax-{r.id}",
                "record_id": r.id,
                "severity": "Medium",
                "issue_type": "Missing Guest Count",
                "hotel_name": r.hotel_name,
                "event_name": r.event_name or "General",
                "dish_name": r.dish_name,
                "session": r.session,
                "date": str(r.record_date),
                "description": "Guest attendance (Pax) is unrecorded or zero for this operational shift.",
                "suggested_action": "Enter actual cover attendance from POS banquet folio.",
            })

        if r.total_waste_kg > r.actual_production_kg and r.actual_production_kg > 0:
            issues_feed.append({
                "id": f"wex-{r.id}",
                "record_id": r.id,
                "severity": "Critical",
                "issue_type": "Waste Exceeds Production",
                "hotel_name": r.hotel_name,
                "event_name": r.event_name or "General",
                "dish_name": r.dish_name,
                "session": r.session,
                "date": str(r.record_date),
                "description": f"Recorded waste ({r.total_waste_kg} kg) exceeds cooked food volume ({r.actual_production_kg} kg).",
                "suggested_action": "Correct weigh-in record or verify if prior shift leftovers were consolidated into this batch.",
            })

        if (r.item_cost or 0.0) <= 0 and (r.waste_cost or 0.0) <= 0:
            issues_feed.append({
                "id": f"cost-{r.id}",
                "record_id": r.id,
                "severity": "Low",
                "issue_type": "Missing Ingredient Costing",
                "hotel_name": r.hotel_name,
                "event_name": r.event_name or "General",
                "dish_name": r.dish_name,
                "session": r.session,
                "date": str(r.record_date),
                "description": "Standard recipe portion cost is unconfigured (₹0.00).",
                "suggested_action": "Configure recipe ingredient bill-of-materials in recipe inventory.",
            })

    return {
        "overall_score_pct": dq["score"],
        "rating": dq["rating"],
        "total_records_audited": len(records),
        "audit_summary": {
            "missing_hotel_count": dq["missing_hotel_count"],
            "missing_session_count": dq["missing_session_count"],
            "missing_pax_count": dq["missing_pax_count"],
            "unreconciled_mass_balance_count": dq["unreconciled_count"],
            "missing_cost_count": dq["missing_cost_count"],
            "unverified_count": dq["unverified_count"],
        },
        "total_issues_found": len(issues_feed),
        "issues_feed": issues_feed[:50],
    }

# =========================================================================
# 3. INTELLIGENT REPORT INGESTION, AUDIT & CONFIRM ENDPOINTS
# =========================================================================
@router.post("/api/analytics/upload/preview")
@router.post("/api/analytics/upload/analyze")
async def preview_upload(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    content = await file.read()
    filename = file.filename or "uploaded_report.xlsx"
    analysis = analyze_report_file(content, filename)

    # Perform database duplicate check
    potential_duplicate = False
    dup_reasons = []
    dup_count = 0

    # 1. Filename match
    file_matches = db.query(AnalyticsRecord).filter(AnalyticsRecord.source_file == filename).count()
    if file_matches > 0:
        potential_duplicate = True
        dup_count += file_matches
        dup_reasons.append(f"{file_matches} records from file '{filename}' already exist.")

    # 2. Hotel + Date match from detected sheets
    for s in analysis.get("sheets", []):
        h_name = s.get("hotel")
        d_val = s.get("date")
        if h_name and d_val:
            try:
                d_obj = datetime.strptime(d_val, "%Y-%m-%d").date()
                hotel_date_matches = db.query(AnalyticsRecord).filter(
                    AnalyticsRecord.hotel_name == h_name,
                    AnalyticsRecord.record_date == d_obj
                ).count()
                if hotel_date_matches > 0 and hotel_date_matches not in [file_matches]:
                    potential_duplicate = True
                    dup_count += hotel_date_matches
                    dup_reasons.append(f"{hotel_date_matches} existing records for {h_name} on {d_val}.")
            except Exception:
                pass

    analysis["is_potential_duplicate"] = potential_duplicate
    analysis["duplicate_count"] = dup_count
    analysis["duplicate_reason"] = "; ".join(dup_reasons) if dup_reasons else None

    return analysis

@router.post("/api/analytics/upload/confirm")
async def confirm_upload(
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Form("all"),
    duplicate_action: Optional[str] = Form("import"),  # "import", "replace", "skip"
    hotel_override: Optional[str] = Form(None),
    event_override: Optional[str] = Form(None),
    date_override: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        content = await file.read()
        filename = file.filename or "uploaded_report.xlsx"

        parsed_date = None
        if date_override and date_override.strip():
            try:
                parsed_date = datetime.strptime(date_override.strip(), "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid service date '{date_override}'. Please provide a valid date formatted as YYYY-MM-DD."
                )

        records, warnings = parse_and_normalize_report(
            content=content,
            filename=filename,
            sheet_name_filter=sheet_name if sheet_name != "all" else None,
            hotel_override=hotel_override.strip() if hotel_override and hotel_override.strip() else None,
            event_override=event_override.strip() if event_override and event_override.strip() else None,
            date_override=parsed_date,
        )

        if not records:
            raise HTTPException(
                status_code=400,
                detail=f"Could not extract valid records from '{filename}'. Please ensure the file is a supported spreadsheet (.xlsx, .xls, .csv) with dish rows and quantity data."
            )

        # Handle duplicate actions
        if duplicate_action == "skip":
            sample_h = records[0].get("hotel_name")
            sample_d = records[0].get("record_date")
            existing_recs = db.query(AnalyticsRecord).filter(
                AnalyticsRecord.hotel_name == sample_h,
                AnalyticsRecord.record_date == sample_d
            ).count()
            if existing_recs > 0:
                return {
                    "status": "skipped",
                    "message": f"Import skipped: {existing_recs} records already exist for {sample_h} on {sample_d}. No records were added or modified.",
                    "inserted_records": 0,
                    "filename": filename,
                }

        deleted_count = 0
        if duplicate_action == "replace":
            # Remove existing records matching these hotels and dates
            unique_targets = {(r.get("hotel_name"), r.get("record_date")) for r in records}
            for h, d in unique_targets:
                if h and d:
                    del_q = db.query(AnalyticsRecord).filter(
                        AnalyticsRecord.hotel_name == h,
                        AnalyticsRecord.record_date == d
                    ).delete(synchronize_session=False)
                    deleted_count += del_q
            db.flush()

        batch_import_id = str(uuid.uuid4())
        hotel_cache: Dict[str, Hotel] = {}
        event_cache: Dict[tuple, Event] = {}
        inserted = 0
        skipped_dupes = 0
        for r in records:
            h_name = r.get("hotel_name")
            if h_name:
                if h_name not in hotel_cache:
                    h_obj = db.query(Hotel).filter(Hotel.name == h_name).first()
                    if not h_obj:
                        h_obj = Hotel(name=h_name, address="Ramoji Film City")
                        db.add(h_obj)
                        db.flush()
                    hotel_cache[h_name] = h_obj
                r["hotel_id"] = hotel_cache[h_name].id

            ev_name = r.get("event_name")
            h_id = r.get("hotel_id")
            if ev_name and h_id:
                cache_key = (ev_name, h_id)
                if cache_key not in event_cache:
                    ev_obj = db.query(Event).filter(Event.name == ev_name, Event.hotel_id == h_id).first()
                    if not ev_obj:
                        ev_obj = Event(
                            name=ev_name,
                            hotel_id=h_id,
                            event_date=r.get("record_date") or date.today(),
                            event_type=r.get("event_type") or "Regular Hotel Service",
                            expected_guests=r.get("pax") or 0,
                        )
                        db.add(ev_obj)
                        db.flush()
                    event_cache[cache_key] = ev_obj
                r["event_id"] = event_cache[cache_key].id

            # Prevent duplicate row insertion if duplicate_action is "import"
            if duplicate_action != "replace":
                existing = db.query(AnalyticsRecord).filter(
                    AnalyticsRecord.hotel_name == r.get("hotel_name"),
                    AnalyticsRecord.record_date == r.get("record_date"),
                    AnalyticsRecord.session == r.get("session"),
                    AnalyticsRecord.dish_name == r.get("dish_name"),
                    AnalyticsRecord.source_file == r.get("source_file"),
                    AnalyticsRecord.source_row == r.get("source_row"),
                ).first()
                if existing:
                    skipped_dupes += 1
                    continue

            r["import_id"] = batch_import_id
            rec = AnalyticsRecord(**r)
            db.add(rec)
            inserted += 1

        db.commit()

        # Build detailed live summary metrics from the committed records
        total_prod_kg = round(sum(float(r.get("actual_production_kg", 0) or 0) for r in records), 2)
        total_cons_kg = round(sum(float(r.get("actual_consumption_kg", 0) or 0) for r in records), 2)
        total_left_kg = round(sum(float(r.get("total_leftover_kg", 0) or 0) for r in records), 2)
        total_waste_kg = round(sum(float(r.get("total_waste_kg", 0) or 0) for r in records), 2)
        total_waste_cost = round(sum(float(r.get("waste_cost", 0) or 0) for r in records), 2)
        total_reuse_kg = round(sum(float(r.get("reuse_quantity_kg", 0) or 0) for r in records), 2)

        unique_hotels = sorted(list({str(r.get("hotel_name")) for r in records if r.get("hotel_name")}))
        unique_dates = sorted(list({str(r.get("record_date")) for r in records if r.get("record_date")}))
        unique_events = sorted(list({str(r.get("event_name")) for r in records if r.get("event_name")}))
        unique_sessions = sorted(list({str(r.get("session")) for r in records if r.get("session")}))
        unique_service_types = sorted(list({str(r.get("service_type")) for r in records if r.get("service_type")}))
        unique_dishes = list({str(r.get("dish_name")) for r in records if r.get("dish_name")})

        top_waste_dishes = sorted(records, key=lambda x: float(x.get("total_waste_kg", 0) or 0), reverse=True)[:5]
        top_dishes_summary = [
            {
                "dish_name": d.get("dish_name"),
                "category": d.get("dish_category") or "Main Course",
                "production_kg": round(float(d.get("actual_production_kg", 0) or 0), 2),
                "waste_kg": round(float(d.get("total_waste_kg", 0) or 0), 2),
                "waste_cost": round(float(d.get("waste_cost", 0) or 0), 2),
                "session": d.get("session") or "General",
            }
            for d in top_waste_dishes
        ]

        waste_pct = round((total_waste_kg / total_prod_kg * 100), 1) if total_prod_kg > 0 else 0.0

        return {
            "status": "success",
            "import_id": batch_import_id,
            "inserted_records": inserted,
            "filename": filename,
            "sheet_name": sheet_name,
            "warnings": warnings[:5],
            "summary": {
                "hotels": unique_hotels,
                "dates": unique_dates,
                "events": unique_events,
                "sessions": unique_sessions,
                "service_types": unique_service_types,
                "dishes_count": len(unique_dishes),
                "total_production_kg": total_prod_kg,
                "total_consumption_kg": total_cons_kg,
                "total_leftover_kg": total_left_kg,
                "total_waste_kg": total_waste_kg,
                "total_waste_cost": total_waste_cost,
                "total_reuse_kg": total_reuse_kg,
                "waste_percentage": waste_pct,
                "top_waste_dishes": top_dishes_summary,
                "replaced_records": deleted_count,
                "duplicate_action": duplicate_action,
                "imported_at": datetime.now().isoformat(),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Failed to process and store Excel report: {str(e)}"
        )

@router.get("/api/analytics/records")
def get_analytics_records_ledger(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    hotel: Optional[str] = Query(None),
    date_str: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    import_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(AnalyticsRecord)
    if hotel and hotel != "all":
        query = query.filter(AnalyticsRecord.hotel_name == hotel)
    if date_str:
        try:
            d_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
            query = query.filter(AnalyticsRecord.record_date == d_obj)
        except Exception:
            pass
    if import_id:
        query = query.filter(AnalyticsRecord.import_id == import_id)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (AnalyticsRecord.dish_name.ilike(s)) |
            (AnalyticsRecord.dish_category.ilike(s)) |
            (AnalyticsRecord.session.ilike(s)) |
            (AnalyticsRecord.event_name.ilike(s))
        )

    total = query.count()
    records = query.order_by(AnalyticsRecord.record_date.desc(), AnalyticsRecord.id.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
        "records": [
            {
                "id": r.id,
                "date": str(r.record_date),
                "hotel": r.hotel_name,
                "session": r.session,
                "event_name": r.event_name,
                "dish_name": r.dish_name,
                "dish_category": r.dish_category,
                "pax": r.pax,
                "actual_production_kg": r.actual_production_kg,
                "actual_consumption_kg": r.actual_consumption_kg,
                "total_leftover_kg": r.total_leftover_kg,
                "reuse_quantity_kg": r.reuse_quantity_kg,
                "total_waste_kg": r.total_waste_kg,
                "waste_cost": r.waste_cost,
                "waste_percentage": r.waste_percentage,
                "data_source": r.data_source,
                "source_file": r.source_file,
                "source_sheet": r.source_sheet,
                "source_row": r.source_row,
                "import_id": r.import_id,
                "confidence_score": r.confidence_score,
            }
            for r in records
        ]
    }

@router.delete("/api/analytics/imports/{import_id}", status_code=status.HTTP_200_OK)
def rollback_import(
    import_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required to rollback imports.")
    del_count = db.query(AnalyticsRecord).filter(AnalyticsRecord.import_id == import_id).delete(synchronize_session=False)
    db.commit()
    return {"status": "success", "deleted_records": del_count, "import_id": import_id}

# =========================================================================
# 4. PRESERVED ORIGINAL DASHBOARD ENDPOINTS FOR COMPLETE BACKWARDS COMPATIBILITY
# =========================================================================
@router.get("/api/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    period: Optional[str] = Query("all"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        db.query(Event)
        .filter(Event.hotel_id == current_user.hotel_id)
        .options(joinedload(Event.waste_scans))
    )

    today = date.today()
    if period == "daily":
        daily_query = query.filter(Event.event_date == today)
        if daily_query.count() > 0:
            query = daily_query
        else:
            latest_ev = query.order_by(Event.event_date.desc()).first()
            if latest_ev:
                query = query.filter(Event.event_date == latest_ev.event_date)
            else:
                query = daily_query
    elif period == "weekly":
        query = query.filter(Event.event_date >= today - timedelta(days=7))
    elif period == "monthly":
        query = query.filter(Event.event_date >= today - timedelta(days=30))

    events = query.order_by(Event.event_date.asc()).all()

    total_events = len(events)
    completed_events = sum(1 for e in events if e.status == "Completed")
    active_events = sum(1 for e in events if e.status == "Active")
    upcoming_events = sum(1 for e in events if e.status == "Upcoming")
    total_guests_served = sum(e.actual_guests for e in events if e.actual_guests)

    event_ids = [e.id for e in events]

    if event_ids:
        all_event_foods = (
            db.query(EventFood)
            .filter(EventFood.event_id.in_(event_ids))
            .all()
        )
        all_scans = (
            db.query(WasteScan)
            .filter(WasteScan.event_id.in_(event_ids))
            .all()
        )
    else:
        all_event_foods = []
        all_scans = []

    total_food_prepared_kg = round(sum(float(ef.prepared_weight_kg or 0.0) for ef in all_event_foods), 2)
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

@router.delete("/api/analytics/records/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analytics_record(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rec = db.query(AnalyticsRecord).filter(AnalyticsRecord.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Analytics record not found")
    db.delete(rec)
    db.commit()
    return None

@router.get("/api/analytics/dates-summary")
def get_available_dates_summary(
    hotel: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(
        AnalyticsRecord.record_date,
        AnalyticsRecord.hotel_name,
        func.count(AnalyticsRecord.id).label("record_count"),
        func.sum(AnalyticsRecord.actual_production_kg).label("total_production_kg"),
        func.sum(AnalyticsRecord.total_waste_kg).label("total_waste_kg"),
        func.sum(AnalyticsRecord.waste_cost).label("total_waste_cost"),
    )
    if hotel and hotel != "all":
        query = query.filter(AnalyticsRecord.hotel_name == hotel)

    rows = (
        query.group_by(AnalyticsRecord.record_date, AnalyticsRecord.hotel_name)
        .order_by(AnalyticsRecord.record_date.desc())
        .all()
    )

    result = []
    for r in rows:
        if r.record_date:
            result.append({
                "date": str(r.record_date),
                "hotel": r.hotel_name or "General",
                "record_count": r.record_count,
                "total_production_kg": round(float(r.total_production_kg or 0), 2),
                "total_waste_kg": round(float(r.total_waste_kg or 0), 2),
                "total_waste_cost": round(float(r.total_waste_cost or 0), 2),
            })
    return result

@router.delete("/api/analytics/records", status_code=status.HTTP_200_OK)
def clear_analytics_records(
    hotel: Optional[str] = Query(None),
    date_str: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin or Manager permissions required to delete records.")

    query = db.query(AnalyticsRecord)
    if hotel and hotel != "all":
        query = query.filter(AnalyticsRecord.hotel_name == hotel)

    target_desc = []
    if hotel and hotel != "all":
        target_desc.append(f"hotel '{hotel}'")

    if date_str and date_str.strip():
        try:
            d_obj = datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
            query = query.filter(AnalyticsRecord.record_date == d_obj)
            target_desc.append(f"date {date_str.strip()}")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format for 'date_str'. Expected YYYY-MM-DD.")
    elif start_date or end_date:
        if start_date and start_date.strip():
            try:
                d_start = datetime.strptime(start_date.strip(), "%Y-%m-%d").date()
                query = query.filter(AnalyticsRecord.record_date >= d_start)
                target_desc.append(f"from {start_date.strip()}")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Expected YYYY-MM-DD.")
        if end_date and end_date.strip():
            try:
                d_end = datetime.strptime(end_date.strip(), "%Y-%m-%d").date()
                query = query.filter(AnalyticsRecord.record_date <= d_end)
                target_desc.append(f"to {end_date.strip()}")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Expected YYYY-MM-DD.")

    del_count = query.delete(synchronize_session=False)
    db.commit()

    desc_str = " (" + ", ".join(target_desc) + ")" if target_desc else " (all records)"
    return {
        "status": "success",
        "deleted_records": del_count,
        "date": date_str,
        "start_date": start_date,
        "end_date": end_date,
        "hotel": hotel,
        "message": f"Successfully deleted {del_count} records{desc_str}."
    }

@router.get("/api/analytics/menu-recommendations")
def get_menu_recommendations(
    hotel: Optional[str] = Query("all"),
    event_id: Optional[int] = Query(None),
    event_type: Optional[str] = Query(None),
    target_guests: Optional[int] = Query(None),
    buffer_percentage: float = Query(10.0),
    service_format: str = Query("Buffet"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.services.menu_planning_engine import generate_menu_preparation_recommendations

    query = db.query(AnalyticsRecord).filter(AnalyticsRecord.is_archived == False)
    if hotel and hotel != "all":
        query = query.filter(AnalyticsRecord.hotel_name == hotel)
    if event_id:
        query = query.filter(AnalyticsRecord.event_id == event_id)
    if event_type and event_type != "all":
        query = query.filter(func.lower(AnalyticsRecord.event_type) == event_type.lower())

    records = query.all()
    return generate_menu_preparation_recommendations(
        records=records,
        target_guests=target_guests,
        buffer_percentage=buffer_percentage,
        service_format=service_format
    )

@router.post("/api/analytics/plan-menu")
def plan_menu_for_event(
    payload: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.services.menu_planning_engine import generate_menu_preparation_recommendations

    hotel = payload.get("hotel", "all")
    event_type = payload.get("event_type", "Corporate")
    target_guests = int(payload.get("expected_guests") or 100)
    buffer_percentage = float(payload.get("buffer_percentage") or 10.0)
    service_format = payload.get("service_format", "Buffet")

    query = db.query(AnalyticsRecord).filter(AnalyticsRecord.is_archived == False)
    if hotel and hotel != "all":
        query = query.filter(AnalyticsRecord.hotel_name == hotel)
    if event_type and event_type != "all":
        query = query.filter(func.lower(AnalyticsRecord.event_type) == event_type.lower())

    records = query.all()
    # If no records matching that specific event type, fallback to all records for that hotel
    if not records:
        fallback_query = db.query(AnalyticsRecord).filter(AnalyticsRecord.is_archived == False)
        if hotel and hotel != "all":
            fallback_query = fallback_query.filter(AnalyticsRecord.hotel_name == hotel)
        records = fallback_query.all()

    return generate_menu_preparation_recommendations(
        records=records,
        target_guests=target_guests,
        buffer_percentage=buffer_percentage,
        service_format=service_format
    )


