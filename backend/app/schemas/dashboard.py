from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Union

class TopWasteFoodItem(BaseModel):
    food_name: str
    category: str
    total_waste_kg: float
    total_waste_cost: float
    scans_count: Optional[int] = 0
    total_prepared_kg: Optional[float] = 0.0
    waste_percentage: Optional[float] = 0.0
    events_count: Optional[int] = 0

class WasteByEventItem(BaseModel):
    event_id: int
    event_name: str
    event_date: str
    event_type: str
    status: str = "Completed"
    actual_guests: int
    total_waste_kg: float
    total_waste_cost: float
    scans_count: Optional[int] = 0

class WasteTrendItem(BaseModel):
    event_id: int
    event_name: str
    event_date: str
    event_type: str
    actual_guests: Optional[int] = 0
    prepared_kg: Optional[float] = 0.0
    waste_kg: float
    waste_percentage: Optional[float] = 0.0
    waste_cost: float

class WasteTrendPoint(BaseModel):
    date: str
    event_name: str
    waste_kg: float
    waste_cost: float

class WasteReasonSummary(BaseModel):
    reason: str
    total_waste_kg: float
    percentage: float
    records_count: int

class DashboardSummaryResponse(BaseModel):
    period: Optional[str] = "all"
    total_events: int
    completed_events: int
    active_events: int
    upcoming_events: int
    total_scans: Optional[int] = 0
    total_guests_served: int
    
    total_food_prepared_kg: Optional[float] = 0.0
    total_prepared_kg: Optional[float] = 0.0
    total_estimated_waste_kg: Optional[float] = 0.0
    total_waste_kg: Optional[float] = 0.0  # Alias for backward compatibility
    total_estimated_waste_cost: Optional[float] = 0.0
    total_waste_cost: Optional[float] = 0.0  # Alias for backward compatibility
    overall_waste_percentage: Optional[float] = 0.0
    average_waste_per_guest_grams: Optional[float] = 0.0
    average_ai_confidence: Optional[float] = 0.0
    human_corrections_count: Optional[int] = 0

    top_wasted_foods: List[TopWasteFoodItem] = []
    waste_by_event: List[WasteByEventItem] = []
    waste_trends: List[Union[WasteTrendItem, WasteTrendPoint]] = []
    waste_reasons: List[WasteReasonSummary] = []

    model_config = ConfigDict(from_attributes=True)
