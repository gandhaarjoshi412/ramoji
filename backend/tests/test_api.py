import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)

@pytest.fixture(scope="module")
def auth_token():
    # Login with demo user
    response = client.post(
        "/api/auth/login",
        json={"email": settings.DEMO_EMAIL, "password": settings.DEMO_PASSWORD}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    return data["access_token"]

def test_login_invalid_password():
    response = client.post(
        "/api/auth/login",
        json={"email": settings.DEMO_EMAIL, "password": "wrongpassword"}
    )
    assert response.status_code == 401

def test_login_manager():
    response = client.post(
        "/api/auth/login",
        json={"email": "manager@dolphinhotels.com", "password": "admin123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "manager@dolphinhotels.com"

def test_get_current_user(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == settings.DEMO_EMAIL
    assert data["hotel_name"] == settings.DEMO_HOTEL_NAME

def test_create_event_and_flow(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}

    # Step 1: Create ABC Wedding
    event_payload = {
        "name": "ABC Wedding",
        "event_type": "Wedding",
        "venue": "Royal Pavilion",
        "event_date": "2026-09-12",
        "expected_guests": 500,
        "actual_guests": 467,
        "status": "Active",
        "notes": "End-to-end integration test banquet event."
    }
    create_res = client.post("/api/events", json=event_payload, headers=headers)
    assert create_res.status_code == 201
    event_data = create_res.json()
    event_id = event_data["id"]
    assert event_data["name"] == "ABC Wedding"
    assert event_data["expected_guests"] == 500
    assert event_data["actual_guests"] == 467

    # Step 2: Add Biryani (90 kg prepared, ₹180/kg)
    food_payload = {
        "name": "Hyderabadi Biryani",
        "category": "Main Course",
        "prepared_weight_kg": 90.0,
        "estimated_cost_per_kg": 180.0,
        "notes": "Main dish for dinner."
    }
    food_res = client.post(f"/api/events/{event_id}/foods", json=food_payload, headers=headers)
    assert food_res.status_code == 201
    food_data = food_res.json()
    event_food_id = food_data["id"]
    assert food_data["prepared_weight_kg"] == 90.0
    assert food_data["estimated_cost_per_kg"] == 180.0

    # Step 3: Record Waste (Gross: 18.6 kg, Tare: 3.1 kg -> Net 15.5 kg)
    waste_payload = {
        "event_food_id": event_food_id,
        "gross_weight_kg": 18.6,
        "container_weight_kg": 3.1,
        "waste_reason": "Excess preparation",
        "notes": "Leftover after dinner service complete.",
        "weight_source": "Manual"
    }
    waste_res = client.post(f"/api/events/{event_id}/waste", json=waste_payload, headers=headers)
    assert waste_res.status_code == 201
    waste_data = waste_res.json()
    assert waste_data["net_weight_kg"] == 15.5
    assert waste_data["gross_weight_kg"] == 18.6
    assert waste_data["container_weight_kg"] == 3.1

    # Step 4: Verify Event Detail calculations
    detail_res = client.get(f"/api/events/{event_id}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["total_prepared_kg"] == 90.0
    assert detail["total_waste_kg"] == 15.5
    assert detail["waste_percentage"] == 17.22
    assert detail["total_waste_cost"] == 2790.0
    # Waste per guest = 15.5 / 467 = ~33.2 grams
    assert detail["waste_per_guest_grams"] == 33.2

    # Step 5: Verify Report Generation
    report_res = client.get(f"/api/events/{event_id}/report", headers=headers)
    assert report_res.status_code == 200
    report = report_res.json()
    assert report["event_name"] == "ABC Wedding"
    assert report["total_food_prepared_kg"] == 90.0
    assert report["total_food_waste_kg"] == 15.5
    assert report["estimated_waste_cost"] == 2790.0
    assert len(report["food_breakdown"]) == 1
    assert report["food_breakdown"][0]["food_name"] == "Hyderabadi Biryani"
    assert report["food_breakdown"][0]["leftover_kg"] == 15.5
    assert report["food_breakdown"][0]["waste_percentage"] == 17.22

    # Step 6: Verify Dashboard Summary reflects this
    dash_res = client.get("/api/dashboard/summary", headers=headers)
    assert dash_res.status_code == 200
    dash = dash_res.json()
    assert dash["total_events"] >= 1
    assert dash["total_waste_kg"] > 0
    assert dash["total_waste_cost"] > 0

def test_mobile_waste_scan_ingestion_and_idempotency(auth_token):
    import uuid
    unique_scan_id = f"test_mobile_scan_{uuid.uuid4().hex[:8]}"
    headers = {"Authorization": f"Bearer {auth_token}"}

    # 1. Submit mobile scan JSON payload
    mobile_scan_payload = {
        "scan_id": unique_scan_id,
        "event_id": 1,
        "ai_food_prediction": "Steamed Basmati Rice",
        "ai_confidence": 0.94,
        "timestamp": "2026-10-04T12:00:00Z",
        "model_version": "platesight-v1.0-dishes58",
        "detections": [
            {"class_id": 0, "class_name": "Steamed Basmati Rice", "confidence": 0.94, "coverage_percent": 18.7, "instance_count": 1},
            {"class_id": 3, "class_name": "Dal Tadka", "confidence": 0.91, "coverage_percent": 11.3, "instance_count": 1}
        ]
    }

    res = client.post("/api/events/1/waste", json=mobile_scan_payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["event_id"] == 1
    assert data["ai_food_prediction"] == "Steamed Basmati Rice"
    assert data["ai_confidence"] == 0.94
    assert data["estimated_weight_grams"] > 0
    assert data["cost_per_gram"] > 0
    assert data["estimated_waste_cost"] > 0
    assert len(data["detected_items"]) == 2
    assert data["detected_items"][0]["name"] == "Steamed Basmati Rice"
    first_scan_id = data["id"]

    # 2. Test Idempotency: Submit duplicate scan_id
    res_dup = client.post("/api/events/1/waste", json=mobile_scan_payload, headers=headers)
    assert res_dup.status_code in [200, 201]
    dup_data = res_dup.json()
    assert dup_data["id"] == first_scan_id
    assert dup_data["ai_food_prediction"] == "Steamed Basmati Rice"

    # 3. Verify food catalog contains 58 dishes
    from ai.food_classes import YOLO11M_SEG_CLASSES
    assert len(YOLO11M_SEG_CLASSES) == 58

