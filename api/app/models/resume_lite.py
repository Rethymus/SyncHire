"""
Lightweight Resume Model

Simplified resume model without user dependencies for local-first operation.
"""

from datetime import datetime
from sqlalchemy import Column, DateTime, Text, String, UUID, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database_lite import Base


class Resume(Base):
    """Resume model for local storage."""

    __tablename__ = "resumes"

    id = Column(UUID, primary_key=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    file_path = Column(String(500))  # Local file path
    file_name = Column(String(255))  # Original filename
    embedding = Column(Text)  # JSON-encoded vector for semantic search
    parsed_data = Column(Text)  # JSON-encoded parsed resume data
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    applications = relationship("Application", back_populates="resume", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Resume(id={self.id}, title={self.title})>"
