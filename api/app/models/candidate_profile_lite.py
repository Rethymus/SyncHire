"""
Candidate profile model for local-first resume generation.

This stores the user's reusable career identity in SQLite. It deliberately
keeps structured fields as JSON text so the lite backend can stay dependency
light while preserving rich profile data for later generation services.
"""

from sqlalchemy import Column, DateTime, String, Text, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database_lite import Base


class CandidateProfile(Base):
    """Local candidate profile used as the source of truth for generation."""

    __tablename__ = "candidate_profiles"

    id = Column(UUID, primary_key=True)
    display_name = Column(String(255), nullable=False)
    target_title = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    location = Column(String(255))
    links_json = Column(Text)
    summary = Column(Text)
    privacy_settings_json = Column(Text)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    items = relationship(
        "CandidateProfileItem", back_populates="profile", cascade="all, delete-orphan"
    )
    role_cards = relationship(
        "CandidateRoleCard", back_populates="profile", cascade="all, delete-orphan"
    )
    resume_variants = relationship(
        "ResumeVariant", back_populates="profile", cascade="all, delete-orphan"
    )
    application_materials = relationship(
        "ApplicationMaterial",
        back_populates="profile",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<CandidateProfile(id={self.id}, display_name={self.display_name})>"
