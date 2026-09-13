import pytest
import io
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from ai.quantity_estimator import QuantityEstimator
from ai.model_interface import Detection
from app.services.cost_engine import FoodCostService

client = TestClient(app)

@pytest.fixture(scope="module")
def auth_token():
    res = client.post(
        "/api/auth/login",
        json={"email": settings.DEMO_EMAIL, "password": settings.DEMO_PASSWORD}
    )
    assert res.status_code == 200
    return res.json()["access_token"]

def test_quantity_estimation_calculation():
    # Test realistic bounding box
    det = Detection(
        food_name="Biryani",
        confidence=0.96,
        bounding_box=[100, 100, 700, 500],
        mask=[[100, 100], [700, 100], [700, 500], [100, 500]]
    )
    result = QuantityEstimator.estimate(
        detection=det,
        image_width=800,
        image_height=600,
        density_g_per_cm3=0.85,
        default_depth_cm=4.0,
        calibration_factor=1.0,
        min_weight_g=20.0,
        max_weight_g=25000.0
    )
    assert result.estimated_weight_grams > 50.0
    assert result.estimated_weight_grams < 25000.0
    assert result.estimation_method == "camera_estimate"
    assert result.estimation_confidence >= 0.5

def test_quantity_estimation_min_max_clamping():
    # Excessively small box
    det_tiny = Detection(
        food_name="Sample",
        confidence=0.90,
        bounding_box=[0, 0, 1, 1],
        mask=None
    )
    res_min = QuantityEstimator.estimate(
        detection=det_tiny,
        image_width=1000,
        image_height=1000,
        min_weight_g=50.0
    )
    assert res_min.estimated_weight_grams == 50.0

def test_cost_calculation_formulas():
    # Biryani: 420g at ₹0.18/g = ₹75.60 (From Section 11 of prompt!)
    waste_cost = FoodCostService.calculate_estimated_waste_cost(420.0, 0.18)
    assert waste_cost == 75.60

def test_cost_calculation_negative_rejected():
    with pytest.raises(ValueError):
        FoodCostService.calculate_estimated_waste_cost(-10.0, 0.18)
    with pytest.raises(ValueError):
        FoodCostService.calculate_estimated_waste_cost(420.0, -0.18)

def test_e2e_ai_scan_and_verification_workflow(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}

    # 1. Fetch events to get an event id
    events_res = client.get("/api/events", headers=headers)
    assert events_res.status_code == 200
    events = events_res.json()
    assert len(events) > 0
    event_id = events[0]["id"]

    # 2. Create a test image in memory
    img = Image.new("RGB", (640, 480), color=(180, 80, 40))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    # 3. Submit scan
    files = {"file": ("test_banquet_biryani.jpg", buf, "image/jpeg")}
    scan_res = client.post(f"/api/events/{event_id}/scan", files=files, headers=headers)
    assert scan_res.status_code == 201
    scan_data = scan_res.json()
    scan_id = scan_data["id"]

    assert "ai_food_prediction" in scan_data
    assert scan_data["ai_confidence"] > 0.5
    assert scan_data["estimated_weight_grams"] > 0
    assert scan_data["estimated_waste_cost"] > 0
    assert scan_data["measurement_method"] == "camera_estimate"
    assert scan_data["human_verified"] is False

    # 4. Human Verification & Correction flow (Section 16)
    verify_payload = {
        "human_food_correction": "Paneer Butter Masala",
        "human_weight_correction": 390.0,
        "notes": "Verified by kitchen steward on camera inspection."
    }
    verify_res = client.put(f"/api/scans/{scan_id}/verify", json=verify_payload, headers=headers)
    assert verify_res.status_code == 200
    verified = verify_res.json()
    assert verified["human_verified"] is True
    assert verified["human_food_correction"] == "Paneer Butter Masala"
    assert verified["human_weight_correction"] == 390.0
    assert verified["final_food_name"] == "Paneer Butter Masala"
    assert verified["final_weight_grams"] == 390.0

    # 5. Check Event Analytics reflect the scan
    analytics_res = client.get(f"/api/events/{event_id}/analytics", headers=headers)
    assert analytics_res.status_code == 200
    analytics = analytics_res.json()
    assert analytics["total_scans_count"] >= 1
    assert analytics["total_estimated_waste_grams"] > 0

    # 6. Check Training Dataset export
    train_res = client.get("/api/scans/training-dataset", headers=headers)
    assert train_res.status_code == 200
    dataset = train_res.json()
    assert any(item["scan_id"] == scan_id for item in dataset)
