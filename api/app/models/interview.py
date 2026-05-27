"""
Interview database models for scheduling and calendar integration.
"""

from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    DateTime,
    Text,
    Integer,
    Boolean,
    ForeignKey,
    Numeric,
    JSON,
    CheckConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class Interview(Base):
    """Interview scheduling model."""

    __tablename__ = "interviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(
        UUID(as_uuid=True),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # Interview details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    interview_type = Column(String(50), nullable=False, default="screening")
    status = Column(String(50), nullable=False, default="scheduled")

    # Scheduling
    scheduled_date = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=60)
    timezone = Column(String(100), default="UTC")

    # Location/Platform
    location_type = Column(String(50), nullable=False, default="remote")
    location_url = Column(Text, nullable=True)
    location_address = Column(Text, nullable=True)
    meeting_platform = Column(String(100), nullable=True)
    meeting_id = Column(String(255), nullable=True)
    meeting_password = Column(String(255), nullable=True)

    # Interviewers
    interviewers = Column(JSONB, default=list)

    # Preparation
    preparation_notes = Column(Text, nullable=True)
    resume_version_id = Column(UUID(as_uuid=True), nullable=True)

    # Follow-up
    feedback = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)
    next_steps = Column(Text, nullable=True)

    # Reminders
    reminder_enabled = Column(Boolean, default=True)
    reminder_timings = Column(JSONB, default=list)
    last_reminder_sent_at = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "duration_minutes > 0 AND duration_minutes <= 480", name="valid_duration"
        ),
        CheckConstraint("rating >= 1 AND rating <= 5", name="valid_rating"),
    )

    # Relationships
    application = relationship("Application", back_populates="interviews")
    user = relationship("User", back_populates="interviews")
    reminders = relationship(
        "InterviewReminder", back_populates="interview", cascade="all, delete-orphan"
    )
    events = relationship(
        "InterviewEvent", back_populates="interview", cascade="all, delete-orphan"
    )


class InterviewReminder(Base):
    """Interview reminder tracking model."""

    __tablename__ = "interview_reminders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    interview_id = Column(
        UUID(as_uuid=True),
        ForeignKey("interviews.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    reminder_timing = Column(Numeric(5, 2), nullable=False)  # Hours before interview
    scheduled_for = Column(DateTime(timezone=True), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), nullable=False, default="pending")
    delivery_method = Column(String(50), default="in_app")
    error_message = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    interview = relationship("Interview", back_populates="reminders")
    user = relationship("User", back_populates="interview_reminders")


class InterviewEvent(Base):
    """External calendar integration model."""

    __tablename__ = "interview_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    interview_id = Column(
        UUID(as_uuid=True),
        ForeignKey("interviews.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # Calendar integration
    external_calendar_id = Column(String(255), nullable=True)
    calendar_provider = Column(String(100), nullable=True)
    sync_status = Column(String(50), default="not_synced")
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    sync_error = Column(Text, nullable=True)

    # Event metadata
    event_data = Column(JSONB, nullable=True)

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
    interview = relationship("Interview", back_populates="events")
    user = relationship("User", back_populates="interview_events")
