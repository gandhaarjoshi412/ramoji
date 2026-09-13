from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

class IngredientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    unit: str = Field(default="kg", max_length=50)
    cost_per_unit: float = Field(..., ge=0.0, description="Cost in INR per unit")

class IngredientCreate(IngredientBase):
    pass

class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    cost_per_unit: Optional[float] = Field(None, ge=0.0)

class IngredientResponse(IngredientBase):
    id: int
    hotel_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
