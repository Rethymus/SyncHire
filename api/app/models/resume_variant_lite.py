"""
Resume variant model for local-first resume generation.

A variant is a JD-specific generated resume. It never overwrites the user's
base profile facts or previously imported resumes.
"""

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database_lite import Base


class ResumeVariant(Base):
    """Tailored resume variant linked to a profile and job description."""

    __tablename__ = "resume_variants"

    id = Column(UUID, primary_key=True)
    profile_id = Column(UUID, ForeignKey("candidate_profiles.id"), nullable=False)
    role_card_id = Column(UUID, ForeignKey("candidate_role_cards.id"))
    jd_id = Column(UUID, ForeignKey("job_descriptions.id"), nullable=False)
    application_id = Column(UUID)
    title = Column(String(255), nullable=False)
    language = Column(String(20), default="auto", nullable=False)
    template_id = Column(String(100))
    content_markdown = Column(Text, nullable=False)
    content_json = Column(Text)
    match_score = Column(Float)
    keyword_hits_json = Column(Text)
    gap_warnings_json = Column(Text)
    generation_rationale = Column(Text)
    ai_provider = Column(String(100))
    ai_model = Column(String(100))
    status = Column(String(50), default="draft", nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    profile = relationship("CandidateProfile", back_populates="resume_variants")
    role_card = relationship("CandidateRoleCard", back_populates="resume_variants")
    job_description = relationship("JobDescription", back_populates="resume_variants")
    exports = relationship(
        "ResumeExport", back_populates="resume_variant", cascade="all, delete-orphan"
    )
    application_materials = relationship(
        "ApplicationMaterial", back_populates="resume_variant"
    )

    def __repr__(self):
        return f"<ResumeVariant(id={self.id}, title={self.title})>"
