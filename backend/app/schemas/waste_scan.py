from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Any

class WasteScanVerifyRequest(BaseModel):
    food_item_id: Optional[int] = None
    human_food_correction: Optional[str] = Field(None, description="Corrected food name if AI misclassified")
    human_weight_correction: Optional[float] = Field(None, ge=0.0, description="Corrected weight in grams")
    notes: Optional[str] = None
    # Aliases
    final_food_id: Optional[int] = None
    final_weight_kg: Optional[float] = None
    correction_notes: Optional[str] = None

class ScanDetectionDto(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    coverage_percent: float
    instance_count: int = 1

class WasteScanPayload(BaseModel):
    scan_id: str
    event_id: int
    event_food_id: Optional[int] = None
    gross_weight_kg: float = 0.0
    container_weight_kg: float = 0.0
    waste_reason: str = "Camera AI Scan"
    notes: Optional[str] = None
    weight_source: str = "Camera_AI_Estimate"
    ai_food_prediction: str
    ai_confidence: float
    timestamp: str
    model_version: str = "platesight-v1.0-dishes58"
    detections: List[ScanDetectionDto] = []

class DetectedFoodItem(BaseModel):
    name: str
    confidence: float
    confidence_percent: Optional[int] = None
    class_id: Optional[int] = None
    coverage_percent: Optional[float] = None
    instance_count: Optional[int] = 1

class WasteScanResponse(BaseModel):
    id: int
    event_id: int
    food_item_id: Optional[int] = None
    image_url: str
    annotated_image_url: Optional[str] = None
    created_at: datetime

    # AI Detection
    ai_food_prediction: str
    ai_confidence: float
    bounding_box: Optional[Any] = None
    segmentation_mask: Optional[Any] = None
    detected_items: Optional[List[DetectedFoodItem]] = None

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

    # Convenience / Frontend Aliases
    final_food_id: Optional[int] = None
    final_weight_kg: Optional[float] = None
    estimated_weight_kg: Optional[float] = None
    estimated_cost: Optional[float] = None
    density_factor: Optional[float] = None
    correction_notes: Optional[str] = None

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
