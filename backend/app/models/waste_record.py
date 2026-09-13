from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class WasteRecord(Base):
    __tablename__ = "waste_records"

    id = Column(Integer, primary_key=True, index=True)
    event_food_id = Column(Integer, ForeignKey("event_foods.id"), nullable=False)
    gross_weight_kg = Column(Float, nullable=False)
    container_weight_kg = Column(Float, nullable=False, default=0.0)
    net_weight_kg = Column(Float, nullable=False)
    waste_reason = Column(String(100), nullable=False)  # Excess preparation, Low consumption, Overproduction, Service leftover, Plate/serving leftover, Other
    notes = Column(Text, nullable=True)
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Scale provider integration
    weight_source = Column(String(50), default="Manual", nullable=False)  # Manual, Bluetooth, Serial, USB
    
    # Extensible fields for future AI & Computer Vision architecture
    image_url = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)
    ai_food_prediction = Column(String(255), nullable=True)
    ai_confidence = Column(Float, nullable=True)
    scale_weight = Column(Float, nullable=True)
    camera_device_id = Column(String(100), nullable=True)

    event_food = relationship("EventFood", back_populates="waste_records")
    recorder = relationship("User", back_populates="waste_records")
