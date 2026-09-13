from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class WasteScan(Base):
    __tablename__ = "waste_scans"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    food_item_id = Column(Integer, ForeignKey("food_items.id"), nullable=True)
    image_url = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # AI Detection & Segmentation Results
    ai_food_prediction = Column(String(255), nullable=False)
    ai_confidence = Column(Float, nullable=False)
    bounding_box = Column(Text, nullable=True)        # JSON string of [x1, y1, x2, y2]
    segmentation_mask = Column(Text, nullable=True)   # Polygon points or RLE reference
    
    # Quantity Estimation Results (Camera-only approximation)
    estimated_weight_grams = Column(Float, nullable=False)
    estimation_confidence = Column(Float, default=0.75, nullable=False)
    measurement_method = Column(String(100), default="camera_estimate", nullable=False)
    
    # Cost Engine Calculations
    cost_per_gram = Column(Float, nullable=False, default=0.0)
    estimated_waste_cost = Column(Float, nullable=False, default=0.0)

    # Model Tracking & Versioning
    ai_model_name = Column(String(100), default="YOLO26-seg", nullable=False)
    ai_model_version = Column(String(100), default="food-model-v0.1", nullable=False)

    # Human Verification & Continuous Learning
    human_verified = Column(Boolean, default=False, nullable=False)
    human_food_correction = Column(String(255), nullable=True)
    human_weight_correction = Column(Float, nullable=True)
    human_cost_correction = Column(Float, nullable=True)
    is_low_confidence = Column(Boolean, default=False, nullable=False)
    notes = Column(Text, nullable=True)

    # Relationships
    event = relationship("Event", back_populates="waste_scans")
    food_item = relationship("FoodItem", back_populates="waste_scans")

    @property
    def final_food_name(self) -> str:
        return self.human_food_correction if self.human_food_correction else self.ai_food_prediction

    @property
    def final_weight_grams(self) -> float:
        return self.human_weight_correction if self.human_weight_correction is not None else self.estimated_weight_grams

    @property
    def final_waste_cost(self) -> float:
        if self.human_cost_correction is not None:
            return self.human_cost_correction
        return round(self.final_weight_grams * self.cost_per_gram, 2)
