import pytest
from app.services.calculation_engine import (
    calculate_core_waste_metrics,
    reconcile_currency_buckets,
    calculate_data_quality_score,
    build_comparison_payload,
)

class MockRecord:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

def test_mass_balance_audit_and_example1_discrepancy():
    """
    Example 1 Audit:
    Total leftovers: 529.18 kg
    Safely reused: 218.50 kg
    Final discarded waste: 304.98 kg
    218.50 + 304.98 = 523.48 kg. Discrepancy is 5.70 kg.
    Verify that calculate_core_waste_metrics cleanly flags this as leftover_reconciliation_variance_kg
    instead of masking it.
    """
    # Create record reflecting Example 1
    rec = MockRecord(
        id=1,
        dish_name="Mixed Vegetable Pulao",
        hotel_name="Hotel Sahara",
        event_name="Banquet Service",
        session="Lunch",
        record_date="2026-08-24",
        actual_production_kg=1000.0,
        actual_consumption_kg=470.82,
        total_leftover_kg=529.18,
        reuse_quantity_kg=218.50,
        total_waste_kg=304.98,
        other_disposition_kg=0.0,
        waste_cost=25000.0,
        pax=200,
        item_cost=150.0,
        is_verified=True,
    )

    metrics = calculate_core_waste_metrics([rec])
    assert metrics["total_leftover_kg"] == 529.18
    assert metrics["total_reuse_kg"] == 218.50
    assert metrics["total_waste_kg"] == 304.98
    # Leftover variance: 529.18 - (218.50 + 304.98) = 5.70 kg
    assert abs(metrics["leftover_reconciliation_variance_kg"] - 5.70) < 0.01
    assert metrics["mass_balance_reconciled"] is False
    assert len(metrics["discrepancy_records"]) == 1
    assert metrics["discrepancy_records"][0]["unaccounted_variance_kg"] == 5.70

def test_currency_reconciliation_largest_remainder_example2():
    """
    Example 2 Audit:
    Displayed session costs: ₹3,287, ₹12,626, ₹6,869, and ₹413 -> total 23,195
    whereas headline displays 23,194.
    Test that reconcile_currency_buckets guarantees sum(display_int) == int(round(total_target_cost)).
    """
    # Raw float values that lead to the rounding discrepancy:
    raw_sessions = {
        "Breakfast": 3286.70,
        "Lunch": 12625.60,
        "Dinner": 6868.60,
        "Hi-Tea": 412.50,
    }
    # Sum of raw floats: 3286.7 + 12625.6 + 6868.6 + 412.5 = 23193.4 (or 23194 target)
    total_target = sum(raw_sessions.values())
    target_int = int(round(total_target))

    reconciled = reconcile_currency_buckets(raw_sessions, total_target)
    session_sum = sum(v["display_int"] for v in reconciled.values())
    assert session_sum == target_int, f"Expected {target_int}, got {session_sum}"

def test_data_quality_scoring_formula():
    """
    Verifies that calculate_data_quality_score computes a transparent score (0-100%)
    penalizing missing fields and unreconciled balances.
    """
    # Perfect record
    perfect = [MockRecord(
        hotel_name="Hotel Sahara",
        session="Lunch",
        pax=150,
        total_leftover_kg=50.0,
        reuse_quantity_kg=20.0,
        total_waste_kg=30.0,
        other_disposition_kg=0.0,
        item_cost=100.0,
        waste_cost=3000.0,
        is_verified=True,
    )]
    res = calculate_data_quality_score(perfect)
    assert res["score"] == 100.0
    assert res["rating"] == "Excellent"

    # Imperfect record with missing pax and broken mass balance
    imperfect = [MockRecord(
        hotel_name="Hotel Sahara",
        session="Lunch",
        pax=0,  # missing pax
        total_leftover_kg=100.0,
        reuse_quantity_kg=20.0,
        total_waste_kg=30.0,  # 100 - 50 = 50kg discrepancy
        other_disposition_kg=0.0,
        item_cost=0.0,
        waste_cost=0.0,
        is_verified=False,
    )]
    res_imp = calculate_data_quality_score(imperfect)
    assert res_imp["score"] < 70.0
    assert res_imp["missing_pax_count"] == 1
    assert res_imp["unreconciled_count"] == 1

def test_comparison_payload_no_fabricated_percentages():
    """
    Test that build_comparison_payload does not invent fake multipliers or 100%
    when no baseline exists.
    """
    no_base = build_comparison_payload(current_value=45.0, baseline_value=None)
    assert no_base["has_baseline"] is False
    assert no_base["delta"] == 0.0
    assert no_base["percentage_change"] == 0.0

    with_base = build_comparison_payload(current_value=40.0, baseline_value=50.0, is_waste_metric=True)
    assert with_base["has_baseline"] is True
    assert with_base["delta"] == -10.0
    assert with_base["percentage_change"] == -20.0
    assert with_base["is_positive_improvement"] is True  # Lower waste is good


def test_event_delete_impact_and_soft_delete_restore_workflow():
    """
    Integration test verifying:
    1. Creating an event with metadata and food items
    2. Querying GET /api/events/{id}/delete-impact audits linked items
    3. Soft deletion DELETE /api/events/{id} hides it from active listing
    4. Restoring POST /api/events/{id}/restore brings it back to active state
    """
    from fastapi.testclient import TestClient
    from app.main import app
    from app.config import settings

    client = TestClient(app)
    login_res = client.post("/api/auth/login", json={"email": settings.DEMO_EMAIL, "password": settings.DEMO_PASSWORD})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Event
    ev_payload = {
        "name": "Audit Grand Gala Banquet",
        "hotel_id": 1,
        "event_date": "2026-10-09",
        "event_type": "Corporate",
        "event_subtype": "Annual Gala",
        "service_format": "Buffet",
        "client_name": "Tech Corp",
        "expected_guests": 250,
        "actual_guests": 230,
        "notes": "Testing audit delete impact",
        "dishes": [
            {
                "name": "Audit Paneer Butter Masala",
                "category": "Main Course",
                "session": "Dinner",
                "service_format": "Buffet",
                "prepared_weight_kg": 50.0,
                "consumed_weight_kg": 40.0,
                "leftover_weight_kg": 10.0,
                "reuse_weight_kg": 4.0,
                "waste_weight_kg": 6.0,
                "cost_per_kg": 250.0,
                "waste_cost": 1500.0,
            }
        ]
    }
    create_res = client.post("/api/events", json=ev_payload, headers=headers)
    assert create_res.status_code == 201, create_res.text
    event_data = create_res.json()
    event_id = event_data["id"]

    # 2. Check Delete Impact
    impact_res = client.get(f"/api/events/{event_id}/delete-impact", headers=headers)
    assert impact_res.status_code == 200
    impact = impact_res.json()
    assert impact["event_id"] == event_id
    assert impact["event_name"] == "Audit Grand Gala Banquet"
    assert impact["food_items_count"] >= 1

    # 3. Perform Soft Delete
    del_res = client.delete(f"/api/events/{event_id}", headers=headers)
    assert del_res.status_code == 204

    # Verify event is NOT in active listing
    list_res = client.get("/api/events", headers=headers)
    assert list_res.status_code == 200
    active_ids = [e["id"] for e in list_res.json()]
    assert event_id not in active_ids

    # Verify individual GET returns 404 for archived event
    get_res = client.get(f"/api/events/{event_id}", headers=headers)
    assert get_res.status_code == 404

    # 4. Restore Event
    restore_res = client.post(f"/api/events/{event_id}/restore", headers=headers)
    assert restore_res.status_code == 200
    assert restore_res.json()["is_archived"] is False

    # Verify event is back in active listing
    list_res2 = client.get("/api/events", headers=headers)
    assert list_res2.status_code == 200
    active_ids2 = [e["id"] for e in list_res2.json()]
    assert event_id in active_ids2

