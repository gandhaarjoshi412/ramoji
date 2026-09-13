from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class WasteReasonSummary(BaseModel):
    reason: str
    total_waste_kg: float
    percentage: float
    records_count: int

    model_config = ConfigDict(from_attributes=True)

class ReportFoodItem(BaseModel):
    food_name: str
    category: str
    prepared_kg: float
    leftover_kg: float
    waste_percentage: float
    cost_per_kg: float
    waste_cost: float
    primary_reason: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class EventReportResponse(BaseModel):
    hotel_name: str
    hotel_address: Optional[str] = None
    generated_at: datetime
    
    event_id: int
    event_name: str
    event_type: str
    venue: Optional[str] = None
    event_date: date
    expected_guests: int
    actual_guests: int
    status: str
    
    # Overall statistics
    total_food_prepared_kg: float
    total_food_waste_kg: float
    waste_rate_percentage: float
    waste_per_guest_grams: float
    waste_per_guest_kg: float
    estimated_waste_cost: float
    
    food_breakdown: List[ReportFoodItem]
    waste_reasons_breakdown: List[WasteReasonSummary]
    disclaimer: str = (
        "Estimated waste cost is calculated using configured recipe ingredient costs per gram "
        "and is intended for operational analysis."
    )

    model_config = ConfigDict(from_attributes=True)
