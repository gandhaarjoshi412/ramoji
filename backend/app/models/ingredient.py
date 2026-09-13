from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(Integer, ForeignKey("hotels.id"), nullable=False)
    name = Column(String(255), nullable=False)
    unit = Column(String(50), default="kg", nullable=False)  # kg, g, l, ml, piece
    cost_per_unit = Column(Float, default=0.0, nullable=False)  # Cost in INR per unit
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    recipe_ingredients = relationship("RecipeIngredient", back_populates="ingredient", cascade="all, delete-orphan")
