from datetime import datetime, timezone, date
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(Integer, ForeignKey("hotels.id"), nullable=False)
    name = Column(String(255), nullable=False)
    event_type = Column(String(100), default="Wedding", nullable=False)  # Wedding, Conference, Corporate, Birthday, Social, Regular Hotel Service, Other
    event_subtype = Column(String(100), nullable=True)  # Meeting, Conference, Gala, Milestone Party, Reception
    client_name = Column(String(255), nullable=True)     # Organizer or client
    venue = Column(String(255), nullable=True)
    service_format = Column(String(100), default="Buffet", nullable=True)  # Buffet, Banquet Set Menu, À la Carte, Room Service
    event_date = Column(Date, nullable=False, default=date.today)
    expected_guests = Column(Integer, default=0, nullable=False)
    actual_guests = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="Upcoming", nullable=False)  # Upcoming, Active, Completed
    is_archived = Column(Boolean, default=False, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    hotel = relationship("Hotel", back_populates="events")
    event_foods = relationship("EventFood", back_populates="event", cascade="all, delete-orphan")
    waste_scans = relationship("WasteScan", back_populates="event", cascade="all, delete-orphan")

