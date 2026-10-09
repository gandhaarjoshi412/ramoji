from typing import List, Dict, Any, Optional
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct

from app.services.calculation_engine import calculate_core_waste_metrics

# Centralized configurable operational thresholds
MIN_BASELINE_EVENTS = 3
ELEVATED_WASTE_THRESHOLD_PCT = 20.0
REDUCED_WASTE_THRESHOLD_PCT = -20.0

def generate_operational_intelligence(
    records: List[Any],
    filter_context: Dict[str, Any],
    db: Optional[Session] = None,
    baseline_records: Optional[List[Any]] = None,
) -> Dict[str, Any]:
    """
    Deterministic, transparent, rule-based intelligence engine.
    Strictly grounded in filtered operational records and true historical baselines.
    Never fabricates synthetic metrics or false ML claims.
    """
    insights: List[Dict[str, Any]] = []

    # -------------------------------------------------------------------------
    # SITUATION 1: No applicable data
    # -------------------------------------------------------------------------
    if not records or len(records) == 0:
        hotel_scope = filter_context.get("hotel_name") or "the selected scope"
        date_scope = filter_context.get("date_display") or "the selected period"
        insights.append({
            "id": "ins-empty-1",
            "priority": "Information",
            "category": "Filter Scope",
            "title": "No Records Match Filter Criteria",
            "observation": f"No banquet or culinary records were found for {hotel_scope} during {date_scope}.",
            "reason_metric": "0 records returned matching active query filters.",
            "recommendation": "Adjust or clear the date range, hotel, or category filters to view available datasets.",
        })
        return {
            "insights": insights,
            "executive_summary": f"No culinary records found matching the active filter selection ({hotel_scope}, {date_scope}). Adjust filters to view data.",
            "has_baseline": False,
            "baseline_count": 0,
            "baseline_metrics": None,
        }

    # Calculate active metrics for current filtered records
    metrics = calculate_core_waste_metrics(records)
    total_prep = metrics["total_prepared_kg"]
    total_waste = metrics["total_waste_kg"]
    waste_pct = metrics["waste_rate_pct"]
    waste_cost = metrics["total_waste_cost"]
    total_pax = metrics["total_pax"]
    total_reuse = metrics["total_reuse_kg"]
    reuse_rate = metrics["reuse_rate_pct"]
    waste_per_guest_g = metrics["waste_per_guest_g"]
    waste_cost_per_guest = metrics["waste_cost_per_guest"]

    # -------------------------------------------------------------------------
    # SITUATION 2, 3, 4, 5: Historical Baseline Retrieval & Comparison
    # -------------------------------------------------------------------------
    # Retrieve comparable baseline records if not provided and db is available
    comp_records: List[Any] = []
    if baseline_records is not None:
        comp_records = baseline_records
    elif db is not None:
        from app.models.analytics_record import AnalyticsRecord
        # Query comparable historical records:
        # Same hotel (if hotel selected) or across all hotels
        base_query = db.query(AnalyticsRecord)
        target_hotel = filter_context.get("hotel_name")
        if target_hotel and target_hotel not in ("all", "All Hotels (Consolidated)"):
            base_query = base_query.filter(AnalyticsRecord.hotel_name == target_hotel)

        target_cat = filter_context.get("event_type") or filter_context.get("dish_category")
        if target_cat and target_cat != "all":
            base_query = base_query.filter(
                (AnalyticsRecord.event_type == target_cat) |
                (AnalyticsRecord.dish_category == target_cat)
            )

        # Exclude records already in current selection to form independent baseline
        current_ids = {r.id for r in records if hasattr(r, "id") and r.id}
        if current_ids:
            base_query = base_query.filter(~AnalyticsRecord.id.in_(current_ids))

        comp_records = base_query.all()

    # Determine unique comparable historical events/shifts in baseline
    baseline_events: Dict[tuple, int] = {}
    for b in comp_records:
        k = (
            str(getattr(b, "record_date", "")),
            str(getattr(b, "hotel_name", "")),
            str(getattr(b, "session", "")),
            str(getattr(b, "event_name", ""))
        )
        if k not in baseline_events:
            baseline_events[k] = max(0, int(getattr(b, "pax", 0) or 0))

    baseline_count = len(baseline_events)
    has_valid_baseline = baseline_count >= MIN_BASELINE_EVENTS
    baseline_metrics = None

    if not has_valid_baseline:
        # SITUATION 2: Insufficient historical baseline
        insights.append({
            "id": "ins-baseline-unavailable",
            "priority": "Information",
            "category": "Historical Baseline",
            "title": "Historical Baseline Comparison Unavailable",
            "observation": (
                f"Found {baseline_count} comparable historical event{'s' if baseline_count == 1 else ''}. "
                f"A minimum of {MIN_BASELINE_EVENTS} comparable historical events are required to establish an empirical operational baseline."
            ),
            "reason_metric": f"Historical events: {baseline_count}/{MIN_BASELINE_EVENTS} threshold.",
            "recommendation": "Continue recording banquet service shifts to build an empirical comparison baseline.",
        })
    else:
        # We have a valid baseline! Compute baseline metrics
        baseline_metrics = calculate_core_waste_metrics(comp_records)
        base_waste_pct = baseline_metrics["waste_rate_pct"]
        base_prep = baseline_metrics["total_prepared_kg"]

        if base_waste_pct > 0:
            change_pct = ((waste_pct - base_waste_pct) / base_waste_pct) * 100.0

            # SITUATION 3: Waste higher than baseline (>= +20%)
            if change_pct >= ELEVATED_WASTE_THRESHOLD_PCT:
                priority = "Critical" if (change_pct >= 35.0 or waste_pct > 8.0) else "Attention"
                insights.append({
                    "id": "ins-waste-elevated",
                    "priority": priority,
                    "category": "Waste Elevation",
                    "title": f"Elevated Waste Generation (+{change_pct:.1f}% vs Baseline)",
                    "observation": (
                        f"Current recorded waste rate of {waste_pct:.2f}% exceeds the comparable baseline of "
                        f"{base_waste_pct:.2f}% by {change_pct:.1f}% across {len(records)} recorded items."
                    ),
                    "reason_metric": (
                        f"Current: {waste_pct:.2f}% vs Baseline: {base_waste_pct:.2f}% "
                        f"(+{waste_pct - base_waste_pct:.2f}% delta)."
                    ),
                    "recommendation": (
                        "Audit buffet replenishment batch sizes and calibrate standard preparation quantities "
                        "against actual patron consumption rates."
                    ),
                })
            # SITUATION 4: Waste lower than baseline (<= -20%)
            elif change_pct <= REDUCED_WASTE_THRESHOLD_PCT:
                insights.append({
                    "id": "ins-waste-reduced",
                    "priority": "Performing Well",
                    "category": "Yield Improvement",
                    "title": f"Waste Below Historical Baseline (-{abs(change_pct):.1f}%)",
                    "observation": (
                        f"Recorded waste rate of {waste_pct:.2f}% is {abs(change_pct):.1f}% below the "
                        f"comparable historical baseline of {base_waste_pct:.2f}%."
                    ),
                    "reason_metric": (
                        f"Current: {waste_pct:.2f}% vs Baseline: {base_waste_pct:.2f}% "
                        f"({waste_pct - base_waste_pct:.2f}% delta)."
                    ),
                    "recommendation": (
                        "Investigate and record batch sizing and guest replenishment pacing from this service "
                        "to repeat in future operations."
                    ),
                })
            # SITUATION 5: Waste approximately equal to baseline (within ±20%)
            else:
                insights.append({
                    "id": "ins-waste-normal",
                    "priority": "Performing Well",
                    "category": "Baseline Adherence",
                    "title": "Waste Generation In Line With Baseline",
                    "observation": (
                        f"Recorded waste rate of {waste_pct:.2f}% is broadly in line with historical "
                        f"comparable baseline ({base_waste_pct:.2f}%)."
                    ),
                    "reason_metric": f"Variance from baseline: {change_pct:+.1f}% (within operating tolerance).",
                    "recommendation": "Maintain current recipe scaling ratios and ongoing portion audit tracking.",
                })

    # -------------------------------------------------------------------------
    # SITUATION 6: Missing guest count or prepared quantity
    # -------------------------------------------------------------------------
    if total_pax <= 0:
        insights.append({
            "id": "ins-missing-pax",
            "priority": "Attention",
            "category": "Data Quality",
            "title": "Guest Headcount (PAX) Missing",
            "observation": "Guest attendance headcount is zero or unrecorded for one or more shifts in this view.",
            "reason_metric": "Pax = 0; per-guest waste (g/guest) cannot be reliably computed.",
            "recommendation": "Ensure front-of-house banquet supervisors log verified guest attendance on duty sheets.",
        })
    elif waste_per_guest_g > 0:
        insights.append({
            "id": "ins-waste-per-guest",
            "priority": "Attention" if waste_per_guest_g > 100 else "Information",
            "category": "Portion Metric",
            "title": f"Per-Guest Discard: {waste_per_guest_g:.1f}g / Patron",
            "observation": f"Average waste per attendee stands at {waste_per_guest_g:.1f} grams across {total_pax:,} logged guests.",
            "reason_metric": f"{total_waste:.1f} kg discarded / {total_pax:,} total covers.",
            "recommendation": "Target under 60g waste per guest on buffet services through progressive hot-hold replenishment.",
        })

    if total_prep <= 0:
        insights.append({
            "id": "ins-missing-prep",
            "priority": "Attention",
            "category": "Data Quality",
            "title": "Prepared Quantity Missing",
            "observation": "Total prepared food volume is recorded as 0 kg.",
            "reason_metric": "Cooked food weight = 0.0 kg.",
            "recommendation": "Ensure kitchen production logs record initial batch weights prior to service dispatch.",
        })

    # -------------------------------------------------------------------------
    # SITUATION 7: Monetary cost analysis
    # -------------------------------------------------------------------------
    if waste_cost > 0:
        insights.append({
            "id": "ins-cost-impact",
            "priority": "Critical" if waste_cost > 10000 else "Attention",
            "category": "Financial Impact",
            "title": f"Procurement Loss: ₹{waste_cost:,.0f}",
            "observation": f"Discarded food represents direct recipe procurement loss of ₹{waste_cost:,.0f} ({waste_cost_per_guest:.1f} ₹/guest).",
            "reason_metric": f"Calculated from verified item procurement rates across {len(records)} dish entries.",
            "recommendation": "Focus waste reduction controls on high-cost protein and dairy menu components.",
        })
    elif total_waste > 0 and waste_cost == 0:
        insights.append({
            "id": "ins-cost-unavailable",
            "priority": "Information",
            "category": "Financial Costing",
            "title": "Recipe Cost Analysis Unavailable",
            "observation": "Cost analysis could not be calculated because item unit costs are not configured for these records.",
            "reason_metric": "Recipe cost data missing or set to ₹0.00.",
            "recommendation": "Update ingredient procurement rates in the Recipes & Cost master to unlock monetary tracking.",
        })

    # -------------------------------------------------------------------------
    # SITUATION 8: Top waste contributors (dishes or events)
    # -------------------------------------------------------------------------
    dish_agg: Dict[str, Dict[str, Any]] = {}
    for r in records:
        dn = getattr(r, "dish_name", None)
        if dn:
            if dn not in dish_agg:
                dish_agg[dn] = {
                    "name": dn,
                    "category": getattr(r, "dish_category", "Main Course"),
                    "waste_kg": 0.0,
                    "cost": 0.0,
                    "prep_kg": 0.0,
                }
            dish_agg[dn]["waste_kg"] += float(getattr(r, "total_waste_kg", 0.0) or 0.0)
            dish_agg[dn]["cost"] += float(getattr(r, "waste_cost", 0.0) or 0.0)
            dish_agg[dn]["prep_kg"] += float(getattr(r, "actual_production_kg", 0.0) or 0.0)

    if dish_agg:
        top_dishes = sorted(dish_agg.values(), key=lambda x: x["waste_kg"], reverse=True)
        top_dish = top_dishes[0]
        if top_dish["waste_kg"] > 0:
            dish_waste_pct = (top_dish["waste_kg"] / top_dish["prep_kg"] * 100.0) if top_dish["prep_kg"] > 0 else 0.0
            insights.append({
                "id": "ins-top-dish",
                "priority": "Critical" if dish_waste_pct > 10 else "Attention",
                "category": "High-Loss Recipe",
                "title": f"Top Discard Item: {top_dish['name']}",
                "observation": (
                    f"'{top_dish['name']}' ({top_dish['category']}) generated {top_dish['waste_kg']:.1f} kg waste "
                    f"({dish_waste_pct:.1f}% discard rate) totaling ₹{top_dish['cost']:,.0f} lost."
                ),
                "reason_metric": f"{top_dish['waste_kg']:.1f} kg waste out of {top_dish['prep_kg']:.1f} kg prepared.",
                "recommendation": f"Scale back standard batch sizes for {top_dish['name']} by ~10–15% based on actual guest intake.",
            })
    else:
        # Event level ranking fallback
        ev_agg: Dict[str, float] = {}
        for r in records:
            ev_name = getattr(r, "event_name", "General Operation")
            ev_agg[ev_name] = ev_agg.get(ev_name, 0.0) + float(getattr(r, "total_waste_kg", 0.0) or 0.0)
        if ev_agg:
            top_ev = sorted(ev_agg.items(), key=lambda x: x[1], reverse=True)[0]
            insights.append({
                "id": "ins-top-event",
                "priority": "Attention",
                "category": "Event Waste",
                "title": f"Top Waste Banquet: {top_ev[0]}",
                "observation": f"Event '{top_ev[0]}' recorded highest cumulative waste at {top_ev[1]:.1f} kg.",
                "reason_metric": f"{top_ev[1]:.1f} kg total discards.",
                "recommendation": "Review post-service banquet logs and adjust future booking food estimations.",
            })

    # Safe food reuse diversion insight
    if total_reuse > 0:
        insights.append({
            "id": "ins-reuse-diversion",
            "priority": "Information",
            "category": "Waste Diversion",
            "title": f"{total_reuse:.1f} kg Diverted via Safe Food Reuse",
            "observation": f"Kitchen operations safely logged {total_reuse:.1f} kg of compliant food reuse ({reuse_rate:.1f}% of leftovers).",
            "reason_metric": f"{total_reuse:.1f} kg diverted from disposal ledgers.",
            "recommendation": "Maintain strict HACCP chilling guidelines for unexposed kitchen holds.",
        })

    # -------------------------------------------------------------------------
    # Executive Briefing
    # -------------------------------------------------------------------------
    hotel_text = filter_context.get("hotel_name") or "Authorized Operations"
    date_text = filter_context.get("date_display") or "Selected Period"
    exec_summary = (
        f"Culinary operations recorded {total_prep:.1f} kg prepared and {total_waste:.1f} kg final waste "
        f"({waste_pct:.2f}% waste rate) across {len(records)} dish line-items for {hotel_text} ({date_text}). "
        f"Direct procurement loss stands at ₹{waste_cost:,.0f} ({waste_cost_per_guest:.1f} ₹/guest)."
    )

    return {
        "insights": insights,
        "executive_summary": exec_summary,
        "has_baseline": has_valid_baseline,
        "baseline_count": baseline_count,
        "baseline_metrics": baseline_metrics,
    }
