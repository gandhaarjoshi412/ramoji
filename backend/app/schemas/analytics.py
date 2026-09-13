from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from app.schemas.waste_scan import WasteScanResponse

class EventFoodWasteSummary(BaseModel):
    food_name: str
    category: str
    total_waste_grams: float
    total_waste_kg: float
    total_waste_cost: float
    scans_count: int

class EventAnalyticsResponse(BaseModel):
    event_id: int
    event_name: str
    event_date: str
    event_type: str
    venue: Optional[str] = None
    expected_guests: int
    actual_guests: int
    status: str

    total_scans_count: int
    total_estimated_waste_kg: float
    total_estimated_waste_grams: float
    total_estimated_waste_cost: float
    waste_per_guest_grams: float
    average_ai_confidence: float
    human_corrections_count: int

    food_breakdown: List[EventFoodWasteSummary]
    scans: List[WasteScanResponse]

    model_config = ConfigDict(from_attributes=True)
