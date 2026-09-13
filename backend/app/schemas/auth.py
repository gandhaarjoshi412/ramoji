from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    hotel_id: int
    hotel_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

TokenResponse.model_rebuild()
