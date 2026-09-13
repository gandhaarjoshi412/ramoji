from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(Integer, ForeignKey("hotels.id"), nullable=False)
    food_item_id = Column(Integer, ForeignKey("food_items.id"), unique=True, nullable=True)
    name = Column(String(255), nullable=False)
    expected_yield_grams = Column(Float, nullable=False, default=1000.0)  # e.g., 10,000 g batch yield
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    food_item = relationship("FoodItem", back_populates="recipe")
    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")
