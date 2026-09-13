from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Any

class WasteScanVerifyRequest(BaseModel):
    food_item_id: Optional[int] = None
    human_food_correction: Optional[str] = Field(None, description="Corrected food name if AI misclassified")
    human_weight_correction: Optional[float] = Field(None, ge=0.0, description="Corrected weight in grams")
    notes: Optional[str] = None

class WasteScanResponse(BaseModel):
    id: int
    event_id: int
    food_item_id: Optional[int] = None
    image_url: str
    created_at: datetime

    # AI Detection
    ai_food_prediction: str
    ai_confidence: float
    bounding_box: Optional[Any] = None
    segmentation_mask: Optional[Any] = None

    # Quantity Estimation
    estimated_weight_grams: float
    estimation_confidence: float
    measurement_method: str = "camera_estimate"

    # Cost Calculation
    cost_per_gram: float
    estimated_waste_cost: float

    # Model Versioning
    ai_model_name: str
    ai_model_version: str

    # Human Verification
    human_verified: bool
    human_food_correction: Optional[str] = None
    human_weight_correction: Optional[float] = None
    is_low_confidence: bool
    notes: Optional[str] = None

    # Effective / Final values
    final_food_name: str
    final_weight_grams: float
    final_waste_cost: float

    model_config = ConfigDict(from_attributes=True)

class TrainingDataExportItem(BaseModel):
    scan_id: int
    image_url: str
    ai_prediction: str
    ai_confidence: float
    human_correction: Optional[str] = None
    final_food_label: str
    estimated_weight_g: float
    final_weight_g: float
    event_name: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
