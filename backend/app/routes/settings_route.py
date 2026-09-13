from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.hotel import Hotel
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/settings", tags=["System Settings"])

class SettingsResponse(BaseModel):
    hotel_name: str
    hotel_address: str
    ai_mode: str
    ai_confidence_threshold: float
    ai_model_name: str
    ai_model_version: str
    storage_provider: str
    user_role: str

    model_config = ConfigDict(from_attributes=True)

class SettingsUpdateRequest(BaseModel):
    hotel_name: str | None = None
    hotel_address: str | None = None
    ai_mode: str | None = None
    ai_confidence_threshold: float | None = None

@router.get("", response_model=SettingsResponse)
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hotel = current_user.hotel
    return SettingsResponse(
        hotel_name=hotel.name if hotel else "Dolphin Hotels",
        hotel_address=hotel.address if hotel else "",
        ai_mode=settings.AI_MODE,
        ai_confidence_threshold=settings.AI_CONFIDENCE_THRESHOLD,
        ai_model_name=settings.AI_MODEL_NAME,
        ai_model_version=settings.AI_MODEL_VERSION,
        storage_provider=settings.STORAGE_PROVIDER,
        user_role=current_user.role,
    )

@router.put("", response_model=SettingsResponse)
def update_settings(
    payload: SettingsUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required.")

    hotel = current_user.hotel
    if payload.hotel_name and hotel:
        hotel.name = payload.hotel_name.strip()
    if payload.hotel_address and hotel:
        hotel.address = payload.hotel_address.strip()
    
    if payload.ai_mode:
        settings.AI_MODE = payload.ai_mode.lower()
    if payload.ai_confidence_threshold is not None:
        settings.AI_CONFIDENCE_THRESHOLD = payload.ai_confidence_threshold

    db.commit()
    return get_settings(current_user=current_user, db=db)
