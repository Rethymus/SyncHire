"""
Lightweight Job Description Model

Simplified JD model without user dependencies for local-first operation.
"""

from datetime import datetime
from sqlalchemy import Column, DateTime, Text, String, UUID, Float, ForeignKey
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
    location = Column(String(255))
    salary_min = Column(Float)
    salary_max = Column(Float)
    currency = Column(String(10), default="USD")
    employment_type = Column(String(50))  # full-time, part-time, contract, etc.
    remote = Column(String(20), default="onsite")  # remote, hybrid, onsite
    requirements = Column(Text)  # JSON-encoded requirements
    benefits = Column(Text)  # JSON-encoded benefits
    embedding = Column(Text)  # JSON-encoded vector for semantic search
    parsed_data = Column(Text)  # JSON-encoded parsed JD data
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
    applications = relationship(
        "Application", back_populates="job_description", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<JobDescription(id={self.id}, company={self.company}, title={self.title})>"
