from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class FoodItem(Base):
    __tablename__ = "food_items"

    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(Integer, ForeignKey("hotels.id"), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)  # Main Course, Rice, Bread, Curry, Dal, Dessert, Salad, Beverage, Other
    default_unit = Column(String(20), default="kg", nullable=False)
    default_cost_per_kg = Column(Float, default=0.0, nullable=False)

    # Quantity Estimation Parameters (Section 9)
    density_g_per_cm3 = Column(Float, default=0.85, nullable=False)  # e.g., Biryani: 0.85, Paneer: 1.05
    default_depth_cm = Column(Float, default=4.0, nullable=False)    # Average pan depth in cm
    portion_scaling_factor = Column(Float, default=1.0, nullable=False)
    min_estimated_weight_g = Column(Float, default=20.0, nullable=False)
    max_estimated_weight_g = Column(Float, default=25000.0, nullable=False)
    calibration_factor = Column(Float, default=1.0, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    hotel = relationship("Hotel", back_populates="food_items")
    event_foods = relationship("EventFood", back_populates="food_item", cascade="all, delete-orphan")
    recipe = relationship("Recipe", back_populates="food_item", uselist=False, cascade="all, delete-orphan")
    waste_scans = relationship("WasteScan", back_populates="food_item")
