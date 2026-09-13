from sqlalchemy import Column, Integer, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class EventFood(Base):
    __tablename__ = "event_foods"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    food_item_id = Column(Integer, ForeignKey("food_items.id"), nullable=False)
    prepared_weight_kg = Column(Float, nullable=False, default=0.0)
    estimated_cost_per_kg = Column(Float, nullable=False, default=0.0)
    notes = Column(Text, nullable=True)

    event = relationship("Event", back_populates="event_foods")
    food_item = relationship("FoodItem", back_populates="event_foods")
    waste_records = relationship("WasteRecord", back_populates="event_food", cascade="all, delete-orphan")
