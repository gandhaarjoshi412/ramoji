import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User
from app.models.event import Event
from app.models.food_item import FoodItem
from app.models.event_food import EventFood
from app.models.waste_scan import WasteScan
from app.models.waste_record import WasteRecord
from app.utils.security import hash_password

from app.database import SessionLocal
from app.config import settings

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def auth_headers():
    res = client.post(
        "/api/auth/login",
        json={"email": settings.DEMO_EMAIL, "password": settings.DEMO_PASSWORD}
    )
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_all_logins_working(db_session):
    """Verify admin and both test accounts can log in successfully with JWTs."""
    # Ensure users exist in the test db
    for email in ["gandhaar.joshi@platesight.in", "test@platesight", "test@platesight.in"]:
        u = db_session.query(User).filter(User.email == email).first()
        if not u:
            u = User(
                name="Test User",
                email=email,
                password_hash=hash_password("pass1234"),
                role="admin",
                hotel_id=1,
                is_active=True
            )
            db_session.add(u)
        else:
            u.password_hash = hash_password("pass1234")
            u.is_active = True
            u.failed_login_attempts = 0
            u.locked_until = None
    db_session.commit()

    for email in ["gandhaar.joshi@platesight.in", "test@platesight", "test@platesight.in"]:
        res = client.post("/api/auth/login", json={"email": email, "password": "pass1234"})
        assert res.status_code == 200, f"Login failed for {email}: {res.text}"
        data = res.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == email or (email == "test@platesight" and data["user"]["email"].startswith("test@platesight"))

def test_delete_event_food_permanently_no_resurrection(db_session, auth_headers):
    """Verify that deleting an EventFood permanently deletes it and does not resurrect on GET."""
    # Create an event
    ev = Event(hotel_id=1, name="Deletable Banquet", event_type="Wedding")
    db_session.add(ev)
    db_session.flush()

    # Create a food item
    fi = FoodItem(hotel_id=1, name="Temporary Biryani", category="Main Course", default_cost_per_kg=200.0)
    db_session.add(fi)
    db_session.flush()

    # Create an event food
    ef = EventFood(event_id=ev.id, food_item_id=fi.id, prepared_weight_kg=25.0, estimated_cost_per_kg=200.0)
    db_session.add(ef)
    db_session.flush()

    # Create a waste scan for this event food
    scan = WasteScan(
        event_id=ev.id,
        food_item_id=fi.id,
        image_url="/uploads/test.jpg",
        ai_food_prediction="Temporary Biryani",
        ai_confidence=0.92,
        estimated_weight_grams=3500.0,
        cost_per_gram=0.2,
        estimated_waste_cost=700.0,
    )
    db_session.add(scan)
    db_session.commit()

    # Verify event has 1 food item
    get_res = client.get(f"/api/events/{ev.id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert len(get_res.json()["event_foods"]) == 1

    # Delete the event food
    del_res = client.delete(f"/api/events/{ev.id}/foods/{ef.id}", headers=auth_headers)
    assert del_res.status_code == 204

    # Crucial test: GET event details again. The item MUST NOT be resurrected!
    get_res2 = client.get(f"/api/events/{ev.id}", headers=auth_headers)
    assert get_res2.status_code == 200
    assert len(get_res2.json()["event_foods"]) == 0

    # Verify WasteScan for that item was also removed so it cannot ghost back
    scans_left = db_session.query(WasteScan).filter(WasteScan.event_id == ev.id, WasteScan.food_item_id == fi.id).count()
    assert scans_left == 0

def test_record_waste_endpoint_with_food_path(db_session, auth_headers):
    """Verify POST /api/events/{event_id}/foods/{event_food_id}/waste works cleanly."""
    ev = Event(hotel_id=1, name="Scale Banquet", event_type="Corporate")
    db_session.add(ev)
    db_session.flush()

    fi = FoodItem(hotel_id=1, name="Paneer Tikka Test", category="Starters", default_cost_per_kg=350.0)
    db_session.add(fi)
    db_session.flush()

    ef = EventFood(event_id=ev.id, food_item_id=fi.id, prepared_weight_kg=10.0, estimated_cost_per_kg=350.0)
    db_session.add(ef)
    db_session.commit()

    res = client.post(
        f"/api/events/{ev.id}/foods/{ef.id}/waste",
        headers=auth_headers,
        json={
            "gross_weight_kg": 4.5,
            "container_weight_kg": 0.5,
            "waste_reason": "Excess preparation",
            "notes": "Testing path-based waste recording"
        }
    )
    assert res.status_code == 201
    data = res.json()
    assert data["net_weight_kg"] == 4.0
    assert data["gross_weight_kg"] == 4.5

def test_delete_event_cleans_up_cleanly(db_session, auth_headers):
    """Verify deleting an entire event removes all nested relations without error."""
    ev = Event(hotel_id=1, name="Event to Delete", event_type="Social")
    db_session.add(ev)
    db_session.flush()

    fi = FoodItem(hotel_id=1, name="Disposable Salad", category="Salad", default_cost_per_kg=60.0)
    db_session.add(fi)
    db_session.flush()

    ef = EventFood(event_id=ev.id, food_item_id=fi.id, prepared_weight_kg=10.0)
    db_session.add(ef)
    db_session.flush()

    wr = WasteRecord(
        event_food_id=ef.id,
        gross_weight_kg=2.0,
        container_weight_kg=0.2,
        net_weight_kg=1.8,
        waste_reason="Service leftover"
    )
    db_session.add(wr)
    db_session.commit()

    del_res = client.delete(f"/api/events/{ev.id}", headers=auth_headers)
    assert del_res.status_code == 204

    # Confirm event is gone
    get_res = client.get(f"/api/events/{ev.id}", headers=auth_headers)
    assert get_res.status_code == 404
