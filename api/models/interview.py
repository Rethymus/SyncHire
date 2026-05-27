"""
Interview models for scheduling and calendar integration.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from uuid import UUID


class Interviewer(BaseModel):
    """Interviewer information."""
    name: str = Field(..., min_length=1, max_length=255)
    role: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)


class InterviewCreate(BaseModel):
    """Request model for creating an interview."""
    application_id: UUID
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    interview_type: str = Field(default="screening", pattern="^(screening|technical|behavioral|panel|onsite|final)$")
    scheduled_date: datetime
    duration_minutes: int = Field(default=60, ge=15, le=480)
    timezone: str = Field(default="UTC", max_length=100)
    location_type: str = Field(default="remote", pattern="^(remote|in_person|phone|video)$")
    location_url: Optional[str] = None
    location_address: Optional[str] = None
    meeting_platform: Optional[str] = Field(None, max_length=100)
    meeting_id: Optional[str] = Field(None, max_length=255)
    meeting_password: Optional[str] = Field(None, max_length=255)
    interviewers: List[Interviewer] = Field(default_factory=list)
    preparation_notes: Optional[str] = None
    resume_version_id: Optional[UUID] = None
    reminder_enabled: bool = True
    reminder_timings: List[float] = Field(default=[24.0, 2.0, 0.5])

    @field_validator('scheduled_date')
    @classmethod
    def validate_scheduled_date(cls, v: datetime) -> datetime:
        """Ensure interview is scheduled in the future."""
        if v <= datetime.now():
            raise ValueError('Interview must be scheduled in the future')
        return v


class InterviewUpdate(BaseModel):
    """Request model for updating an interview."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    interview_type: Optional[str] = Field(None, pattern="^(screening|technical|behavioral|panel|onsite|final)$")
    status: Optional[str] = Field(None, pattern="^(scheduled|confirmed|completed|cancelled|rescheduled)$")
    scheduled_date: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=15, le=480)
    timezone: Optional[str] = Field(None, max_length=100)
    location_type: Optional[str] = Field(None, pattern="^(remote|in_person|phone|video)$")
    location_url: Optional[str] = None
    location_address: Optional[str] = None
    meeting_platform: Optional[str] = Field(None, max_length=100)
    meeting_id: Optional[str] = Field(None, max_length=255)
    meeting_password: Optional[str] = Field(None, max_length=255)
    interviewers: Optional[List[Interviewer]] = None
    preparation_notes: Optional[str] = None
    feedback: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    next_steps: Optional[str] = None
    reminder_enabled: Optional[bool] = None
    reminder_timings: Optional[List[float]] = None


class InterviewResponse(BaseModel):
    """Response model for interview data."""
    id: UUID
    application_id: UUID
    user_id: UUID
    title: str
    description: Optional[str]
    interview_type: str
    status: str
    scheduled_date: datetime
    duration_minutes: int
    timezone: str
    location_type: str
    location_url: Optional[str]
    location_address: Optional[str]
    meeting_platform: Optional[str]
    meeting_id: Optional[str]
    meeting_password: Optional[str]
    interviewers: List[Interviewer]
    preparation_notes: Optional[str]
    resume_version_id: Optional[UUID]
    feedback: Optional[str]
    rating: Optional[int]
    next_steps: Optional[str]
    reminder_enabled: bool
    reminder_timings: List[float]
    last_reminder_sent_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    # Additional fields from joins
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    resume_title: Optional[str] = None


class InterviewListResponse(BaseModel):
    """Response model for interview list."""
    interviews: List[InterviewResponse]
    total: int
    page: int
    page_size: int


class InterviewCalendarEvent(BaseModel):
    """Simplified interview data for calendar display."""
    id: UUID
    title: str
    interview_type: str
    status: str
    start: datetime
    end: datetime
    location_type: str
    company_name: Optional[str] = None
    job_title: Optional[str] = None


class InterviewCalendarResponse(BaseModel):
    """Response model for calendar view."""
    events: List[InterviewCalendarEvent]
    month: int
    year: int


class InterviewFeedback(BaseModel):
    """Request model for submitting interview feedback."""
    feedback: str = Field(..., min_length=1, max_length=5000)
    rating: Optional[int] = Field(None, ge=1, le=5)
    next_steps: Optional[str] = Field(None, max_length=1000)


class InterviewStats(BaseModel):
    """Interview statistics for user dashboard."""
    total_interviews: int
    upcoming_interviews: int
    completed_interviews: int
    cancelled_interviews: int
    average_rating: Optional[float]
    interviews_by_type: dict[str, int]
    interviews_this_month: int
    next_interview: Optional[InterviewResponse]