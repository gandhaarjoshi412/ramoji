from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class EventCategory(Base):
    __tablename__ = "event_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    code = Column(String(50), nullable=True)
    description = Column(String(255), nullable=True)
    subtypes = Column(String(500), nullable=True)
    is_builtin = Column(Boolean, default=False, nullable=False)
    hotel_id = Column(Integer, ForeignKey("hotels.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    hotel = relationship("Hotel")
