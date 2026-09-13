from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class Hotel(Base):
    __tablename__ = "hotels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    address = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    users = relationship("User", back_populates="hotel", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="hotel", cascade="all, delete-orphan")
    food_items = relationship("FoodItem", back_populates="hotel", cascade="all, delete-orphan")
