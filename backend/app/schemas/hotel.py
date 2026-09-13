from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional

class HotelBase(BaseModel):
    name: str
    address: Optional[str] = None

class HotelResponse(HotelBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class HotelUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
