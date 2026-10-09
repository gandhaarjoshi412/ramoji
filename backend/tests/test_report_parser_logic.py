import os
import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
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

def test_workbook_analysis_and_math_integrity():
    sample_path = "backend/sample_data/Daily report.xlsx"
    assert os.path.exists(sample_path)
    with open(sample_path, "rb") as f:
        content = f.read()

    analysis = analyze_report_file(content, "Daily report.xlsx")
    assert analysis["sheet_count"] == 2
    assert analysis["total_records"] == 71

    # Test Sahara exact math
    records, warnings = parse_and_normalize_report(content, "Daily report.xlsx", sheet_name_filter="sahara")
    assert len(records) == 29
    total_waste = round(sum(r["total_waste_kg"] for r in records), 2)
    total_cost = round(sum(r["waste_cost"] for r in records), 2)
    assert total_waste == 222.88
    assert total_cost == 10426.50

    # Test Sitara exact math
    records_sitara, _ = parse_and_normalize_report(content, "Daily report.xlsx", sheet_name_filter="sitara")
    assert len(records_sitara) == 42
    total_waste_sitara = round(sum(r["total_waste_kg"] for r in records_sitara), 2)
    total_prod_sitara = round(sum(r["actual_production_kg"] for r in records_sitara), 2)
    total_cons_sitara = round(sum(r["actual_consumption_kg"] for r in records_sitara), 2)
    total_left_sitara = round(sum(r["total_leftover_kg"] for r in records_sitara), 2)
    total_reuse_sitara = round(sum(r["reuse_quantity_kg"] for r in records_sitara), 2)

    assert total_waste_sitara == 23.00
    assert total_prod_sitara == 328.40
    assert total_cons_sitara == 295.40
    assert total_left_sitara == 33.00
    assert total_reuse_sitara == 10.00

def test_arbitrary_layout_csv_parsing():
    csv_content = b"""Item Name,Meal Type,Planned Qty,Actual Cooking,Counter Discard,Food Cost
Chicken Biryani,Dinner,100,95.5,4.2,450.0
Paneer Butter Masala,Dinner,80,78.0,2.1,320.0
Gulab Jamun,Dinner,150,150.0,0.5,120.0
"""
    analysis = analyze_report_file(csv_content, "custom_buffet.csv")
    assert analysis["total_records"] == 3
    records, warnings = parse_and_normalize_report(csv_content, "custom_buffet.csv")
    assert len(records) == 3
    assert records[0]["dish_name"] == "Chicken Biryani"
    assert records[0]["actual_production_kg"] == 95.5
    assert records[0]["total_waste_kg"] == 4.2
    assert records[0]["item_cost"] == 450.0

def test_api_upload_preview_and_confirm(auth_headers):
    sample_path = "backend/sample_data/Daily report.xlsx"
    with open(sample_path, "rb") as f:
        file_bytes = f.read()

    # 1. Preview upload
    res = client.post(
        "/api/analytics/upload/preview",
        files={"file": ("Daily report.xlsx", io.BytesIO(file_bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=auth_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert "sheets" in data
    assert len(data["sheets"]) == 2
    assert "detected_fields" in data["sheets"][0]
    assert len(data["sheets"][0]["detected_fields"]) > 5

    # 2. Confirm upload
    res_confirm = client.post(
        "/api/analytics/upload/confirm",
        files={"file": ("Daily report.xlsx", io.BytesIO(file_bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"sheet_name": "sitara", "duplicate_action": "replace"},
        headers=auth_headers
    )
    assert res_confirm.status_code == 200
    confirm_data = res_confirm.json()
    assert confirm_data["status"] == "success"
    assert confirm_data["inserted_records"] == 42
    assert "summary" in confirm_data
    summary = confirm_data["summary"]
    assert summary["total_production_kg"] == 328.40
    assert summary["total_waste_kg"] == 23.00
    assert summary["dishes_count"] == 42
    assert len(summary["top_waste_dishes"]) > 0
    assert "dish_name" in summary["top_waste_dishes"][0]
    assert "waste_kg" in summary["top_waste_dishes"][0]
    import_id = confirm_data["import_id"]

    # 3. Verify ledger records with traceability
    ledger_res = client.get(
        f"/api/analytics/records?import_id={import_id}",
        headers=auth_headers
    )
    assert ledger_res.status_code == 200
    ledger_data = ledger_res.json()
    assert ledger_data["total"] == 42
    rec = ledger_data["records"][0]
    assert rec["source_sheet"] == "sitara"
    assert rec["source_file"] == "Daily report.xlsx"
    assert rec["import_id"] == import_id
    assert rec["confidence_score"] >= 0.90

    # 4. Duplicate check on second preview
    dup_preview = client.post(
        "/api/analytics/upload/preview",
        files={"file": ("Daily report.xlsx", io.BytesIO(file_bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=auth_headers
    )
    assert dup_preview.status_code == 200
    dup_data = dup_preview.json()
    assert dup_data["is_potential_duplicate"] is True
    assert dup_data["duplicate_count"] > 0

    # 5. Skip duplicate import
    skip_res = client.post(
        "/api/analytics/upload/confirm",
        files={"file": ("Daily report.xlsx", io.BytesIO(file_bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"sheet_name": "sitara", "duplicate_action": "skip"},
        headers=auth_headers
    )
    assert skip_res.status_code == 200
    assert skip_res.json()["status"] == "skipped"
    assert "already exist" in skip_res.json()["message"]

    # 6. Test custom error handling on invalid file
    bad_res = client.post(
        "/api/analytics/upload/confirm",
        files={"file": ("corrupted.xlsx", io.BytesIO(b"not an excel file"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"sheet_name": "all"},
        headers=auth_headers
    )
    assert bad_res.status_code == 400
    assert "Failed to process and store Excel report" in bad_res.json()["detail"]

    # 7. Rollback import
    rb_res = client.delete(f"/api/analytics/imports/{import_id}", headers=auth_headers)
    assert rb_res.status_code == 200
    assert rb_res.json()["deleted_records"] == 42


def test_sahara_monthly_workbook_exact_accuracy():
    sahara_path = "excel/Aug - 26 Sahara Daily wise Production, Pickup  Wastage report.xlsx"
    if not os.path.exists(sahara_path):
        pytest.skip("Sahara monthly report not present in excel/ directory")

    with open(sahara_path, "rb") as f:
        content = f.read()

    fname = os.path.basename(sahara_path)
    records, warnings = parse_and_normalize_report(content, fname)

    # 1. Verify summary sheet exclusion (Sheet1 omitted, exactly 24 sheets * 29 dishes = 696 dish records)
    assert len(records) == 696
    assert all(r["source_sheet"] != "Sheet1" for r in records)

    # 2. Verify all 24 dates preserved without date collapsing
    dates = sorted(list(set(str(r["record_date"]) for r in records)))
    assert len(dates) == 24
    assert dates[0] == "2026-08-01"
    assert dates[-1] == "2026-08-24"

    # 3. Ground truth check for Aug 01: exactly 3,647.80 kg prepared, 175.39 kg waste
    aug1_recs = [r for r in records if str(r["record_date"]) == "2026-08-01"]
    assert len(aug1_recs) == 29
    aug1_prod = round(sum(r["actual_production_kg"] for r in aug1_recs), 2)
    aug1_waste = round(sum(r["total_waste_kg"] for r in aug1_recs), 2)
    assert aug1_prod == 3647.80
    assert aug1_waste == 175.39

    # 4. Hotel mapping
    assert all(r["hotel_name"] == "Hotel Sahara" for r in records)


def test_banquet_cooked_food_report_cutoff():
    banquet_path = "excel/Cocktail Non Veg buffet Dinner Cooked Food consumption details on 07.10.2026.xlsx"
    if not os.path.exists(banquet_path):
        pytest.skip("Banquet report not present in excel/ directory")

    with open(banquet_path, "rb") as f:
        content = f.read()

    fname = os.path.basename(banquet_path)
    records, warnings = parse_and_normalize_report(content, fname)

    # Exactly 34 dish items before COOKED FOOD REPORT summary block
    assert len(records) == 34
    assert all(r["hotel_name"] == "Hotel Sitara" for r in records)
    assert str(records[0]["record_date"]) == "2026-10-07"

    total_prod = round(sum(r["actual_production_kg"] for r in records), 2)
    total_waste = round(sum(r["total_waste_kg"] for r in records), 2)

    # Exactly matches the summary table in rows 53-61
    assert total_prod == 268.60
    assert total_waste == 20.05

