"""Application material pack model for local-first manual submission flows."""

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database_lite import Base


class ApplicationMaterial(Base):
    """Generated and reviewed material pack for a specific application."""

    __tablename__ = "application_materials"

    id = Column(UUID, primary_key=True)
    profile_id = Column(UUID, ForeignKey("candidate_profiles.id"), nullable=False)
    jd_id = Column(UUID, ForeignKey("job_descriptions.id"), nullable=False)
    resume_variant_id = Column(UUID, ForeignKey("resume_variants.id"))
    application_id = Column(UUID)
    language = Column(String(20), default="auto", nullable=False)
    platform = Column(String(50), default="manual", nullable=False)
    form_fields_json = Column(Text)
    cover_letter = Column(Text)
    opening_message = Column(Text)
    self_introduction = Column(Text)
    checklist_json = Column(Text)
    review_status = Column(String(50), default="draft", nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    profile = relationship("CandidateProfile", back_populates="application_materials")
    job_description = relationship(
        "JobDescription", back_populates="application_materials"
    )
    resume_variant = relationship(
        "ResumeVariant", back_populates="application_materials"
    )

    def __repr__(self):
        return f"<ApplicationMaterial(id={self.id}, status={self.review_status})>"
