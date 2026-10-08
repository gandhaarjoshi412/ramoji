import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.database import SessionLocal
from app.models.user import User, UserSession
from app.utils.security import hash_password, hash_token, create_access_token

client = TestClient(app)


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_login_success_and_cookies(db_session):
    response = client.post(
        "/api/auth/login",
        json={"email": "manager@dolphinhotels.com", "password": "admin123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] == 1800
    assert data["user"]["email"] == "manager@dolphinhotels.com"
    assert data["user"]["role"] == "admin"

    # Check cookies
    cookies = response.cookies
    assert "access_token" in cookies
    assert "refresh_token" in cookies

    # Verify session in DB
    ref_hash = hash_token(data["refresh_token"])
    session = db_session.query(UserSession).filter(UserSession.refresh_token_hash == ref_hash).first()
    assert session is not None
    assert session.is_revoked is False
    assert session.user_id == data["user"]["id"]


def test_login_lockout_mechanism(db_session):
    test_email = "lockout_test@dolphinhotels.com"
    # Create a test user
    user = db_session.query(User).filter(User.email == test_email).first()
    if not user:
        user = User(
            name="Lockout Test User",
            email=test_email,
            password_hash=hash_password("correctpass123"),
            role="staff",
            hotel_id=1,
            is_active=True,
            failed_login_attempts=0,
        )
        db_session.add(user)
        db_session.commit()
    else:
        user.failed_login_attempts = 0
        user.locked_until = None
        db_session.commit()

    # Fail 4 times
    for attempt in range(1, 5):
        res = client.post(
            "/api/auth/login",
            json={"email": test_email, "password": "wrongpassword"},
        )
        assert res.status_code == 401
        db_session.refresh(user)
        assert user.failed_login_attempts == attempt
        assert user.locked_until is None

    # 5th failure -> triggers lockout
    res = client.post(
        "/api/auth/login",
        json={"email": test_email, "password": "wrongpassword"},
    )
    assert res.status_code == 401
    db_session.refresh(user)
    assert user.failed_login_attempts == 5
    assert user.locked_until is not None

    # 6th attempt -> 429 Too Many Requests
    res = client.post(
        "/api/auth/login",
        json={"email": test_email, "password": "wrongpassword"},
    )
    assert res.status_code == 429
    assert "temporarily locked" in res.json()["detail"].lower()

    # Even with correct password, still locked
    res = client.post(
        "/api/auth/login",
        json={"email": test_email, "password": "correctpass123"},
    )
    assert res.status_code == 429

    # Simulate lockout expired
    user.locked_until = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=1)
    db_session.commit()

    # Now login succeeds and resets failed attempts
    res = client.post(
        "/api/auth/login",
        json={"email": test_email, "password": "correctpass123"},
    )
    assert res.status_code == 200
    db_session.refresh(user)
    assert user.failed_login_attempts == 0
    assert user.locked_until is None


def test_login_deactivated_account(db_session):
    test_email = "inactive_user@dolphinhotels.com"
    user = db_session.query(User).filter(User.email == test_email).first()
    if not user:
        user = User(
            name="Inactive User",
            email=test_email,
            password_hash=hash_password("password123"),
            role="staff",
            hotel_id=1,
            is_active=False,
        )
        db_session.add(user)
        db_session.commit()
    else:
        user.is_active = False
        db_session.commit()

    res = client.post(
        "/api/auth/login",
        json={"email": test_email, "password": "password123"},
    )
    assert res.status_code == 403
    assert "deactivated" in res.json()["detail"].lower()


def test_token_refresh_flow(db_session):
    # 1. Login to get tokens
    login_res = client.post(
        "/api/auth/login",
        json={"email": "manager@dolphinhotels.com", "password": "admin123"},
    )
    assert login_res.status_code == 200
    data = login_res.json()
    first_access = data["access_token"]
    first_refresh = data["refresh_token"]

    old_session_hash = hash_token(first_refresh)
    old_session = db_session.query(UserSession).filter(UserSession.refresh_token_hash == old_session_hash).first()
    assert old_session is not None
    assert old_session.is_revoked is False

    # 2. Refresh via body
    refresh_res = client.post(
        "/api/auth/refresh",
        json={"refresh_token": first_refresh},
    )
    assert refresh_res.status_code == 200
    new_data = refresh_res.json()
    second_access = new_data["access_token"]
    second_refresh = new_data["refresh_token"]

    assert second_access != first_access
    assert second_refresh != first_refresh

    # 3. Check old session is revoked
    db_session.refresh(old_session)
    assert old_session.is_revoked is True

    # 4. Check new session exists and is active
    new_session_hash = hash_token(second_refresh)
    new_session = db_session.query(UserSession).filter(UserSession.refresh_token_hash == new_session_hash).first()
    assert new_session is not None
    assert new_session.is_revoked is False

    # 5. Try reusing old revoked refresh token -> 401
    reuse_res = client.post(
        "/api/auth/refresh",
        json={"refresh_token": first_refresh},
    )
    assert reuse_res.status_code == 401

    # 6. Refresh via cookie
    client.cookies.set("refresh_token", second_refresh)
    cookie_refresh_res = client.post("/api/auth/refresh")
    assert cookie_refresh_res.status_code == 200
    third_data = cookie_refresh_res.json()
    assert third_data["access_token"] != second_access
    client.cookies.clear()


def test_logout_revocation(db_session):
    # Login
    login_res = client.post(
        "/api/auth/login",
        json={"email": "manager@dolphinhotels.com", "password": "admin123"},
    )
    assert login_res.status_code == 200
    tokens = login_res.json()
    ref_token = tokens["refresh_token"]

    # Logout with refresh token in body
    logout_res = client.post(
        "/api/auth/logout",
        json={"refresh_token": ref_token},
    )
    assert logout_res.status_code == 200
    assert logout_res.json() == {"message": "Successfully logged out"}

    # Verify session revoked in DB
    ref_hash = hash_token(ref_token)
    session = db_session.query(UserSession).filter(UserSession.refresh_token_hash == ref_hash).first()
    assert session.is_revoked is True

    # Attempting to refresh with the revoked token fails
    refresh_res = client.post(
        "/api/auth/refresh",
        json={"refresh_token": ref_token},
    )
    assert refresh_res.status_code == 401


def test_me_endpoint_with_cookie_and_bearer():
    # Login
    login_res = client.post(
        "/api/auth/login",
        json={"email": "manager@dolphinhotels.com", "password": "admin123"},
    )
    assert login_res.status_code == 200
    tokens = login_res.json()
    acc_token = tokens["access_token"]

    # 1. Via Authorization Bearer header
    res_bearer = client.get("/api/auth/me", headers={"Authorization": f"Bearer {acc_token}"})
    assert res_bearer.status_code == 200
    assert res_bearer.json()["email"] == "manager@dolphinhotels.com"

    # 2. Via cookie
    client.cookies.set("access_token", acc_token)
    res_cookie = client.get("/api/auth/me")
    assert res_cookie.status_code == 200
    assert res_cookie.json()["email"] == "manager@dolphinhotels.com"
    client.cookies.clear()

    # 3. Without any auth -> 401
    res_noauth = client.get("/api/auth/me")
    assert res_noauth.status_code == 401


def test_refresh_invalid_or_wrong_token_type():
    client.cookies.clear()
    # 1. Missing refresh token
    res_empty = client.post("/api/auth/refresh")
    assert res_empty.status_code == 401

    # 2. Tampered token string
    res_invalid = client.post("/api/auth/refresh", json={"refresh_token": "invalid.jwt.token"})
    assert res_invalid.status_code == 401

    # 3. Passing access token to refresh endpoint
    login_res = client.post(
        "/api/auth/login",
        json={"email": "manager@dolphinhotels.com", "password": "admin123"},
    )
    acc_token = login_res.json()["access_token"]
    res_wrong_type = client.post("/api/auth/refresh", json={"refresh_token": acc_token})
    assert res_wrong_type.status_code == 401


def test_logout_without_token():
    # Logging out without token succeeds and clears cookies
    res = client.post("/api/auth/logout")
    assert res.status_code == 200
    assert res.json() == {"message": "Successfully logged out"}


def test_rbac_require_role(db_session):
    from app.utils.security import require_role
    from fastapi import Depends

    # Attach a temporary test route to app to verify require_role
    @app.get("/api/test-admin-only")
    def admin_only_route(current_user: User = Depends(require_role("admin"))):
        return {"ok": True, "user": current_user.email}

    # Login as admin
    admin_res = client.post(
        "/api/auth/login",
        json={"email": "manager@dolphinhotels.com", "password": "admin123"},
    )
    admin_token = admin_res.json()["access_token"]

    # Login as staff
    staff_res = client.post(
        "/api/auth/login",
        json={"email": "staff@example.com", "password": "staff123"},
    )
    staff_token = staff_res.json()["access_token"]

    # Admin accesses admin route -> 200
    r_admin = client.get("/api/test-admin-only", headers={"Authorization": f"Bearer {admin_token}"})
    assert r_admin.status_code == 200
    assert r_admin.json()["ok"] is True

    # Staff accesses admin route -> 403 Forbidden
    r_staff = client.get("/api/test-admin-only", headers={"Authorization": f"Bearer {staff_token}"})
    assert r_staff.status_code == 403

