from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class TopWasteFoodItem(BaseModel):
    food_name: str
    category: str
    total_waste_kg: float
    total_waste_cost: float
    scans_count: int

class WasteByEventItem(BaseModel):
    event_id: int
    event_name: str
    event_date: str
    event_type: str
    actual_guests: int
    total_waste_kg: float
    total_waste_cost: float
    scans_count: int

class WasteTrendPoint(BaseModel):
    date: str
    event_name: str
    waste_kg: float
    waste_cost: float

class DashboardSummaryResponse(BaseModel):
    total_events: int
    completed_events: int
    active_events: int
    upcoming_events: int
    total_scans: int
    total_guests_served: int
    
    total_estimated_waste_kg: float
    total_waste_kg: float = 0.0  # Alias for backward compatibility
    total_estimated_waste_cost: float
    total_waste_cost: float = 0.0  # Alias for backward compatibility
    average_waste_per_guest_grams: float
    average_ai_confidence: float
    human_corrections_count: int

    top_wasted_foods: List[TopWasteFoodItem]
    waste_by_event: List[WasteByEventItem]
    waste_trends: List[WasteTrendPoint]

    model_config = ConfigDict(from_attributes=True)
