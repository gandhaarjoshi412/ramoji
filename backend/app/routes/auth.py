from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User, UserSession
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse, UserResponse
from app.utils.security import (
    verify_password,
    hash_token,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _build_user_response(user: User) -> UserResponse:
    hotel_name = user.hotel.name if user.hotel else None
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        hotel_id=user.hotel_id,
        hotel_name=hotel_name,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact administrator.",
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    # Check if account is locked
    if user.locked_until:
        if user.locked_until > now:
            remaining_seconds = int((user.locked_until - now).total_seconds())
            remaining_minutes = max(1, (remaining_seconds + 59) // 60)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account is temporarily locked. Please try again in {remaining_minutes} minute{'s' if remaining_minutes > 1 else ''}.",
            )
        else:
            # Lockout expired, reset attempts
            user.locked_until = None
            user.failed_login_attempts = 0

    # Validate password
    if not verify_password(payload.password, user.password_hash):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= settings.MAX_FAILED_LOGIN_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=settings.LOCKOUT_DURATION_MINUTES)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Reset lockout on success
    user.failed_login_attempts = 0
    user.locked_until = None

    # Issue dual tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "email": user.email}
    )

    # Create session record
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:500] if request.headers.get("user-agent") else None
    user_session = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_token),
        ip_address=client_ip,
        user_agent=user_agent,
        is_revoked=False,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        created_at=now,
    )
    db.add(user_session)
    db.commit()

    # Set auth cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=1800,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=604800,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=1800,
        user=_build_user_response(user),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    request: Request,
    response: Response,
    payload: Optional[RefreshRequest] = Body(default=None),
    db: Session = Depends(get_db),
):
    raw_token = None
    if payload and payload.refresh_token:
        raw_token = payload.refresh_token
    elif "refresh_token" in request.cookies:
        raw_token = request.cookies.get("refresh_token")

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
        )

    # Verify signature and type == 'refresh'
    decode_refresh_token(raw_token)

    token_hash = hash_token(raw_token)
    session = db.query(UserSession).filter(UserSession.refresh_token_hash == token_hash).first()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if not session or session.is_revoked or session.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    user = db.query(User).filter(User.id == session.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated",
        )

    if user.locked_until and user.locked_until > now:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Account temporarily locked due to security policy.",
        )

    # Rotate token: revoke old session
    session.is_revoked = True

    new_access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )
    new_refresh_token = create_refresh_token(
        data={"sub": str(user.id), "email": user.email}
    )

    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:500] if request.headers.get("user-agent") else None
    new_session = UserSession(
        user_id=user.id,
        refresh_token_hash=hash_token(new_refresh_token),
        ip_address=client_ip,
        user_agent=user_agent,
        is_revoked=False,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        created_at=now,
    )
    db.add(new_session)
    db.commit()

    response.set_cookie(
        key="access_token",
        value=new_access_token,
        max_age=1800,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
    )
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        max_age=604800,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
    )

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=1800,
        user=_build_user_response(user),
    )


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    payload: Optional[RefreshRequest] = Body(default=None),
    db: Session = Depends(get_db),
):
    raw_token = None
    if payload and payload.refresh_token:
        raw_token = payload.refresh_token
    elif "refresh_token" in request.cookies:
        raw_token = request.cookies.get("refresh_token")

    if raw_token:
        token_hash = hash_token(raw_token)
        session = db.query(UserSession).filter(UserSession.refresh_token_hash == token_hash).first()
        if session:
            session.is_revoked = True
            db.commit()

    response.delete_cookie(key="access_token", path="/", samesite="lax")
    response.delete_cookie(key="refresh_token", path="/", samesite="lax")
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return _build_user_response(current_user)
