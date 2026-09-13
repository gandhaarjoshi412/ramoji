from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

class FoodItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    default_unit: str = Field(default="kg", max_length=20)
    default_cost_per_kg: float = Field(default=0.0, ge=0.0)

    # Quantity Estimation Settings (Section 9)
    density_g_per_cm3: float = Field(default=0.85, ge=0.05, le=5.0)
    default_depth_cm: float = Field(default=4.0, ge=0.5, le=30.0)
    portion_scaling_factor: float = Field(default=1.0, ge=0.1, le=10.0)
    min_estimated_weight_g: float = Field(default=20.0, ge=1.0)
    max_estimated_weight_g: float = Field(default=25000.0, ge=10.0)
    calibration_factor: float = Field(default=1.0, ge=0.1, le=10.0)

class FoodItemCreate(FoodItemBase):
    pass

class FoodItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    default_unit: Optional[str] = Field(None, max_length=20)
    default_cost_per_kg: Optional[float] = Field(None, ge=0.0)
    density_g_per_cm3: Optional[float] = Field(None, ge=0.05, le=5.0)
    default_depth_cm: Optional[float] = Field(None, ge=0.5, le=30.0)
    portion_scaling_factor: Optional[float] = Field(None, ge=0.1, le=10.0)
    min_estimated_weight_g: Optional[float] = Field(None, ge=1.0)
    max_estimated_weight_g: Optional[float] = Field(None, ge=10.0)
    calibration_factor: Optional[float] = Field(None, ge=0.1, le=10.0)

class FoodItemResponse(FoodItemBase):
    id: int
    hotel_id: int
    recipe_id: Optional[int] = None
    cost_per_gram: float = 0.0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
