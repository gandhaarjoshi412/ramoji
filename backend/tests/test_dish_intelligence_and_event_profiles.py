import pytest
from datetime import date
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models.analytics_record import AnalyticsRecord

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

def test_dish_intelligence_overview_leaderboard(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    db = SessionLocal()
    try:
        # Seed 2 distinct records with different guest counts and dishes
        rec1 = AnalyticsRecord(
            hotel_name="Hotel Sitara",
            record_date=date(2026, 9, 8),
            session="Lunch",
            service_type="Buffet",
            event_name="Corp Meeting 1",
            event_type="Corporate",
            pax=100,
            dish_name="Test Paneer Special",
            dish_category="Main Course",
            actual_production_kg=50.0,
            actual_consumption_kg=40.0,
            kitchen_leftover_kg=5.0,
            total_leftover_kg=10.0,
            total_waste_kg=10.0,
            waste_cost=1500.0,
            data_source="Excel Import"
        )
        rec2 = AnalyticsRecord(
            hotel_name="Hotel Sitara",
            record_date=date(2026, 9, 8),
            session="Dinner",
            service_type="Buffet",
            event_name="Corp Meeting 2",
            event_type="Corporate",
            pax=200,
            dish_name="Test Biryani Special",
            dish_category="Main Course",
            actual_production_kg=100.0,
            actual_consumption_kg=80.0,
            kitchen_leftover_kg=10.0,
            total_leftover_kg=20.0,
            total_waste_kg=20.0,
            waste_cost=3000.0,
            data_source="Excel Import"
        )
        db.add_all([rec1, rec2])
        db.commit()

        res = client.get("/api/analytics/overview?hotel=all&date_preset=all", headers=headers)
        assert res.status_code == 200
        data = res.json()

        # Verify dish_leaderboard exists and contains both dishes
        assert "dish_leaderboard" in data
        assert len(data["dish_leaderboard"]) >= 2

        # Find Test Paneer Special
        paneer = next((d for d in data["dish_leaderboard"] if d["dish_name"] == "Test Paneer Special"), None)
        assert paneer is not None
        assert paneer["total_prepared_kg"] >= 50.0
        assert paneer["total_consumed_kg"] >= 40.0
        assert paneer["total_waste_kg"] >= 10.0
        assert paneer["dish_pax"] >= 100  # Shift-specific pax
        assert paneer["waste_per_guest_g"] > 0
        assert paneer["consumed_per_guest_g"] > 0
        assert "operational_action" in paneer

        # Verify consumption_vs_waste exists
        assert "consumption_vs_waste" in data
        assert len(data["consumption_vs_waste"]) >= 2
    finally:
        # Cleanup
        db.query(AnalyticsRecord).filter(
            AnalyticsRecord.dish_name.in_(["Test Paneer Special", "Test Biryani Special"])
        ).delete(synchronize_session=False)
        db.commit()
        db.close()

def test_event_types_profiles_no_contradictory_wedding_data(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    res = client.get("/api/analytics/event-types?hotel=all&date_preset=all", headers=headers)
    assert res.status_code == 200
    data = res.json()

    cross_profiles = data["cross_event_comparison"]["profiles"]
    wedding_profile = next(p for p in cross_profiles if p["event_type"] == "Wedding")

    # The wedding profile MUST NOT contain the old hardcoded 488g / 87.5% mock strings!
    assert "488g" not in wedding_profile["behavior_summary"]
    assert "87.5%" not in wedding_profile["behavior_summary"]
    
    # If wedding has no records, verify clean empty state
    if not wedding_profile.get("has_data", True) or wedding_profile["guest_count"] == 0:
        assert "No banquet records currently available" in wedding_profile["behavior_summary"]
