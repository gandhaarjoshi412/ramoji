from typing import Optional, Dict, Any, List

class CalculationError(ValueError):
    """Domain exception raised when weight calculation or validation fails."""
    pass

def validate_weights(
    gross_weight: float,
    container_weight: float,
    prepared_weight: Optional[float] = None
) -> None:
    """
    Validates gross, container, and prepared weights according to hotel food waste rules:
    - Gross weight >= 0
    - Container weight >= 0
    - Container weight cannot exceed gross weight (which would cause negative net weight)
    - If prepared_weight is provided, it must be > 0 (or >= 0 depending on check)
    """
    if gross_weight < 0:
        raise CalculationError("Gross weight cannot be negative.")
    if container_weight < 0:
        raise CalculationError("Container weight cannot be negative.")
    if container_weight > gross_weight:
        raise CalculationError("Container (tare) weight cannot exceed gross weight.")
    if prepared_weight is not None and prepared_weight <= 0:
        raise CalculationError("Prepared weight must be greater than zero.")

def calculate_net_weight(gross_weight: float, container_weight: float) -> float:
    """
    Calculates net leftover weight = gross_weight - container_weight.
    Rounds to 3 decimal places for precision while preventing negative values.
    """
    validate_weights(gross_weight, container_weight)
    net = round(gross_weight - container_weight, 3)
    if net < 0:
        raise CalculationError("Net leftover weight cannot be negative.")
    return net

def calculate_waste_percentage(net_weight: float, prepared_weight: float) -> float:
    """
    Calculates waste percentage: (net_weight / prepared_weight) * 100.
    Handles zero/negative prepared weight gracefully.
    Returns percentage rounded to 2 decimal places.
    """
    if prepared_weight <= 0:
        return 0.0
    return round((net_weight / prepared_weight) * 100.0, 2)

def calculate_waste_cost(net_weight: float, estimated_cost_per_kg: float) -> float:
    """
    Calculates estimated monetary loss from waste:
    waste_cost = net_weight * estimated_cost_per_kg
    """
    if net_weight < 0 or estimated_cost_per_kg < 0:
        raise CalculationError("Weights and cost per kg cannot be negative.")
    return round(net_weight * estimated_cost_per_kg, 2)

def calculate_waste_per_guest(total_waste_kg: float, actual_guests: Optional[int]) -> float:
    """
    Calculates waste per guest in kg.
    Handles zero guests, None, or negative guests safely.
    """
    if not actual_guests or actual_guests <= 0:
        return 0.0
    return round(total_waste_kg / actual_guests, 4)

def calculate_event_summary(
    event_foods: List[Any],
    actual_guests: int = 0
) -> Dict[str, Any]:
    """
    Calculates comprehensive waste metrics for an event:
    - total_prepared_kg
    - total_waste_kg
    - overall_waste_percentage
    - total_waste_cost
    - waste_per_guest_kg
    - waste_per_guest_grams
    - items_count
    - recorded_items_count
    """
    total_prepared_kg = 0.0
    total_waste_kg = 0.0
    total_waste_cost = 0.0
    items_count = len(event_foods)
    recorded_items_count = 0

    for ef in event_foods:
        prepared = float(ef.prepared_weight_kg or 0.0)
        cost_per_kg = float(ef.estimated_cost_per_kg or 0.0)
        total_prepared_kg += prepared

        # Sum waste records for this event food
        item_net_waste = sum(float(w.net_weight_kg) for w in ef.waste_records)
        if len(ef.waste_records) > 0:
            recorded_items_count += 1

        total_waste_kg += item_net_waste
        total_waste_cost += item_net_waste * cost_per_kg

    overall_waste_pct = (
        round((total_waste_kg / total_prepared_kg) * 100.0, 2)
        if total_prepared_kg > 0
        else 0.0
    )
    
    waste_per_guest_kg = (
        round(total_waste_kg / actual_guests, 4)
        if actual_guests and actual_guests > 0
        else 0.0
    )
    waste_per_guest_grams = round(waste_per_guest_kg * 1000.0, 1)

    return {
        "total_prepared_kg": round(total_prepared_kg, 2),
        "total_waste_kg": round(total_waste_kg, 2),
        "overall_waste_percentage": overall_waste_pct,
        "total_waste_cost": round(total_waste_cost, 2),
        "waste_per_guest_kg": waste_per_guest_kg,
        "waste_per_guest_grams": waste_per_guest_grams,
        "items_count": items_count,
        "recorded_items_count": recorded_items_count,
    }
