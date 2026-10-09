import pytest
from datetime import date
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models.analytics_record import AnalyticsRecord
from app.models.event import Event
from app.models.hotel import Hotel
from app.models.event_category import EventCategory
from app.services.calculation_engine import calculate_core_waste_metrics, build_comparison_payload
from app.services.intelligence_engine import (
    generate_operational_intelligence,
    MIN_BASELINE_EVENTS,
    ELEVATED_WASTE_THRESHOLD_PCT,
    REDUCED_WASTE_THRESHOLD_PCT,
)

client = TestClient(app)

@pytest.fixture(scope="module")
def auth_token():
    response = client.post(
        "/api/auth/login",
        json={"email": settings.DEMO_EMAIL, "password": settings.DEMO_PASSWORD}
    )
    assert response.status_code == 200
    data = response.json()
    return data["access_token"]


class MockRecord:
    """Mock record helper for calculation and intelligence testing."""
    def __init__(self, **kwargs):
        self.id = kwargs.get("id", 1)
        self.record_date = kwargs.get("record_date", date(2026, 9, 1))
        self.hotel_name = kwargs.get("hotel_name", "Hotel Sitara")
        self.session = kwargs.get("session", "Dinner")
        self.event_name = kwargs.get("event_name", "Grand Gala")
        self.event_type = kwargs.get("event_type", "Wedding")
        self.dish_name = kwargs.get("dish_name", "Paneer Butter Masala")
        self.dish_category = kwargs.get("dish_category", "Main Course")
        self.pax = kwargs.get("pax", 200)
        self.actual_production_kg = kwargs.get("actual_production_kg", 50.0)
        self.actual_consumption_kg = kwargs.get("actual_consumption_kg", 40.0)
        self.kitchen_leftover_kg = kwargs.get("kitchen_leftover_kg", 5.0)
        self.location_buffet_return_kg = kwargs.get("location_buffet_return_kg", 5.0)
        self.total_leftover_kg = kwargs.get("total_leftover_kg", 10.0)
        self.reuse_quantity_kg = kwargs.get("reuse_quantity_kg", 4.0)
        self.total_waste_kg = kwargs.get("total_waste_kg", 6.0)
        self.waste_cost = kwargs.get("waste_cost", 900.0)
        self.estimated_production_kg = kwargs.get("estimated_production_kg", 50.0)
        self.item_cost = kwargs.get("item_cost", 150.0)
        self.service_type = kwargs.get("service_type", "Buffet")
        self.data_source = kwargs.get("data_source", "Excel Import")


# =============================================================================
# 1. CALCULATION ENGINE MATHEMATICAL ACCURACY TESTS
# =============================================================================
def test_calculation_engine_empty_records():
    res = calculate_core_waste_metrics([])
    assert res["total_prepared_kg"] == 0.0
    assert res["total_consumed_kg"] == 0.0
    assert res["total_waste_kg"] == 0.0
    assert res["waste_rate_pct"] == 0.0
    assert res["total_pax"] == 0
    assert res["waste_per_guest_g"] == 0.0


def test_calculation_engine_verified_math():
    r1 = MockRecord(
        actual_production_kg=100.0,
        actual_consumption_kg=80.0,
        kitchen_leftover_kg=10.0,
        location_buffet_return_kg=10.0,
        total_leftover_kg=20.0,
        reuse_quantity_kg=8.0,
        total_waste_kg=12.0,
        waste_cost=1800.0,
        pax=250,
    )
    r2 = MockRecord(
        actual_production_kg=50.0,
        actual_consumption_kg=40.0,
        kitchen_leftover_kg=5.0,
        location_buffet_return_kg=5.0,
        total_leftover_kg=10.0,
        reuse_quantity_kg=4.0,
        total_waste_kg=6.0,
        waste_cost=900.0,
        pax=250,  # Same shift, should NOT double-count pax
    )
    res = calculate_core_waste_metrics([r1, r2])

    assert res["total_prepared_kg"] == 150.0
    assert res["total_consumed_kg"] == 120.0
    assert res["total_waste_kg"] == 18.0
    assert res["total_waste_cost"] == 2700.0
    assert res["total_reuse_kg"] == 12.0
    # Waste rate = (18 / 150) * 100 = 12.0%
    assert res["waste_rate_pct"] == 12.0
    # Consumption rate = (120 / 150) * 100 = 80.0%
    assert res["consumption_rate_pct"] == 80.0
    # Reuse rate = (12 / 30) * 100 = 40.0%
    assert res["reuse_rate_pct"] == 40.0
    # Pax deduplicated across same shift:
    assert res["total_pax"] == 250
    # Waste per guest = 18 kg / 250 * 1000 = 72.0 g
    assert res["waste_per_guest_g"] == 72.0


def test_comparison_payload_no_baseline():
    payload = build_comparison_payload(current_value=125.5, baseline_value=None)
    assert payload["has_baseline"] is False
    assert payload["delta"] == 0.0
    assert payload["percentage_change"] == 0.0
    assert payload["current"] == 125.5


def test_comparison_payload_with_real_baseline():
    payload = build_comparison_payload(current_value=120.0, baseline_value=100.0, is_waste_metric=True)
    assert payload["has_baseline"] is True
    assert payload["delta"] == 20.0
    assert payload["percentage_change"] == 20.0
    # For waste, an increase is NOT a positive improvement:
    assert payload["is_positive_improvement"] is False


# =============================================================================
# 2. INTELLIGENCE ENGINE SITUATIONS 1 THROUGH 9 TESTS
# =============================================================================
def test_intelligence_situation_1_empty_records():
    res = generate_operational_intelligence(
        records=[],
        filter_context={"hotel_name": "Hotel Sitara", "date_display": "2026-09-01"}
    )
    assert res["has_baseline"] is False
    assert len(res["insights"]) == 1
    ins = res["insights"][0]
    assert ins["id"] == "ins-empty-1"
    assert "No Records Match Filter Criteria" in ins["title"]
    assert "Adjust or clear" in ins["recommendation"]


def test_intelligence_situation_2_insufficient_baseline():
    # Provide records, but no comparable historical baseline (0 baseline events < 3 threshold)
    rec = MockRecord(actual_production_kg=100.0, total_waste_kg=10.0)
    res = generate_operational_intelligence(
        records=[rec],
        filter_context={"hotel_name": "Hotel Sitara"},
        baseline_records=[]  # Empty baseline
    )
    assert res["has_baseline"] is False
    baseline_ins = next((i for i in res["insights"] if i["id"] == "ins-baseline-unavailable"), None)
    assert baseline_ins is not None
    assert f"A minimum of {MIN_BASELINE_EVENTS} comparable historical events are required" in baseline_ins["observation"]


def test_intelligence_situation_3_elevated_waste():
    # Current waste rate: 30% (30kg / 100kg)
    curr_rec = MockRecord(id=101, actual_production_kg=100.0, total_waste_kg=30.0, waste_cost=4500.0)
    # Baseline with 3 events averaging 10% waste rate (10kg / 100kg)
    b1 = MockRecord(id=1, record_date=date(2026, 8, 1), session="Lunch", actual_production_kg=100.0, total_waste_kg=10.0)
    b2 = MockRecord(id=2, record_date=date(2026, 8, 2), session="Dinner", actual_production_kg=100.0, total_waste_kg=10.0)
    b3 = MockRecord(id=3, record_date=date(2026, 8, 3), session="Breakfast", actual_production_kg=100.0, total_waste_kg=10.0)

    res = generate_operational_intelligence(
        records=[curr_rec],
        filter_context={"hotel_name": "Hotel Sitara"},
        baseline_records=[b1, b2, b3]
    )
    assert res["has_baseline"] is True
    elevated_ins = next((i for i in res["insights"] if i["id"] == "ins-waste-elevated"), None)
    assert elevated_ins is not None
    assert "Elevated Waste Generation" in elevated_ins["title"]
    assert elevated_ins["priority"] == "Critical"


def test_intelligence_situation_4_reduced_waste():
    # Current waste rate: 5% (5kg / 100kg)
    curr_rec = MockRecord(id=101, actual_production_kg=100.0, total_waste_kg=5.0)
    # Baseline with 3 events averaging 15% waste rate
    b1 = MockRecord(id=1, record_date=date(2026, 8, 1), session="Lunch", actual_production_kg=100.0, total_waste_kg=15.0)
    b2 = MockRecord(id=2, record_date=date(2026, 8, 2), session="Dinner", actual_production_kg=100.0, total_waste_kg=15.0)
    b3 = MockRecord(id=3, record_date=date(2026, 8, 3), session="Breakfast", actual_production_kg=100.0, total_waste_kg=15.0)

    res = generate_operational_intelligence(
        records=[curr_rec],
        filter_context={"hotel_name": "Hotel Sitara"},
        baseline_records=[b1, b2, b3]
    )
    assert res["has_baseline"] is True
    reduced_ins = next((i for i in res["insights"] if i["id"] == "ins-waste-reduced"), None)
    assert reduced_ins is not None
    assert "Waste Below Historical Baseline" in reduced_ins["title"]
    assert reduced_ins["priority"] == "Performing Well"


def test_intelligence_situation_5_normal_baseline_adherence():
    # Current waste rate: 10.5% (10.5kg / 100kg) vs Baseline 10% (+5% variance, within ±20%)
    curr_rec = MockRecord(id=101, actual_production_kg=100.0, total_waste_kg=10.5)
    b1 = MockRecord(id=1, record_date=date(2026, 8, 1), session="Lunch", actual_production_kg=100.0, total_waste_kg=10.0)
    b2 = MockRecord(id=2, record_date=date(2026, 8, 2), session="Dinner", actual_production_kg=100.0, total_waste_kg=10.0)
    b3 = MockRecord(id=3, record_date=date(2026, 8, 3), session="Breakfast", actual_production_kg=100.0, total_waste_kg=10.0)

    res = generate_operational_intelligence(
        records=[curr_rec],
        filter_context={"hotel_name": "Hotel Sitara"},
        baseline_records=[b1, b2, b3]
    )
    normal_ins = next((i for i in res["insights"] if i["id"] == "ins-waste-normal"), None)
    assert normal_ins is not None
    assert "Waste Generation In Line With Baseline" in normal_ins["title"]


def test_intelligence_situation_6_and_7_missing_data_warnings():
    # Pax = 0 and actual_production_kg = 0
    rec = MockRecord(pax=0, actual_production_kg=0.0, total_waste_kg=0.0, waste_cost=0.0)
    res = generate_operational_intelligence(
        records=[rec],
        filter_context={"hotel_name": "Hotel Sitara"},
        baseline_records=[]
    )
    pax_ins = next((i for i in res["insights"] if i["id"] == "ins-missing-pax"), None)
    prep_ins = next((i for i in res["insights"] if i["id"] == "ins-missing-prep"), None)
    assert pax_ins is not None
    assert "Guest Headcount (PAX) Missing" in pax_ins["title"]
    assert prep_ins is not None
    assert "Prepared Quantity Missing" in prep_ins["title"]


def test_intelligence_situation_8_and_9_cost_and_diversion():
    # Cost present and Food Reuse logged
    rec = MockRecord(
        dish_name="Mutton Biryani",
        dish_category="Rice",
        actual_production_kg=80.0,
        total_waste_kg=12.0,
        waste_cost=3600.0,
        reuse_quantity_kg=5.0,
        total_leftover_kg=17.0,
    )
    res = generate_operational_intelligence(
        records=[rec],
        filter_context={"hotel_name": "Hotel Sitara"},
        baseline_records=[]
    )
    cost_ins = next((i for i in res["insights"] if i["id"] == "ins-cost-impact"), None)
    reuse_ins = next((i for i in res["insights"] if i["id"] == "ins-reuse-diversion"), None)
    top_dish_ins = next((i for i in res["insights"] if i["id"] == "ins-top-dish"), None)

    assert cost_ins is not None
    assert "Procurement Loss: ₹3,600" in cost_ins["title"]
    assert reuse_ins is not None
    assert "5.0 kg Diverted via Safe Food Reuse" in reuse_ins["title"]
    assert top_dish_ins is not None
    assert "Top Discard Item: Mutton Biryani" in top_dish_ins["title"]


# =============================================================================
# 3. END-TO-END ANALYTICS ROUTE FILTERING & CATEGORY PERSISTENCE TESTS
# =============================================================================
def test_analytics_overview_multi_level_filtering(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}

    # Level 1: Overall consolidated overview
    resp_all = client.get("/api/analytics/overview?hotel=all", headers=headers)
    assert resp_all.status_code == 200
    data_all = resp_all.json()
    assert "kpis" in data_all
    assert "filter_options" in data_all
    assert "filter_context" in data_all
    assert "insights" in data_all

    # Level 2: Hotel-wise isolation
    resp_sahara = client.get("/api/analytics/overview?hotel=Hotel Sahara", headers=headers)
    assert resp_sahara.status_code == 200
    data_sahara = resp_sahara.json()

    resp_sitara = client.get("/api/analytics/overview?hotel=Hotel Sitara", headers=headers)
    assert resp_sitara.status_code == 200
    data_sitara = resp_sitara.json()

    # Sahara records must only belong to Sahara
    for r in data_sahara["raw_records"]:
        assert r["hotel"] == "Hotel Sahara"

    # Sitara records must only belong to Sitara
    for r in data_sitara["raw_records"]:
        assert r["hotel"] == "Hotel Sitara"

    # Filter dependency rule: event options for Sitara must only contain Sitara events
    sitara_events = [e["name"] for e in data_sitara["filter_options"]["events"]]
    for ev in sitara_events:
        assert "Sahara" not in ev

    # Level 3: Event-wise isolation
    resp_event = client.get("/api/analytics/overview?event_id=Sarala", headers=headers)
    assert resp_event.status_code == 200
    data_event = resp_event.json()
    for r in data_event["raw_records"]:
        assert "Sarala" in r["event_name"]


def test_custom_event_category_persistence_and_filtering(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    test_cat_name = "Global Leadership Summit"

    # Clean up if already exists from prior test runs
    db = SessionLocal()
    db.query(EventCategory).filter(EventCategory.name == test_cat_name).delete()
    db.commit()
    db.close()

    # Step 1: Create a custom event category via POST
    custom_cat_payload = {
        "name": test_cat_name,
        "description": "High-level political and business delegation summit"
    }
    create_cat_resp = client.post("/api/events/categories", json=custom_cat_payload, headers=headers)
    assert create_cat_resp.status_code == 201
    created_cat = create_cat_resp.json()
    assert created_cat["name"] == test_cat_name
    assert created_cat["is_builtin"] is False

    # Step 2: Verify custom category is returned in GET /api/events/categories
    list_cat_resp = client.get("/api/events/categories", headers=headers)
    assert list_cat_resp.status_code == 200
    cat_names = [c["name"] for c in list_cat_resp.json()]
    assert test_cat_name in cat_names
    assert "Corporate" in cat_names
    assert "Wedding" in cat_names

    # Step 3: Verify it appears in filter_options.event_types on /api/analytics/overview
    overview_resp = client.get("/api/analytics/overview", headers=headers)
    assert overview_resp.status_code == 200
    overview_event_types = overview_resp.json()["filter_options"]["event_types"]
    assert test_cat_name in overview_event_types

    # Step 4: Verify filtering by event_type works cleanly
    filter_cat_resp = client.get(f"/api/analytics/overview?event_type={test_cat_name}", headers=headers)
    assert filter_cat_resp.status_code == 200
    data_cat = filter_cat_resp.json()
    assert data_cat["filter_context"]["active_event_type"] == test_cat_name


def test_event_types_cross_event_comparison(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    resp = client.get("/api/analytics/event-types", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    # Verify categories list contains canonical event types
    categories = data.get("categories", [])
    cat_names = [c["category"] for c in categories]
    assert "Wedding" in cat_names
    assert "Corporate" in cat_names

    # Verify cross_event_comparison structure
    cross_comp = data.get("cross_event_comparison")
    assert cross_comp is not None
    assert "headline" in cross_comp
    assert "core_finding" in cross_comp
    assert "profiles" in cross_comp
    assert "head_to_head_comparisons" in cross_comp

    # Check profiles list
    profiles = cross_comp["profiles"]
    profile_types = [p["event_type"] for p in profiles]
    assert "Corporate" in profile_types
    assert "Wedding" in profile_types

    corp_profile = next(p for p in profiles if p["event_type"] == "Corporate")
    assert "eaten_more" in corp_profile
    assert "eaten_less" in corp_profile
    assert "behavior_summary" in corp_profile
    assert "kitchen_guidance" in corp_profile

    # Verify dish_consumption_analysis exists on categories
    wedding_cat = next(c for c in categories if c["category"] == "Wedding")
    assert "dish_consumption_analysis" in wedding_cat
    assert "most_consumed" in wedding_cat["dish_consumption_analysis"]
    assert "least_consumed" in wedding_cat["dish_consumption_analysis"]

    # Verify dish_comparison_matrix exists with cross-event breakdown
    matrix = data.get("dish_comparison_matrix", [])
    assert len(matrix) > 0
    first_item = matrix[0]
    assert "dish_name" in first_item
    assert "categories" in first_item
    assert "highest_waste_category" in first_item
    assert "lowest_waste_category" in first_item
    assert "matched_aliases" in first_item
    assert "key_takeaway" in first_item
    assert "recommendation" in first_item

    # Verify chart data structures
    grouped_charts = data.get("grouped_dish_chart_data", [])
    assert len(grouped_charts) > 0
    assert "dish_name" in grouped_charts[0]

    guest_charts = data.get("waste_per_guest_chart_data", [])
    assert len(guest_charts) > 0
    assert "category" in guest_charts[0]
    assert "waste_per_guest_g" in guest_charts[0]

    financial_charts = data.get("financial_impact_chart_data", [])
    assert len(financial_charts) > 0
    assert "dish_name" in financial_charts[0]
    assert "total_waste_cost" in financial_charts[0]

    heatmap = data.get("dish_waste_heatmap", [])
    assert len(heatmap) > 0
    assert "dish_name" in heatmap[0]
    assert "cells" in heatmap[0]

    # Verify data_quality_audit
    dq_audit = data.get("data_quality_audit")
    assert dq_audit is not None
    assert "total_records_audited" in dq_audit
    assert "flagged_records_count" in dq_audit
    assert "anomalies" in dq_audit

    # Verify operational_intelligence
    op_intel = data.get("operational_intelligence")
    assert op_intel is not None
    assert "executive_summary" in op_intel
    assert "insights" in op_intel



