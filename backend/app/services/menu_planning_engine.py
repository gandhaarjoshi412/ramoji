import math
from typing import List, Dict, Any, Optional

def generate_menu_preparation_recommendations(
    records: List[Any],
    target_guests: Optional[int] = None,
    buffer_percentage: float = 10.0,
    service_format: str = "Buffet"
) -> Dict[str, Any]:
    """
    Evidence-based culinary preparation recommendation engine.
    Calculates suggested batch preparation quantities for upcoming events based on
    observed historical guest intake, leftover volumes, and replenishment trends.
    Formula:
        Suggested Prep (kg) = (Historical Observed Consumption / Guest in grams / 1000) * Target Guests * (1 + Buffer%)
    """
    if not records:
        return {
            "target_guests": target_guests or 100,
            "buffer_percentage": buffer_percentage,
            "total_dishes_analyzed": 0,
            "recommendations": [],
            "overproduction_candidates": [],
            "potential_shortage_risks": [],
            "optimal_dishes": [],
            "summary_note": "Insufficient historical operational records to generate preparation forecasts."
        }

    # Aggregate by dish
    dish_map: Dict[str, Dict[str, Any]] = {}
    for r in records:
        dn = (getattr(r, "dish_name", None) or "Dish").strip()
        cat = getattr(r, "dish_category", "Main Course") or "Main Course"
        prep = float(getattr(r, "actual_production_kg", 0.0) or 0.0)
        cons = float(getattr(r, "actual_consumption_kg", 0.0) or 0.0)
        left = float(getattr(r, "total_leftover_kg", 0.0) or 0.0)
        reuse = float(getattr(r, "reuse_quantity_kg", 0.0) or 0.0)
        waste = float(getattr(r, "total_waste_kg", 0.0) or 0.0)
        cost = float(getattr(r, "waste_cost", 0.0) or 0.0)
        item_c = float(getattr(r, "item_cost", 0.0) or 0.0)
        pax = int(getattr(r, "pax", 0) or 0)

        if dn not in dish_map:
            dish_map[dn] = {
                "dish_name": dn,
                "category": cat,
                "occurrences": 0,
                "total_prepared_kg": 0.0,
                "total_consumed_kg": 0.0,
                "total_leftover_kg": 0.0,
                "total_reuse_kg": 0.0,
                "total_waste_kg": 0.0,
                "total_waste_cost": 0.0,
                "total_pax": 0,
                "unit_cost": item_c,
                "sessions": set(),
                "event_names": set(),
            }

        dm = dish_map[dn]
        dm["occurrences"] += 1
        dm["total_prepared_kg"] += prep
        dm["total_consumed_kg"] += cons
        dm["total_leftover_kg"] += left
        dm["total_reuse_kg"] += reuse
        dm["total_waste_kg"] += waste
        dm["total_waste_cost"] += cost
        if item_c > 0:
            dm["unit_cost"] = max(dm["unit_cost"], item_c)
        if pax > 0:
            dm["total_pax"] += pax
        sess = getattr(r, "session", None)
        if sess:
            dm["sessions"].add(sess)
        ev_n = getattr(r, "event_name", None)
        if ev_n:
            dm["event_names"].add(ev_n)

    # Determine baseline guest scale
    all_pax = sum(dm["total_pax"] for dm in dish_map.values())
    avg_event_pax = int(all_pax / max(1, sum(dm["occurrences"] for dm in dish_map.values())))
    effective_target_guests = target_guests if (target_guests and target_guests > 0) else max(50, avg_event_pax)

    # Adjust buffer based on service format: Buffet has higher variability than Plated Set Menu
    fmt_buffer = buffer_percentage
    if "plated" in service_format.lower() or "set" in service_format.lower():
        fmt_buffer = max(3.0, buffer_percentage - 4.0)
    elif "catering" in service_format.lower():
        fmt_buffer = buffer_percentage + 2.0

    recommendations_list = []
    overprod_list = []
    shortage_list = []
    optimal_list = []

    for dn, dm in dish_map.items():
        occ = dm["occurrences"]
        tot_prep = dm["total_prepared_kg"]
        tot_cons = dm["total_consumed_kg"]
        tot_left = dm["total_leftover_kg"]
        tot_waste = dm["total_waste_kg"]
        tot_pax = dm["total_pax"]
        unit_cost = dm["unit_cost"] if dm["unit_cost"] > 0 else (dm["total_waste_cost"] / tot_waste if tot_waste > 0 else 120.0)

        # Average consumption per guest (grams)
        if tot_pax > 0 and tot_cons > 0:
            avg_cons_per_guest_g = (tot_cons / tot_pax) * 1000.0
        elif tot_prep > 0 and tot_pax > 0:
            avg_cons_per_guest_g = (max(0.0, tot_prep - tot_left) / tot_pax) * 1000.0
        else:
            avg_cons_per_guest_g = 150.0  # Safe culinary standard fallback

        # Consumption rate %
        cons_rate_pct = (tot_cons / tot_prep * 100.0) if tot_prep > 0 else 0.0
        waste_rate_pct = (tot_waste / tot_prep * 100.0) if tot_prep > 0 else 0.0
        leftover_rate_pct = (tot_left / tot_prep * 100.0) if tot_prep > 0 else 0.0

        # Suggested preparation calculation
        base_kg = (avg_cons_per_guest_g / 1000.0) * effective_target_guests
        suggested_prep_kg = round(base_kg * (1.0 + (fmt_buffer / 100.0)), 1)
        current_avg_batch_kg = round(tot_prep / occ, 1)

        # Classify status
        sample_adequate = occ >= 2 and tot_pax >= 30
        status = "OPTIMAL_ALIGNMENT"
        action_verb = "Maintain"
        rationale = ""

        if leftover_rate_pct >= 20.0 and tot_left >= 3.0:
            status = "OVERPRODUCTION_CANDIDATE"
            action_verb = "Reduce Batch Size"
            delta_kg = max(0.0, round(current_avg_batch_kg - suggested_prep_kg, 1))
            potential_savings = round(delta_kg * unit_cost, 0)
            rationale = (
                f"Recorded preparation exceeded guest consumption with {leftover_rate_pct:.1f}% leftovers ({tot_left:.1f} kg) "
                f"across {occ} shifts. Reducing future batch to {suggested_prep_kg} kg for {effective_target_guests} guests "
                f"incorporates a safe {fmt_buffer:.0f}% buffer while preventing an estimated ₹{potential_savings:,.0f} in food cost losses."
            )
        elif cons_rate_pct >= 95.0 and tot_left <= 1.0 and occ >= 2:
            status = "POTENTIAL_SHORTAGE_RISK"
            action_verb = "Increase Batch / Monitor"
            rationale = (
                f"High guest consumption velocity ({cons_rate_pct:.1f}%) with under 1 kg leftover indicates strong guest demand "
                f"with potential late-service chafing dish depletion. Recommend planning an initial batch of {suggested_prep_kg} kg "
                f"and preparing a rapid 5 kg backup pan ready in the hot-holding cabinet."
            )
        elif not sample_adequate:
            status = "LIMITED_SAMPLE"
            action_verb = "Review Manually"
            rationale = (
                f"Only {occ} recorded event shift ({tot_pax} guests) available. Suggested quantity of {suggested_prep_kg} kg "
                f"is based on {avg_cons_per_guest_g:.0f}g/guest; compare with executive chef portion guidelines before finalizing production sheet."
            )
        else:
            status = "OPTIMAL_ALIGNMENT"
            action_verb = "Maintain Current Standard"
            rationale = (
                f"Production accurately matched consumption ({cons_rate_pct:.1f}% eaten, {leftover_rate_pct:.1f}% leftovers). "
                f"Suggested {suggested_prep_kg} kg provides reliable coverage for {effective_target_guests} attendees."
            )

        rec_item = {
            "dish_name": dn,
            "category": dm["category"],
            "status": status,
            "action_verb": action_verb,
            "historical_occurrences": occ,
            "historical_guests_served": tot_pax,
            "historical_avg_batch_kg": current_avg_batch_kg,
            "historical_consumed_per_guest_g": round(avg_cons_per_guest_g, 1),
            "historical_waste_rate_pct": round(waste_rate_pct, 1),
            "historical_leftover_rate_pct": round(leftover_rate_pct, 1),
            "historical_waste_cost": round(dm["total_waste_cost"], 2),
            "target_guests": effective_target_guests,
            "buffer_percentage": fmt_buffer,
            "suggested_preparation_kg": suggested_prep_kg,
            "estimated_unit_cost": round(unit_cost, 2),
            "evidence_rationale": rationale,
            "confidence_level": "High" if occ >= 3 else ("Moderate" if occ >= 2 else "Preliminary"),
        }

        recommendations_list.append(rec_item)
        if status == "OVERPRODUCTION_CANDIDATE":
            overprod_list.append(rec_item)
        elif status == "POTENTIAL_SHORTAGE_RISK":
            shortage_list.append(rec_item)
        else:
            optimal_list.append(rec_item)

    # Sort: Overproduction candidates first by potential savings, then shortages, then optimal
    recommendations_list.sort(key=lambda x: (x["status"] != "OVERPRODUCTION_CANDIDATE", -x["historical_waste_cost"]))

    return {
        "target_guests": effective_target_guests,
        "buffer_percentage": fmt_buffer,
        "service_format": service_format,
        "total_dishes_analyzed": len(recommendations_list),
        "overproduction_candidates_count": len(overprod_list),
        "potential_shortage_risks_count": len(shortage_list),
        "optimal_dishes_count": len(optimal_list),
        "recommendations": recommendations_list,
        "overproduction_candidates": overprod_list[:8],
        "potential_shortage_risks": shortage_list[:8],
        "optimal_dishes": optimal_list[:8],
        "summary_note": (
            f"Generated culinary production plan for {effective_target_guests} guests across {len(recommendations_list)} menu items "
            f"using empirical consumption baselines with a {fmt_buffer:.0f}% safety buffer."
        )
    }
