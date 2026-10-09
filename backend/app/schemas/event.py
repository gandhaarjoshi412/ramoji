from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from app.schemas.event_food import EventFoodResponse

class EventBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    event_type: str = Field(default="Wedding", max_length=100)
    event_subtype: Optional[str] = Field(None, max_length=100)
    client_name: Optional[str] = Field(None, max_length=255)
    venue: Optional[str] = Field(None, max_length=255)
    service_format: Optional[str] = Field(default="Buffet", max_length=100)
    event_date: date
    expected_guests: int = Field(default=0, ge=0)
    actual_guests: int = Field(default=0, ge=0)
    status: str = Field(default="Upcoming", max_length=50)
    is_archived: bool = False
    notes: Optional[str] = None

class EventCreate(EventBase):
    hotel_id: Optional[int] = None
    sessions: Optional[List[str]] = None
    dishes: Optional[List[dict]] = None

class EventUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    event_type: Optional[str] = Field(None, max_length=100)
    event_subtype: Optional[str] = Field(None, max_length=100)
    client_name: Optional[str] = Field(None, max_length=255)
    venue: Optional[str] = Field(None, max_length=255)
    service_format: Optional[str] = Field(None, max_length=100)
    event_date: Optional[date] = None
    expected_guests: Optional[int] = Field(None, ge=0)
    actual_guests: Optional[int] = Field(None, ge=0)
    status: Optional[str] = Field(None, max_length=50)
    is_archived: Optional[bool] = None
    notes: Optional[str] = None
    hotel_id: Optional[int] = None

class EventListItemResponse(EventBase):
    id: int
    hotel_id: int
    hotel_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Calculated summary metrics
    total_prepared_kg: float = 0.0
    total_consumed_kg: float = 0.0
    total_leftover_kg: float = 0.0
    total_reuse_kg: float = 0.0
    total_waste_kg: float = 0.0
    waste_percentage: float = 0.0
    total_waste_cost: float = 0.0
    waste_per_guest_kg: float = 0.0
    waste_per_guest_grams: float = 0.0
    food_items_count: int = 0
    data_completeness_pct: float = 100.0

    model_config = ConfigDict(from_attributes=True)

class EventDetailResponse(EventListItemResponse):
    event_foods: List[EventFoodResponse] = []


class EventCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=255)

class EventCategoryResponse(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    is_builtin: bool = False
    hotel_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
