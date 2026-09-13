import pytest
from app.services.calculation import (
    calculate_net_weight,
    calculate_waste_percentage,
    calculate_waste_cost,
    calculate_waste_per_guest,
    calculate_event_summary,
    validate_weights,
    CalculationError,
)

def test_net_weight_basic_calculation():
    # Prompt specific requirement: 18.6 - 3.1 = 15.5 kg
    gross = 18.6
    tare = 3.1
    net = calculate_net_weight(gross, tare)
    assert net == 15.5

def test_container_greater_than_gross_rejected():
    with pytest.raises(CalculationError, match="Container.*cannot exceed gross"):
        calculate_net_weight(5.0, 6.0)

def test_negative_gross_rejected():
    with pytest.raises(CalculationError, match="Gross weight cannot be negative"):
        calculate_net_weight(-1.0, 0.5)

def test_negative_container_rejected():
    with pytest.raises(CalculationError, match="Container weight cannot be negative"):
        calculate_net_weight(10.0, -2.0)

def test_prepared_weight_zero_or_negative_rejected():
    with pytest.raises(CalculationError, match="Prepared weight must be greater than zero"):
        validate_weights(10.0, 2.0, prepared_weight=0.0)
    with pytest.raises(CalculationError, match="Prepared weight must be greater than zero"):
        validate_weights(10.0, 2.0, prepared_weight=-5.0)

def test_waste_percentage():
    # 15.5 kg waste from 90 kg prepared
    net = 15.5
    prepared = 90.0
    pct = calculate_waste_percentage(net, prepared)
    assert pct == 17.22

def test_waste_percentage_zero_prepared():
    pct = calculate_waste_percentage(15.5, 0.0)
    assert pct == 0.0

def test_waste_cost():
    # 15.5 kg at ₹180/kg = ₹2,790
    net = 15.5
    cost_per_kg = 180.0
    cost = calculate_waste_cost(net, cost_per_kg)
    assert cost == 2790.0

def test_waste_per_guest():
    total_waste = 42.0
    guests = 467
    waste_kg = calculate_waste_per_guest(total_waste, guests)
    # 42 / 467 = ~0.0899 kg = ~89.9 grams
    assert round(waste_kg * 1000, 1) == 89.9

def test_waste_per_guest_zero_or_none():
    assert calculate_waste_per_guest(42.0, 0) == 0.0
    assert calculate_waste_per_guest(42.0, None) == 0.0
    assert calculate_waste_per_guest(42.0, -10) == 0.0
