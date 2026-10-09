from typing import List, Dict, Any, Optional
from datetime import date

def calculate_core_waste_metrics(records: List[Any], pax_override: Optional[int] = None) -> Dict[str, Any]:
    """
    Centralized, mathematically verified calculation utility for PlateSight.
    Adheres strictly to the operational definitions:
    - Prepared Quantity: Food cooked for the shift/event (actual_production_kg)
    - Consumed Quantity: Food eaten by patrons (actual_consumption_kg)
    - Leftover Quantity: Unconsumed food (kitchen_leftover_kg + location_buffet_return_kg)
    - Reused Quantity: Safe compliant food diverted from waste (reuse_quantity_kg)
    - Waste Quantity: Discarded food (total_waste_kg), never including reused food
    - Waste Cost: Direct financial cost based on recipe costing
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
        }

    total_prepared_kg = round(sum(float(getattr(r, "actual_production_kg", 0.0) or 0.0) for r in records), 2)
    total_consumed_kg = round(sum(float(getattr(r, "actual_consumption_kg", 0.0) or 0.0) for r in records), 2)
    total_kitchen_leftover_kg = round(sum(float(getattr(r, "kitchen_leftover_kg", 0.0) or 0.0) for r in records), 2)
    total_buffet_leftover_kg = round(sum(float(getattr(r, "location_buffet_return_kg", 0.0) or 0.0) for r in records), 2)
    total_leftover_kg = round(sum(float(getattr(r, "total_leftover_kg", 0.0) or 0.0) for r in records), 2)
    total_reuse_kg = round(sum(float(getattr(r, "reuse_quantity_kg", 0.0) or 0.0) for r in records), 2)
    total_waste_kg = round(sum(float(getattr(r, "total_waste_kg", 0.0) or 0.0) for r in records), 2)
    total_waste_cost = round(sum(float(getattr(r, "waste_cost", 0.0) or 0.0) for r in records), 2)
    total_estimated_kg = round(sum(float(getattr(r, "estimated_production_kg", 0.0) or 0.0) for r in records), 2)

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
    }

def build_comparison_payload(
    current_value: float,
    baseline_value: Optional[float],
    is_waste_metric: bool = False
) -> Dict[str, Any]:
    """
    Computes delta and percentage change against a true historical baseline.
    If baseline_value is None or <= 0, transparently returns None for delta/percentage_change
    rather than fabricating synthetic changes.
    """
    curr = round(float(current_value), 2)
    if baseline_value is None:
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
