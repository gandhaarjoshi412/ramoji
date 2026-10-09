from typing import List, Dict, Any, Optional
from datetime import date
import math

def calculate_core_waste_metrics(records: List[Any], pax_override: Optional[int] = None) -> Dict[str, Any]:
    """
    Centralized, mathematically verified calculation utility for PlateSight.
    Adheres strictly to the operational definitions and mass balance:
    - Prepared Quantity: Food cooked for the shift/event (actual_production_kg)
    - Consumed Quantity: Food eaten by patrons (actual_consumption_kg)
    - Leftover Quantity: Unconsumed food (kitchen_leftover_kg + location_buffet_return_kg)
    - Reused Quantity: Safe compliant food diverted from waste (reuse_quantity_kg)
    - Waste Quantity: Discarded food (total_waste_kg), never including reused food
    - Other Disposition: Explicitly recorded alternative handling (samples, donations)
    - Waste Cost: Direct financial cost based on recipe costing
    - Traceable Reconciliation:
        * Production Variance: Prepared - (Consumed + Leftover)
        * Leftover Disposition Variance: Leftover - (Reused + Waste + Other)
    """
    if not records:
        return {
            "total_prepared_kg": 0.0,
            "total_consumed_kg": 0.0,
            "total_kitchen_leftover_kg": 0.0,
            "total_buffet_leftover_kg": 0.0,
            "total_leftover_kg": 0.0,
            "total_reuse_kg": 0.0,
            "total_waste_kg": 0.0,
            "total_other_disposition_kg": 0.0,
            "production_reconciliation_variance_kg": 0.0,
            "leftover_reconciliation_variance_kg": 0.0,
            "mass_balance_reconciled": True,
            "total_waste_cost": 0.0,
            "total_estimated_kg": 0.0,
            "total_pax": 0,
            "waste_rate_pct": 0.0,
            "consumption_rate_pct": 0.0,
            "reuse_rate_pct": 0.0,
            "waste_per_guest_g": 0.0,
            "consumed_per_guest_g": 0.0,
            "prepared_per_guest_g": 0.0,
            "waste_cost_per_guest": 0.0,
            "production_variance_kg": 0.0,
            "production_variance_pct": 0.0,
            "discrepancy_records": [],
        }

    total_prepared_kg = round(sum(float(getattr(r, "actual_production_kg", 0.0) or 0.0) for r in records), 2)
    total_consumed_kg = round(sum(float(getattr(r, "actual_consumption_kg", 0.0) or 0.0) for r in records), 2)
    total_kitchen_leftover_kg = round(sum(float(getattr(r, "kitchen_leftover_kg", 0.0) or 0.0) for r in records), 2)
    total_buffet_leftover_kg = round(sum(float(getattr(r, "location_buffet_return_kg", 0.0) or 0.0) for r in records), 2)
    total_leftover_kg = round(sum(float(getattr(r, "total_leftover_kg", 0.0) or 0.0) for r in records), 2)
    total_reuse_kg = round(sum(float(getattr(r, "reuse_quantity_kg", 0.0) or 0.0) for r in records), 2)
    total_waste_kg = round(sum(float(getattr(r, "total_waste_kg", 0.0) or 0.0) for r in records), 2)
    total_other_disposition_kg = round(sum(float(getattr(r, "other_disposition_kg", 0.0) or 0.0) for r in records), 2)
    total_waste_cost = round(sum(float(getattr(r, "waste_cost", 0.0) or 0.0) for r in records), 2)
    total_estimated_kg = round(sum(float(getattr(r, "estimated_production_kg", 0.0) or 0.0) for r in records), 2)

    # Reconciliations
    prod_recon_variance = round(total_prepared_kg - (total_consumed_kg + total_leftover_kg), 2)
    leftover_recon_variance = round(total_leftover_kg - (total_reuse_kg + total_waste_kg + total_other_disposition_kg), 2)
    is_reconciled = abs(leftover_recon_variance) < 0.05

    # Identify individual record mass-balance discrepancies
    discrepancy_records: List[Dict[str, Any]] = []
    for r in records:
        r_left = float(getattr(r, "total_leftover_kg", 0.0) or 0.0)
        r_reuse = float(getattr(r, "reuse_quantity_kg", 0.0) or 0.0)
        r_waste = float(getattr(r, "total_waste_kg", 0.0) or 0.0)
        r_other = float(getattr(r, "other_disposition_kg", 0.0) or 0.0)
        r_diff = round(r_left - (r_reuse + r_waste + r_other), 2)
        if abs(r_diff) > 0.05:
            discrepancy_records.append({
                "record_id": getattr(r, "id", None),
                "dish_name": getattr(r, "dish_name", "Unknown"),
                "hotel_name": getattr(r, "hotel_name", "Unknown"),
                "event_name": getattr(r, "event_name", "General"),
                "session": getattr(r, "session", "General"),
                "date": str(getattr(r, "record_date", "")),
                "leftover_kg": r_left,
                "reuse_kg": r_reuse,
                "waste_kg": r_waste,
                "other_disposition_kg": r_other,
                "unaccounted_variance_kg": r_diff,
                "status": "Under-accounted" if r_diff > 0 else "Over-accounted",
            })

    # Determine pax without double-counting across dish rows
    if pax_override is not None:
        total_pax = max(0, int(pax_override))
    else:
        unique_shifts: Dict[tuple, int] = {}
        for r in records:
            shift_key = (
                str(getattr(r, "record_date", "")),
                str(getattr(r, "hotel_name", "")),
                str(getattr(r, "session", "")),
                str(getattr(r, "event_name", ""))
            )
            if shift_key not in unique_shifts:
                unique_shifts[shift_key] = max(0, int(getattr(r, "pax", 0) or 0))
        total_pax = sum(unique_shifts.values())

    waste_rate_pct = round((total_waste_kg / total_prepared_kg * 100.0), 2) if total_prepared_kg > 0 else 0.0
    consumption_rate_pct = round((total_consumed_kg / total_prepared_kg * 100.0), 2) if total_prepared_kg > 0 else 0.0
    reuse_rate_pct = round((total_reuse_kg / total_leftover_kg * 100.0), 2) if total_leftover_kg > 0 else 0.0

    waste_per_guest_g = round((total_waste_kg / total_pax * 1000.0), 1) if total_pax > 0 else 0.0
    consumed_per_guest_g = round((total_consumed_kg / total_pax * 1000.0), 1) if total_pax > 0 else 0.0
    prepared_per_guest_g = round((total_prepared_kg / total_pax * 1000.0), 1) if total_pax > 0 else 0.0
    waste_cost_per_guest = round((total_waste_cost / total_pax), 2) if total_pax > 0 else 0.0

    prod_var_kg = round(total_prepared_kg - total_estimated_kg, 2)
    prod_var_pct = round((prod_var_kg / total_estimated_kg * 100.0), 1) if total_estimated_kg > 0 else 0.0

    return {
        "total_prepared_kg": total_prepared_kg,
        "total_consumed_kg": total_consumed_kg,
        "total_kitchen_leftover_kg": total_kitchen_leftover_kg,
        "total_buffet_leftover_kg": total_buffet_leftover_kg,
        "total_leftover_kg": total_leftover_kg,
        "total_reuse_kg": total_reuse_kg,
        "total_waste_kg": total_waste_kg,
        "total_other_disposition_kg": total_other_disposition_kg,
        "production_reconciliation_variance_kg": prod_recon_variance,
        "leftover_reconciliation_variance_kg": leftover_recon_variance,
        "mass_balance_reconciled": is_reconciled,
        "total_waste_cost": total_waste_cost,
        "total_estimated_kg": total_estimated_kg,
        "total_pax": total_pax,
        "waste_rate_pct": waste_rate_pct,
        "consumption_rate_pct": consumption_rate_pct,
        "reuse_rate_pct": reuse_rate_pct,
        "waste_per_guest_g": waste_per_guest_g,
        "consumed_per_guest_g": consumed_per_guest_g,
        "prepared_per_guest_g": prepared_per_guest_g,
        "waste_cost_per_guest": waste_cost_per_guest,
        "production_variance_kg": prod_var_kg,
        "production_variance_pct": prod_var_pct,
        "discrepancy_records": discrepancy_records,
    }

def reconcile_currency_buckets(bucket_costs: Dict[str, float], total_target_cost: float) -> Dict[str, Dict[str, Any]]:
    """
    Applies the Largest Remainder Method (Hare-Niemeyer quota) across bucket costs
    to guarantee that sum(bucket_integers) == round(total_target_cost).
    Eliminates the 1-rupee rounding mismatch between headline and sub-tables.
    """
    if not bucket_costs:
        return {}

    total_target_int = int(round(total_target_cost))
    result: Dict[str, Dict[str, Any]] = {}
    remainders: List[tuple] = []
    allocated_sum = 0

    for key, val in bucket_costs.items():
        val_float = round(float(val), 2)
        base_int = int(math.floor(val_float))
        rem = val_float - base_int
        allocated_sum += base_int
        remainders.append((rem, key))
        result[key] = {
            "exact_cost": val_float,
            "display_int": base_int,
        }

    # Distribute remaining whole units to buckets with largest fractional parts
    diff = total_target_int - allocated_sum
    remainders.sort(key=lambda x: x[0], reverse=True)

    for i in range(min(diff, len(remainders))):
        key = remainders[i][1]
        result[key]["display_int"] += 1

    return result

def calculate_data_quality_score(records: List[Any]) -> Dict[str, Any]:
    """
    Computes a transparent, formulaic Data Quality & Audit Health score (0-100%).
    Factors:
    - Hotel association completeness (20%)
    - Meal session specified (15%)
    - Pax count presence (15%)
    - Mass balance reconciliation (20%)
    - Item cost presence (15%)
    - Verification / provenance (15%)
    """
    if not records:
        return {
            "score": 0.0,
            "rating": "No Data Recorded",
            "has_data": False,
            "total_records": 0,
            "missing_hotel_count": 0,
            "missing_session_count": 0,
            "missing_pax_count": 0,
            "unreconciled_count": 0,
            "missing_cost_count": 0,
            "unverified_count": 0,
        }

    n = len(records)
    missing_hotel = sum(1 for r in records if not getattr(r, "hotel_name", None))
    missing_session = sum(1 for r in records if not getattr(r, "session", None) or getattr(r, "session", "").lower() in ("general", "unknown", ""))
    missing_pax = sum(1 for r in records if not getattr(r, "pax", None) or getattr(r, "pax", 0) <= 0)
    missing_cost = sum(1 for r in records if getattr(r, "item_cost", 0.0) <= 0 and getattr(r, "waste_cost", 0.0) <= 0)
    unverified = sum(1 for r in records if not getattr(r, "is_verified", True))

    unreconciled = 0
    for r in records:
        l = float(getattr(r, "total_leftover_kg", 0.0) or 0.0)
        u = float(getattr(r, "reuse_quantity_kg", 0.0) or 0.0)
        w = float(getattr(r, "total_waste_kg", 0.0) or 0.0)
        o = float(getattr(r, "other_disposition_kg", 0.0) or 0.0)
        if abs(l - (u + w + o)) > 0.05:
            unreconciled += 1

    hotel_score = max(0.0, (1.0 - (missing_hotel / n))) * 20.0
    session_score = max(0.0, (1.0 - (missing_session / n))) * 15.0
    pax_score = max(0.0, (1.0 - (missing_pax / n))) * 15.0
    mass_balance_score = max(0.0, (1.0 - (unreconciled / n))) * 20.0
    cost_score = max(0.0, (1.0 - (missing_cost / n))) * 15.0
    verified_score = max(0.0, (1.0 - (unverified / n))) * 15.0

    total_score = round(hotel_score + session_score + pax_score + mass_balance_score + cost_score + verified_score, 1)

    if total_score >= 90.0:
        rating = "Excellent"
    elif total_score >= 75.0:
        rating = "Good"
    elif total_score >= 60.0:
        rating = "Needs Attention"
    else:
        rating = "Critical Action Required"

    return {
        "score": total_score,
        "rating": rating,
        "total_records": n,
        "missing_hotel_count": missing_hotel,
        "missing_session_count": missing_session,
        "missing_pax_count": missing_pax,
        "unreconciled_count": unreconciled,
        "missing_cost_count": missing_cost,
        "unverified_count": unverified,
    }

def build_comparison_payload(
    current_value: float,
    baseline_value: Optional[float],
    is_waste_metric: bool = False
) -> Dict[str, Any]:
    """
    Computes delta and percentage change against a true historical baseline.
    If baseline_value is None or <= 0, transparently returns has_baseline=False
    rather than fabricating synthetic changes or infinity.
    """
    curr = round(float(current_value), 2)
    if baseline_value is None or baseline_value <= 0:
        return {
            "current": curr,
            "previous": 0.0,
            "delta": 0.0,
            "percentage_change": 0.0,
            "is_positive_improvement": True,
            "has_baseline": False,
        }

    prev = round(float(baseline_value), 2)
    delta = round(curr - prev, 2)
    pct = round(((curr - prev) / prev * 100.0), 1) if prev > 0 else 0.0
    is_pos = (delta <= 0) if is_waste_metric else (delta >= 0)

    return {
        "current": curr,
        "previous": prev,
        "delta": delta,
        "percentage_change": pct,
        "is_positive_improvement": is_pos,
        "has_baseline": True,
    }
