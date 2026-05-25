import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class NotificationFrequency(str, enum.Enum):
    """Email notification frequency options."""
    IMMEDIATE = "immediate"
    DAILY = "daily"
    WEEKLY = "weekly"
    NEVER = "never"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_onboarded = Column(Boolean, default=False)
    onboarding_completed_at = Column(DateTime, nullable=True)

    # Notification preferences
    notification_preferences = Column(JSONB, nullable=True, default={
        "email_enabled": True,
        "application_status_updates": True,
        "interview_reminders": True,
        "weekly_digest": False,
        "job_recommendations": True,
        "profile_views": True,
        "notification_frequency": NotificationFrequency.IMMEDIATE.value
    })

    # Email tracking
    email_unsubscribed = Column(Boolean, default=False)
    email_unsubscribed_at = Column(DateTime, nullable=True)
    email_bounced = Column(Boolean, default=False)
    email_bounced_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    applications = relationship(
        "Application", back_populates="user", order_by="Application.created_at.desc()"
    )
    resumes = relationship(
        "Resume", back_populates="user", order_by="Resume.created_at.desc()"
    )
    notifications = relationship(
        "Notification", back_populates="user", order_by="Notification.created_at.desc()",
        cascade="all, delete-orphan"
    )
    search_history = relationship(
        "SearchHistory", back_populates="user", order_by="SearchHistory.search_timestamp.desc()",
        cascade="all, delete-orphan"
    )
    saved_searches = relationship(
        "SavedSearch", back_populates="user", order_by="SavedSearch.created_at.desc()",
        cascade="all, delete-orphan"
    )
    search_analytics = relationship(
        "SearchAnalytics", back_populates="user", order_by="SearchAnalytics.search_count.desc()",
        cascade="all, delete-orphan"
    )
