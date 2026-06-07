"""
Candidate profile item model for local-first resume generation.

Profile items are reusable career facts: education, work, projects, skills,
certificates, awards, and language abilities.
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database_lite import Base


class CandidateProfileItem(Base):
    """Reusable candidate fact stored under a candidate profile."""

    __tablename__ = "candidate_profile_items"

    id = Column(UUID, primary_key=True)
    profile_id = Column(UUID, ForeignKey("candidate_profiles.id"), nullable=False)
    item_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    organization = Column(String(255))
    role = Column(String(255))
    start_date = Column(String(50))
    end_date = Column(String(50))
    description = Column(Text)
    highlights_json = Column(Text)
    skills_json = Column(Text)
    metrics_json = Column(Text)
    visibility = Column(String(30), default="resume", nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    profile = relationship("CandidateProfile", back_populates="items")

    def __repr__(self):
        return f"<CandidateProfileItem(id={self.id}, type={self.item_type})>"
