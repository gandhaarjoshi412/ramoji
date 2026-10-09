"""
Automated End-to-End Test Suite for Enterprise Excel Ingestion & Analytics Pipeline.
Tests all 8 synthetic fixtures (Fixtures A through H) against the independent oracle,
verifying parsing precision, duplicate handling, database persistence, and analytics consistency.
"""
import io
import time
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.models.analytics_record import AnalyticsRecord
from tests.fixtures.synthetic_reports_generator import generate_all_fixtures
from tests.fixtures.ground_truth_oracle import FIXTURE_ORACLE
from app.services.intelligent_report_parser import (
    analyze_report_file,
    parse_and_normalize_report,
)

client = TestClient(app)

@pytest.fixture(scope="module")
def auth_headers():
    response = client.post(
        "/api/auth/login",
        json={"email": settings.DEMO_EMAIL, "password": settings.DEMO_PASSWORD}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def fixtures_data():
    return generate_all_fixtures()

# =========================================================================
# 1. PARSER ENGINE UNIT TESTS AGAINST INDEPENDENT ORACLE
# =========================================================================

def test_fixture_a_clean_against_oracle(fixtures_data):
    oracle = FIXTURE_ORACLE["fixture_a_clean"]
    content = fixtures_data[oracle["filename"]]
    
    analysis = analyze_report_file(content, oracle["filename"])
    assert analysis["sheet_count"] == oracle["sheet_count"]
    assert analysis["total_records"] == oracle["expected_records"]
    
    records, warnings = parse_and_normalize_report(content, oracle["filename"])
    assert len(records) == oracle["expected_records"]
    
    total_prod = round(sum(r["actual_production_kg"] for r in records), 2)
    total_cons = round(sum(r["actual_consumption_kg"] for r in records), 2)
    total_left = round(sum(r["total_leftover_kg"] for r in records), 2)
    total_reuse = round(sum(r["reuse_quantity_kg"] for r in records), 2)
    total_waste = round(sum(r["total_waste_kg"] for r in records), 2)
    total_cost = round(sum(r["waste_cost"] for r in records), 2)
    
    assert total_prod == oracle["expected_production_kg"]
    assert total_cons == oracle["expected_consumed_kg"]
    assert total_left == oracle["expected_leftover_kg"]
    assert total_reuse == oracle["expected_reuse_kg"]
    assert total_waste == oracle["expected_waste_kg"]
    assert total_cost == oracle["expected_waste_cost"]
    
    # Mathematical Mass-Balance verification
    assert total_prod == round(total_cons + total_left, 2)
    assert total_left == round(total_reuse + total_waste, 2)

def test_fixture_b_multisheet_against_oracle(fixtures_data):
    oracle = FIXTURE_ORACLE["fixture_b_multisheet"]
    content = fixtures_data[oracle["filename"]]
    
    analysis = analyze_report_file(content, oracle["filename"])
    assert analysis["sheet_count"] == oracle["sheet_count"]
    assert analysis["total_records"] == oracle["expected_records"]
    
    records, _ = parse_and_normalize_report(content, oracle["filename"])
    assert len(records) == oracle["expected_records"]
    
    total_prod = round(sum(r["actual_production_kg"] for r in records), 2)
    total_waste = round(sum(r["total_waste_kg"] for r in records), 2)
    total_cost = round(sum(r["waste_cost"] for r in records), 2)
    
    assert total_prod == oracle["expected_production_kg"]
    assert total_waste == oracle["expected_waste_kg"]
    assert total_cost == oracle["expected_waste_cost"]
    
    # Test per-sheet breakdown
    for sheet_name, sheet_spec in oracle["sheet_breakdown"].items():
        sheet_recs, _ = parse_and_normalize_report(content, oracle["filename"], sheet_name_filter=sheet_name)
        assert len(sheet_recs) == sheet_spec["records"]
        sheet_prod = round(sum(r["actual_production_kg"] for r in sheet_recs), 2)
        sheet_waste = round(sum(r["total_waste_kg"] for r in sheet_recs), 2)
        assert sheet_prod == sheet_spec["production_kg"]
        assert sheet_waste == sheet_spec["waste_kg"]

def test_fixture_c_multipage_complex_against_oracle(fixtures_data):
    oracle = FIXTURE_ORACLE["fixture_c_multipage_complex"]
    content = fixtures_data[oracle["filename"]]
    
    analysis = analyze_report_file(content, oracle["filename"])
    assert analysis["sheet_count"] == oracle["sheet_count"]
    assert analysis["total_records"] == oracle["expected_records"]
    
    records, _ = parse_and_normalize_report(content, oracle["filename"])
    # Verifies all 125 dishes parsed across 5 pages with repeated headers & subtotals skipped
    assert len(records) == oracle["expected_records"]
    
    total_prod = round(sum(r["actual_production_kg"] for r in records), 2)
    total_waste = round(sum(r["total_waste_kg"] for r in records), 2)
    total_cost = round(sum(r["waste_cost"] for r in records), 2)
    
    assert total_prod == oracle["expected_production_kg"]
    assert total_waste == oracle["expected_waste_kg"]
    assert total_cost == oracle["expected_waste_cost"]
    
    # Verify no subtotals or grand totals were inserted as dishes
    dish_names = [r["dish_name"].lower() for r in records]
    assert not any("subtotal" in name for name in dish_names)
    assert not any("grand total" in name for name in dish_names)
    assert not any("particulars" in name for name in dish_names)
    assert not any("cooked food report" in name for name in dish_names)

def test_fixture_d_poorly_structured_against_oracle(fixtures_data):
    oracle = FIXTURE_ORACLE["fixture_d_poorly_structured"]
    content = fixtures_data[oracle["filename"]]
    
    records, _ = parse_and_normalize_report(content, oracle["filename"])
    assert len(records) == oracle["expected_records"]
    
    total_prod = round(sum(r["actual_production_kg"] for r in records), 2)
    total_waste = round(sum(r["total_waste_kg"] for r in records), 2)
    total_cost = round(sum(r["waste_cost"] for r in records), 2)
    
    assert total_prod == oracle["expected_production_kg"]
    assert total_waste == oracle["expected_waste_kg"]
    assert total_cost == oracle["expected_waste_cost"]

def test_fixture_e_ambiguous_fields_against_oracle(fixtures_data):
    oracle = FIXTURE_ORACLE["fixture_e_ambiguous_fields"]
    content = fixtures_data[oracle["filename"]]
    
    records, warnings = parse_and_normalize_report(content, oracle["filename"])
    assert len(records) == oracle["expected_records"]
    
    # Verify grams were accurately converted to kg (e.g., 500 gms -> 0.5 kg)
    garnish_rec = next(r for r in records if "Mixed Nuts" in r["dish_name"])
    assert garnish_rec["actual_production_kg"] == 0.5
    assert garnish_rec["total_waste_kg"] == 0.1
    
    # Verify derived waste from leftover - reuse (Paneer Pasanda: 5.0 - 2.0 = 3.0)
    pasanda_rec = next(r for r in records if "Pasanda" in r["dish_name"])
    assert pasanda_rec["total_waste_kg"] == 3.0
    
    # Verify derived production from pickup (Veg Hakka Noodles: pickup 25.0 -> prod 25.0)
    noodles_rec = next(r for r in records if "Noodles" in r["dish_name"])
    assert noodles_rec["actual_production_kg"] == 25.0
    
    # Verify anomaly warnings were generated for rows where waste > prod
    assert len(warnings) >= 2
    assert any("exceeds Production" in w for w in warnings)

def test_fixture_g_large_workbook_performance(fixtures_data):
    oracle = FIXTURE_ORACLE["fixture_g_large_workbook"]
    content = fixtures_data[oracle["filename"]]
    
    start_time = time.time()
    records, _ = parse_and_normalize_report(content, oracle["filename"])
    elapsed = time.time() - start_time
    
    assert len(records) == oracle["expected_records"]
    assert elapsed < oracle["max_parsing_time_seconds"]
    
    total_prod = round(sum(r["actual_production_kg"] for r in records), 2)
    total_waste = round(sum(r["total_waste_kg"] for r in records), 2)
    assert total_prod == oracle["expected_production_kg"]
    assert total_waste == oracle["expected_waste_kg"]

def test_fixture_h_adversarial_edge_against_oracle(fixtures_data):
    oracle = FIXTURE_ORACLE["fixture_h_adversarial_edge"]
    content = fixtures_data[oracle["filename"]]
    
    records, warnings = parse_and_normalize_report(content, oracle["filename"])
    assert len(records) == oracle["expected_records"]
    
    # 1. Zero quantity dish parsed
    uncooked = next(r for r in records if "Planned Only" in r["dish_name"])
    assert uncooked["actual_production_kg"] == 0.0
    assert uncooked["total_waste_kg"] == 0.0
    
    # 2. Precision decimals rounded
    precision_dish = next(r for r in records if "Molecular" in r["dish_name"])
    assert precision_dish["actual_production_kg"] == 12.35
    assert precision_dish["total_waste_kg"] == 1.23
    
    # 3. Negative quantity clamped to 0 with warning
    credit_dish = next(r for r in records if "Return Credit" in r["dish_name"])
    assert credit_dish["actual_production_kg"] == 0.0
    assert any("Negative" in w for w in warnings)
    
    # 4. Special characters in dish name preserved
    special_dish = next(r for r in records if "Special @ Counter #1" in r["dish_name"])
    assert "Chef's Cut" in special_dish["dish_name"]
    
    # 5. Formula text extracted
    formula_dish = next(r for r in records if "Risotto" in r["dish_name"])
    assert "Risotto" in formula_dish["dish_name"]

# =========================================================================
# 2. API ENDPOINT & PERSISTENCE INTEGRATION TESTS
# =========================================================================

def test_api_upload_preview_endpoint(auth_headers, fixtures_data):
    content = fixtures_data["fixture_c_multipage_complex.xlsx"]
    res = client.post(
        "/api/analytics/upload/preview",
        files={"file": ("fixture_c_multipage_complex.xlsx", io.BytesIO(content), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=auth_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_records"] == 125
    assert data["sheet_count"] == 1
    assert "detected_fields" in data["sheets"][0]

def test_api_upload_confirm_idempotency_and_modes(auth_headers, fixtures_data):
    content = fixtures_data["fixture_f_duplicate_overlap.xlsx"]
    filename = "fixture_f_duplicate_overlap.xlsx"
    
    # Step 1: Initial upload with replace
    res1 = client.post(
        "/api/analytics/upload/confirm",
        files={"file": (filename, io.BytesIO(content), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"duplicate_action": "replace"},
        headers=auth_headers
    )
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["status"] == "success"
    assert d1["inserted_records"] == 10
    
    # Step 2: Re-upload with duplicate_action="skip" -> must return skipped with 0 inserted!
    res2 = client.post(
        "/api/analytics/upload/confirm",
        files={"file": (filename, io.BytesIO(content), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"duplicate_action": "skip"},
        headers=auth_headers
    )
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["status"] == "skipped"
    assert d2["inserted_records"] == 0
    
    # Step 3: Re-upload with duplicate_action="import" -> exact duplicates skipped
    res3 = client.post(
        "/api/analytics/upload/confirm",
        files={"file": (filename, io.BytesIO(content), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"duplicate_action": "import"},
        headers=auth_headers
    )
    assert res3.status_code == 200
    d3 = res3.json()
    assert d3["status"] == "success"
    assert d3["inserted_records"] == 0 # All 10 existing rows skipped!
    
    # Step 4: Re-upload with duplicate_action="replace" -> replaces records cleanly
    res4 = client.post(
        "/api/analytics/upload/confirm",
        files={"file": (filename, io.BytesIO(content), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"duplicate_action": "replace"},
        headers=auth_headers
    )
    assert res4.status_code == 200
    d4 = res4.json()
    assert d4["status"] == "success"
    assert d4["inserted_records"] == 10

# =========================================================================
# 3. DOWNSTREAM ANALYTICS CONSISTENCY VERIFICATION
# =========================================================================

def test_analytics_endpoints_consistency(auth_headers, fixtures_data):
    # Upload clean fixture A for Hotel Grand Palace
    content = fixtures_data["fixture_a_clean.xlsx"]
    res_upload = client.post(
        "/api/analytics/upload/confirm",
        files={"file": ("fixture_a_clean.xlsx", io.BytesIO(content), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"duplicate_action": "replace"},
        headers=auth_headers
    )
    assert res_upload.status_code == 200
    
    # 1. Query /api/analytics/overview for Hotel Grand Palace
    res_ov = client.get(
        "/api/analytics/overview?hotel=Hotel%20Grand%20Palace",
        headers=auth_headers
    )
    assert res_ov.status_code == 200
    ov_data = res_ov.json()
    assert ov_data["kpis"]["total_food_prepared_kg"]["current"] == 395.0
    assert ov_data["kpis"]["total_food_waste_kg"]["current"] == 19.0
    assert ov_data["kpis"]["total_waste_cost"]["current"] == 2770.0
    assert ov_data["kpis"]["total_food_consumed_kg"]["current"] == 361.0
    assert ov_data["mass_balance_audit"]["total_prepared_kg"] == 395.0
    assert ov_data["mass_balance_audit"]["is_reconciled"] is True
    
    # 2. Query /api/analytics/hotels
    res_hotels = client.get("/api/analytics/hotels", headers=auth_headers)
    assert res_hotels.status_code == 200
    hotels_data = res_hotels.json()
    hotels_list = hotels_data.get("hotels", [])
    grand_palace = next((h for h in hotels_list if "Grand Palace" in h["hotel_name"]), None)
    assert grand_palace is not None
    assert grand_palace["total_prepared_kg"] == 395.0
    assert grand_palace["total_waste_kg"] == 19.0
    
    # 3. Query /api/analytics/dates-summary
    res_dates = client.get(
        "/api/analytics/dates-summary?hotel=Hotel%20Grand%20Palace",
        headers=auth_headers
    )
    assert res_dates.status_code == 200
    dates_data = res_dates.json()
    assert len(dates_data) >= 1
    d_entry = next(d for d in dates_data if d["date"] == "2026-08-25")
    assert d_entry["total_production_kg"] == 395.0
    assert d_entry["total_waste_kg"] == 19.0
    assert d_entry["total_waste_cost"] == 2770.0
