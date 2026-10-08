from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: Optional[int] = None
    user: "UserResponse"

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    hotel_id: int
    hotel_name: Optional[str] = None
    is_active: Optional[bool] = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

TokenResponse.model_rebuild()
