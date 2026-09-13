from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from app.schemas.event_food import EventFoodResponse

class EventBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    event_type: str = Field(default="Wedding", max_length=100)
    venue: Optional[str] = Field(None, max_length=255)
    event_date: date
    expected_guests: int = Field(default=0, ge=0)
    actual_guests: int = Field(default=0, ge=0)
    status: str = Field(default="Upcoming", max_length=50)
    notes: Optional[str] = None

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    event_type: Optional[str] = Field(None, max_length=100)
    venue: Optional[str] = Field(None, max_length=255)
    event_date: Optional[date] = None
    expected_guests: Optional[int] = Field(None, ge=0)
    actual_guests: Optional[int] = Field(None, ge=0)
    status: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None

class EventListItemResponse(EventBase):
    id: int
    hotel_id: int
    created_at: datetime
    updated_at: datetime
    
    # Calculated summary metrics
    total_prepared_kg: float = 0.0
    total_waste_kg: float = 0.0
    waste_percentage: float = 0.0
    total_waste_cost: float = 0.0
    waste_per_guest_kg: float = 0.0
    waste_per_guest_grams: float = 0.0
    food_items_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class EventDetailResponse(EventListItemResponse):
    event_foods: List[EventFoodResponse] = []
