"""
Local Profile Model

Stores user preferences and settings for local operation.
No authentication required - this is for local tool preferences only.
"""

from datetime import datetime
from sqlalchemy import Column, DateTime, Text, String, UUID
from sqlalchemy.sql import func

from app.core.database_lite import Base


class LocalProfile(Base):
    """Local user profile for preferences and settings."""

    __tablename__ = "local_profile"

    id = Column(UUID, primary_key=True)
    name = Column(String(255))  # User's display name
    email = Column(String(255))  # User's email (optional)
    phone = Column(String(50))  # User's phone (optional)
    preferences = Column(Text)  # JSON-encoded preferences
    default_resume_id = Column(UUID)  # Default resume for applications
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<LocalProfile(id={self.id}, name={self.name})>"
