from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from app.schemas.waste_record import WasteRecordResponse

class EventFoodBase(BaseModel):
    food_item_id: int
    prepared_weight_kg: float = Field(..., gt=0.0, description="Prepared weight in kg must be > 0")
    estimated_cost_per_kg: float = Field(default=0.0, ge=0.0, description="Estimated cost per kg in INR")
    notes: Optional[str] = None

class EventFoodCreate(EventFoodBase):
    pass

class EventFoodUpdate(BaseModel):
    prepared_weight_kg: Optional[float] = Field(None, gt=0.0)
    estimated_cost_per_kg: Optional[float] = Field(None, ge=0.0)
    notes: Optional[str] = None

class EventFoodResponse(BaseModel):
    id: int
    event_id: int
    food_item_id: int
    food_item_name: str
    food_item_category: str
    food_item_unit: str = "kg"
    prepared_weight_kg: float
    estimated_cost_per_kg: float
    notes: Optional[str] = None
    
    # Calculated metrics
    net_waste_kg: float = 0.0
    waste_percentage: float = 0.0
    waste_cost: float = 0.0
    waste_records: List[WasteRecordResponse] = []

    model_config = ConfigDict(from_attributes=True)
