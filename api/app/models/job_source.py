"""
Job Source Model (ATS Board Subscription)

Represents a subscribed company recruiting page backed by a known ATS
(Applicant Tracking System) with a public job postings API. Syncing a
job source fetches official postings and ingests them as job
descriptions, keyed by (source, external_id) for deduplication.
"""

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, UUID
from sqlalchemy.sql import func

from app.core.database_lite import Base


class JobSource(Base):
    """Job Source model for local storage."""

    __tablename__ = "job_sources"

    id = Column(UUID, primary_key=True)
    name = Column(String(255), nullable=False)  # Company display name
    ats_type = Column(
        String(50), nullable=False
    )  # greenhouse | lever | ashby | smartrecruiters
    org_key = Column(
        String(255), nullable=False
    )  # Board token / company identifier used by the ATS API
    portal_url = Column(Text)  # Human-facing recruiting page URL
    enabled = Column(Boolean, default=True, nullable=False)
    last_synced_at = Column(DateTime(timezone=True))
    last_sync_status = Column(String(20))  # ok | error | empty
    last_sync_message = Column(Text)
    last_new_count = Column(Integer, default=0, nullable=False)
    last_total_count = Column(Integer, default=0, nullable=False)
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
        return f"<JobSource(id={self.id}, name={self.name}, ats={self.ats_type})>"

    @property
    def source_key(self) -> str:
        """Stable per-source key stored on ingested job descriptions."""
        return f"{self.ats_type}:{self.org_key.lower()}"
