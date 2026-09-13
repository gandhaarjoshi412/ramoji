from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from app.schemas.ingredient import IngredientResponse

class RecipeIngredientBase(BaseModel):
    ingredient_id: int
    quantity: float = Field(..., gt=0.0)
    unit: str = Field(default="kg")

class RecipeIngredientCreate(RecipeIngredientBase):
    pass

class RecipeIngredientResponse(RecipeIngredientBase):
    id: int
    recipe_id: int
    ingredient: Optional[IngredientResponse] = None

    model_config = ConfigDict(from_attributes=True)

class RecipeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    food_item_id: Optional[int] = None
    expected_yield_grams: float = Field(..., gt=0.0, description="Cooked batch yield in grams")
    notes: Optional[str] = None

class RecipeCreate(RecipeBase):
    ingredients: List[RecipeIngredientCreate] = []

class RecipeUpdate(BaseModel):
    name: Optional[str] = None
    food_item_id: Optional[int] = None
    expected_yield_grams: Optional[float] = Field(None, gt=0.0)
    notes: Optional[str] = None
    ingredients: Optional[List[RecipeIngredientCreate]] = None

class RecipeResponse(RecipeBase):
    id: int
    hotel_id: int
    food_item_name: Optional[str] = None
    total_batch_cost: float = 0.0
    cost_per_gram: float = 0.0
    ingredients: List[RecipeIngredientResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
