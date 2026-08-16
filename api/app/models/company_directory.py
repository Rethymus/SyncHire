"""
Company Directory Model - Domestic Recruiting Site Radar

A curated directory of company career sites (campus + social). Public
WeChat article titles act as lightweight "hiring started" signals that
re-order the directory: detecting a signal pins the company with the
batch label and detection date, instead of ingesting article content.
"""

from sqlalchemy import Boolean, Column, DateTime, String, Text, UUID
from sqlalchemy.sql import func

from app.core.database_lite import Base


class CompanyDirectoryEntry(Base):
    """One company's official recruiting site plus its latest signal."""

    __tablename__ = "company_directory"

    id = Column(UUID, primary_key=True)
    name = Column(String(255), nullable=False)  # Canonical name, e.g. 腾讯
    aliases = Column(Text)  # JSON list used for signal title matching
    career_url = Column(Text)  # Official career page (campus or unified)
    career_type = Column(String(20), default="both")  # campus | social | both
    industry = Column(String(50))
    verified = Column(Boolean, default=False, nullable=False)  # URL checked
    # Latest hiring signal (from public article titles)
    signal_batch = Column(String(50))  # e.g. "2027届秋招", "暑期实习"
    signal_title = Column(Text)  # Article title that triggered the signal
    signal_url = Column(Text)  # Article URL for provenance
    signal_detected_at = Column(DateTime(timezone=True))
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self):
        return f"<CompanyDirectoryEntry(name={self.name}, signal={self.signal_batch})>"
