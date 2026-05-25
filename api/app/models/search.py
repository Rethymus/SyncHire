"""
Search history and saved searches models.
Supports user-specific search tracking with privacy controls.
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    DateTime,
    Integer,
    Boolean,
    Text,
    ForeignKey,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class SearchType(str, enum.Enum):
    """Types of searches."""

    RESUME = "resume"
    JD = "jd"
    APPLICATION = "application"


class SearchHistory(Base):
    """
    Track user search history for analytics and quick re-run.
    Automatically maintains last 10 searches per user per type.
    """

    __tablename__ = "search_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Search details
    query = Column(Text, nullable=False)
    search_type = Column(String, nullable=False, default=SearchType.RESUME.value)
    filters = Column(JSONB, nullable=True)  # Store search filters as JSON

    # Results tracking
    result_count = Column(Integer, default=0)

    # Analytics
    search_timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Privacy controls
    is_sensitive = Column(Boolean, default=False)  # Mark sensitive searches

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="search_history")

    # Indexes for common queries
    __table_args__ = (
        Index(
            "ix_search_history_user_timestamp",
            "user_id",
            "search_timestamp",
            postgresql_ops={"search_timestamp": "DESC"},
        ),
        Index("ix_search_history_user_type", "user_id", "search_type"),
    )


class SavedSearch(Base):
    """
    User-saved searches with custom names and organization.
    Supports export/import and quick re-run functionality.
    """

    __tablename__ = "saved_searches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Search details
    name = Column(String(255), nullable=False)  # Custom name for the search
    description = Column(Text, nullable=True)  # Optional description
    query = Column(Text, nullable=False)
    search_type = Column(String, nullable=False, default=SearchType.RESUME.value)
    filters = Column(JSONB, nullable=True)  # Complete filter configuration

    # Usage tracking
    usage_count = Column(Integer, default=0)  # How many times re-run
    last_used_at = Column(DateTime, nullable=True)

    # Organization
    tags = Column(JSONB, nullable=True)  # User-defined tags for organization
    is_favorite = Column(Boolean, default=False)  # Mark as favorite

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="saved_searches")

    # Indexes
    __table_args__ = (
        Index("ix_saved_searches_user_favorite", "user_id", "is_favorite"),
        Index(
            "ix_saved_searches_user_usage",
            "user_id",
            "usage_count",
            postgresql_ops={"usage_count": "DESC"},
        ),
    )


class SearchAnalytics(Base):
    """
    Aggregate search analytics for insights and suggestions.
    Updated asynchronously to avoid impacting search performance.
    """

    __tablename__ = "search_analytics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Analytics data
    search_term = Column(String(255), nullable=False)
    search_type = Column(String, nullable=False)
    search_count = Column(Integer, default=1)  # Frequency of this search
    last_searched_at = Column(DateTime, default=datetime.utcnow)

    # Performance metrics
    avg_result_count = Column(Integer, nullable=True)  # Average results returned
    avg_search_duration = Column(
        Integer, nullable=True
    )  # Average search duration in ms

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="search_analytics")

    # Indexes
    __table_args__ = (
        Index("ix_search_analytics_user_term", "user_id", "search_term"),
        Index(
            "ix_search_analytics_user_frequency",
            "user_id",
            "search_count",
            postgresql_ops={"search_count": "DESC"},
        ),
    )
