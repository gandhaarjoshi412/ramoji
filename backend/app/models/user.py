from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="staff", nullable=False)  # 'admin' or 'staff'
    hotel_id = Column(Integer, ForeignKey("hotels.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    hotel = relationship("Hotel", back_populates="users")
    waste_records = relationship("WasteRecord", back_populates="recorder")
