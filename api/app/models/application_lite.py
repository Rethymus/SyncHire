"""
Lightweight Application Model

Simplified application model without user dependencies for local-first operation.
"""

from datetime import datetime
from sqlalchemy import Column, DateTime, Text, String, UUID, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database_lite import Base


class ApplicationStatus(str, enum.Enum):
    """Application status enumeration."""

    SAVED = "saved"
    APPLIED = "applied"
    SCREENING = "screening"
    INTERVIEW = "interview"
    TECHNICAL = "technical"
    OFFER = "offer"
    HIRED = "hired"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class Application(Base):
    """Application model for local storage."""

    __tablename__ = "applications"

    id = Column(UUID, primary_key=True)
    resume_id = Column(UUID, ForeignKey("resumes.id"), nullable=False)
    jd_id = Column(UUID, ForeignKey("job_descriptions.id"), nullable=False)
    status = Column(
        Enum(ApplicationStatus), default=ApplicationStatus.SAVED, nullable=False
    )
    notes = Column(Text)  # User notes about this application
    match_score = Column(Float)  # AI-calculated match score (0-100)
    applied_date = Column(DateTime(timezone=True))
    last_updated = Column(DateTime(timezone=True))
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    resume = relationship("Resume", back_populates="applications")
    job_description = relationship("JobDescription", back_populates="applications")

    def __repr__(self):
        return f"<Application(id={self.id}, status={self.status})>"
