"""
Candidate role card model for local-first resume generation.

A role card is the editable distillation of a candidate profile into a target
job-search identity.
"""

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database_lite import Base


class CandidateRoleCard(Base):
    """Distilled career card used to tailor resumes to job descriptions."""

    __tablename__ = "candidate_role_cards"

    id = Column(UUID, primary_key=True)
    profile_id = Column(UUID, ForeignKey("candidate_profiles.id"), nullable=False)
    name = Column(String(255), nullable=False)
    target_roles_json = Column(Text)
    strengths_json = Column(Text)
    weaknesses_json = Column(Text)
    core_skills_json = Column(Text)
    proof_points_json = Column(Text)
    tone_preferences_json = Column(Text)
    generated_from_json = Column(Text)
    model_provider = Column(String(100))
    model_name = Column(String(100))
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    profile = relationship("CandidateProfile", back_populates="role_cards")
    resume_variants = relationship("ResumeVariant", back_populates="role_card")

    def __repr__(self):
        return f"<CandidateRoleCard(id={self.id}, name={self.name})>"
