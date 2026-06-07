import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, JSON
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
    username = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_onboarded = Column(Boolean, default=False)
    onboarding_completed_at = Column(DateTime, nullable=True)

    # Two-Factor Authentication (2FA) fields
    two_factor_enabled = Column(Boolean, default=False, nullable=False)
    two_factor_secret = Column(String, nullable=True)  # TOTP secret key
    backup_codes = Column(JSON, nullable=True)  # Backup codes for 2FA
    two_factor_enabled_at = Column(DateTime, nullable=True)

    # Notification preferences
    notification_preferences = Column(
        JSONB,
        nullable=True,
        default={
            "email_enabled": True,
            "application_status_updates": True,
            "interview_reminders": True,
            "weekly_digest": False,
            "job_recommendations": True,
            "profile_views": True,
            "notification_frequency": NotificationFrequency.IMMEDIATE.value,
        },
    )

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
    jds = relationship("JD", back_populates="user", order_by="JD.created_at.desc()")
    notifications = relationship(
        "Notification",
        back_populates="user",
        order_by="Notification.created_at.desc()",
        cascade="all, delete-orphan",
    )
    search_history = relationship(
        "SearchHistory",
        back_populates="user",
        order_by="SearchHistory.created_at.desc()",
        cascade="all, delete-orphan",
    )
    saved_searches = relationship(
        "SavedSearch",
        back_populates="user",
        order_by="SavedSearch.created_at.desc()",
        cascade="all, delete-orphan",
    )
    search_analytics = relationship(
        "SearchAnalytics", back_populates="user", cascade="all, delete-orphan"
    )
    interviews = relationship(
        "Interview", back_populates="user", cascade="all, delete-orphan"
    )
    interview_reminders = relationship(
        "InterviewReminder", back_populates="user", cascade="all, delete-orphan"
    )
    interview_events = relationship(
        "InterviewEvent", back_populates="user", cascade="all, delete-orphan"
    )
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    oauth_accounts = relationship(
        "OAuthAccount",
        back_populates="user",
        order_by="OAuthAccount.created_at.desc()",
        cascade="all, delete-orphan",
    )


class OAuthAccount(Base):
    """OAuth account linking for social login"""

    __tablename__ = "oauth_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider = Column(String, nullable=False)  # 'google' or 'github'
    provider_user_id = Column(String, nullable=False)  # OAuth provider's user ID
    access_token = Column(String, nullable=True)  # Encrypted access token
    refresh_token = Column(String, nullable=True)  # Encrypted refresh token
    account_info = Column(JSONB, nullable=True)  # Additional account info
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="oauth_accounts")
