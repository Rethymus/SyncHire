"""
Lightweight Application Model

Simplified application model without user dependencies for local-first operation.
"""

from sqlalchemy import Column, DateTime, Float, Text, UUID, ForeignKey, Enum, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database_lite import Base
from app.models import (  # noqa: F401
    application_material_lite,
    jd_lite,
    resume_lite,
    resume_variant_lite,
)


class ApplicationStatus(str, enum.Enum):
    """Application status enumeration."""

    SAVED = "saved"
    TARGETED = "targeted"
    MATERIALS_READY = "materials_ready"
    SUBMITTED = "submitted"
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
    resume_variant_id = Column(UUID, ForeignKey("resume_variants.id"))
    materials_id = Column(UUID, ForeignKey("application_materials.id"))
    status = Column(
        Enum(ApplicationStatus), default=ApplicationStatus.SAVED, nullable=False
    )
    platform = Column(String(50), default="manual", nullable=False)
    source_url = Column(Text)
    notes = Column(Text)  # User notes about this application
    match_score = Column(Float)  # AI-calculated match score (0-100)
    applied_date = Column(DateTime(timezone=True))
    submitted_manually_at = Column(DateTime(timezone=True))
    next_action = Column(String(255))
    next_action_at = Column(DateTime(timezone=True))
    contact_name = Column(String(255))
    contact_channel = Column(String(255))
    timeline_json = Column(Text)
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
    resume_variant = relationship("ResumeVariant")
    materials = relationship("ApplicationMaterial")

    def __repr__(self):
        return f"<Application(id={self.id}, status={self.status})>"
