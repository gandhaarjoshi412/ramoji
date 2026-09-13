from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from app.utils.security import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
    hotel_name = user.hotel.name if user.hotel else None

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            hotel_id=user.hotel_id,
            hotel_name=hotel_name,
            created_at=user.created_at,
        )
    )

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    # In stateless JWT, logout is handled client-side by clearing token, but endpoint confirms session termination.
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    hotel_name = current_user.hotel.name if current_user.hotel else None
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        hotel_id=current_user.hotel_id,
        hotel_name=hotel_name,
        created_at=current_user.created_at,
    )
