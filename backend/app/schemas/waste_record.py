from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

class WasteRecordCreate(BaseModel):
    event_food_id: int
    gross_weight_kg: float = Field(..., ge=0.0, description="Gross weight on scale including container")
    container_weight_kg: float = Field(default=0.0, ge=0.0, description="Tare weight of the container")
    waste_reason: str = Field(
        ..., 
        description="Reason: Excess preparation, Low consumption, Overproduction, Service leftover, Plate/serving leftover, Other"
    )
    notes: Optional[str] = None
    weight_source: Optional[str] = Field(default="Manual", description="Weight source: Manual, Bluetooth, Serial, USB")
    
    # Optional fields for future AI & scale integration
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    ai_food_prediction: Optional[str] = None
    ai_confidence: Optional[float] = None
    scale_weight: Optional[float] = None
    camera_device_id: Optional[str] = None

class WasteRecordUpdate(BaseModel):
    gross_weight_kg: Optional[float] = Field(None, ge=0.0)
    container_weight_kg: Optional[float] = Field(None, ge=0.0)
    waste_reason: Optional[str] = None
    notes: Optional[str] = None
    weight_source: Optional[str] = None

class WasteRecordResponse(BaseModel):
    id: int
    event_food_id: int
    gross_weight_kg: float
    container_weight_kg: float
    net_weight_kg: float
    waste_reason: str
    notes: Optional[str] = None
    recorded_by: Optional[int] = None
    recorded_by_name: Optional[str] = None
    recorded_at: datetime
    weight_source: str
    
    # Extensible fields
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    ai_food_prediction: Optional[str] = None
    ai_confidence: Optional[float] = None
    scale_weight: Optional[float] = None
    camera_device_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
