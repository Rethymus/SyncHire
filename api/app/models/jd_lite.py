"""
Lightweight Job Description Model

Simplified JD model without user dependencies for local-first operation.
"""

from sqlalchemy import Column, DateTime, Index, Text, String, UUID, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database_lite import Base


class JobDescription(Base):
    """Job Description model for local storage."""

    __tablename__ = "job_descriptions"

    id = Column(UUID, primary_key=True)
    company = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    url = Column(Text)  # Original URL if imported from web
    platform = Column(String(50), default="manual", nullable=False)
    source_url = Column(Text)
    raw_text = Column(Text)
    # Provenance for jobs ingested from ATS job sources (deduplication key)
    source = Column(String(100), index=True)  # e.g. "greenhouse:stripe"
    external_id = Column(String(255))
    location = Column(String(255))
    salary_min = Column(Float)
    salary_max = Column(Float)
    currency = Column(String(10), default="USD")
    employment_type = Column(String(50))  # full-time, part-time, contract, etc.
    remote = Column(String(20), default="onsite")  # remote, hybrid, onsite
    requirements = Column(Text)  # JSON-encoded requirements
    benefits = Column(Text)  # JSON-encoded benefits
    embedding = Column(Text)  # JSON-encoded vector for semantic search
    match_score = Column(Float)  # Local lexical match score (0-100)
    match_detail = Column(Text)  # JSON-encoded scoring detail
    parsed_data = Column(Text)  # JSON-encoded parsed JD data
    parsed_json = Column(Text)
    language = Column(String(20), default="auto", nullable=False)
    deadline = Column(DateTime(timezone=True))
    notes = Column(Text)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # One row per ATS posting; manual JDs keep NULLs (distinct in SQLite)
    __table_args__ = (
        Index(
            "uq_job_descriptions_source_external_id",
            "source",
            "external_id",
            unique=True,
        ),
    )

    # Relationships
    applications = relationship(
        "Application", back_populates="job_description", cascade="all, delete-orphan"
    )
    resume_variants = relationship(
        "ResumeVariant", back_populates="job_description", cascade="all, delete-orphan"
    )
    application_materials = relationship(
        "ApplicationMaterial",
        back_populates="job_description",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<JobDescription(id={self.id}, company={self.company}, title={self.title})>"
