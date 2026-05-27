"""
Interview router with scheduling and calendar integration.
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.interview import (
    InterviewCreate,
    InterviewUpdate,
    InterviewResponse,
    InterviewListResponse,
    InterviewCalendarEvent,
    InterviewCalendarResponse,
    InterviewFeedback,
    InterviewStats,
)
from api.models.auth import User
from api.database import get_db
from api.dependencies import get_current_user
from app.models import (
    Application,
    Interview,
    InterviewReminder,
    Resume,
    JD,
)
from api.logger import logger

router = APIRouter(prefix="/interviews", tags=["interviews"])


@router.post("", response_model=InterviewResponse, status_code=201)
async def create_interview(
    interview_data: InterviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new interview schedule.

    Validates that the application belongs to the user and creates
    the interview with reminder schedules.
    """
    try:
        # Verify application ownership
        result = await db.execute(
            select(Application).where(
                and_(
                    Application.id == interview_data.application_id,
                    Application.user_id == current_user.id,
                )
            )
        )
        application = result.scalar_one_or_none()

        if not application:
            raise HTTPException(status_code=404, detail="Application not found")

        # Create interview
        interview = Interview(
            user_id=current_user.id,
            application_id=interview_data.application_id,
            title=interview_data.title,
            description=interview_data.description,
            interview_type=interview_data.interview_type,
            scheduled_date=interview_data.scheduled_date,
            duration_minutes=interview_data.duration_minutes,
            timezone=interview_data.timezone,
            location_type=interview_data.location_type,
            location_url=interview_data.location_url,
            location_address=interview_data.location_address,
            meeting_platform=interview_data.meeting_platform,
            meeting_id=interview_data.meeting_id,
            meeting_password=interview_data.meeting_password,
            interviewers=[
                interviewer.model_dump() for interviewer in interview_data.interviewers
            ],
            preparation_notes=interview_data.preparation_notes,
            resume_version_id=interview_data.resume_version_id,
            reminder_enabled=interview_data.reminder_enabled,
            reminder_timings=interview_data.reminder_timings,
        )

        db.add(interview)
        await db.flush()

        # Create reminder schedules if enabled
        if interview_data.reminder_enabled:
            for timing in interview_data.reminder_timings:
                reminder_time = interview_data.scheduled_date - timedelta(hours=timing)
                reminder = InterviewReminder(
                    interview_id=interview.id,
                    user_id=current_user.id,
                    reminder_timing=timing,
                    scheduled_for=reminder_time,
                )
                db.add(reminder)

        await db.commit()

        logger.info(
            "interview_created",
            user_id=str(current_user.id),
            interview_id=str(interview.id),
            application_id=str(interview_data.application_id),
        )

        return await _get_interview_response(db, interview.id, current_user.id)

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(
            "create_interview_failed", user_id=str(current_user.id), error=str(e)
        )
        raise HTTPException(status_code=500, detail="Failed to create interview")


@router.get("", response_model=InterviewListResponse)
async def list_interviews(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(
        None, pattern="^(scheduled|confirmed|completed|cancelled|rescheduled)$"
    ),
    interview_type: Optional[str] = Query(
        None, pattern="^(screening|technical|behavioral|panel|onsite|final)$"
    ),
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List user's interviews with filtering and pagination.

    Supports filtering by status, type, and date range.
    """
    try:
        # Build query conditions
        conditions = [Interview.user_id == current_user.id]

        if status:
            conditions.append(Interview.status == status)
        if interview_type:
            conditions.append(Interview.interview_type == interview_type)
        if from_date:
            conditions.append(Interview.scheduled_date >= from_date)
        if to_date:
            conditions.append(Interview.scheduled_date <= to_date)

        # Get total count
        count_result = await db.execute(
            select(func.count()).select_from(Interview).where(and_(*conditions))
        )
        total = count_result.scalar()

        # Get interviews with pagination
        result = await db.execute(
            select(Interview)
            .where(and_(*conditions))
            .order_by(Interview.scheduled_date.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        interviews = result.scalars().all()

        # Build response with additional data
        interview_responses = []
        for interview in interviews:
            response = await _get_interview_response(db, interview.id, current_user.id)
            interview_responses.append(response)

        return InterviewListResponse(
            interviews=interview_responses,
            total=total,
            page=page,
            page_size=page_size,
        )

    except Exception as e:
        logger.error(
            "list_interviews_failed", user_id=str(current_user.id), error=str(e)
        )
        raise HTTPException(status_code=500, detail="Failed to list interviews")


@router.get("/calendar", response_model=InterviewCalendarResponse)
async def get_calendar_events(
    year: int = Query(..., ge=2020, le=2030),
    month: int = Query(..., ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get interview events for calendar view.

    Returns all interviews scheduled within the specified month.
    """
    try:
        # Calculate date range for the month
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1) - timedelta(seconds=1)
        else:
            end_date = datetime(year, month + 1, 1) - timedelta(seconds=1)

        # Get interviews for the month
        result = await db.execute(
            select(
                Interview,
                JD.company_name,
                JD.job_title,
            )
            .join(Application, Application.id == Interview.application_id)
            .join(JD, JD.id == Application.jd_id)
            .where(
                and_(
                    Interview.user_id == current_user.id,
                    Interview.scheduled_date >= start_date,
                    Interview.scheduled_date <= end_date,
                    Interview.status.in_(["scheduled", "confirmed", "rescheduled"]),
                )
            )
            .order_by(Interview.scheduled_date)
        )

        interviews_data = result.all()

        # Build calendar events
        events = []
        for interview, company_name, job_title in interviews_data:
            end_time = interview.scheduled_date + timedelta(
                minutes=interview.duration_minutes
            )
            event = InterviewCalendarEvent(
                id=interview.id,
                title=interview.title,
                interview_type=interview.interview_type,
                status=interview.status,
                start=interview.scheduled_date,
                end=end_time,
                location_type=interview.location_type,
                company_name=company_name,
                job_title=job_title,
            )
            events.append(event)

        return InterviewCalendarResponse(
            events=events,
            month=month,
            year=year,
        )

    except Exception as e:
        logger.error("get_calendar_failed", user_id=str(current_user.id), error=str(e))
        raise HTTPException(status_code=500, detail="Failed to load calendar events")


@router.get("/stats", response_model=InterviewStats)
async def get_interview_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get interview statistics for the user dashboard.

    Includes totals, breakdowns by type, and upcoming interviews.
    """
    try:
        # Get total counts by status
        status_counts = await db.execute(
            select(
                Interview.status,
                func.count(Interview.id),
            )
            .where(Interview.user_id == current_user.id)
            .group_by(Interview.status)
        )
        status_data = {row[0]: row[1] for row in status_counts.all()}

        # Get counts by type
        type_counts = await db.execute(
            select(
                Interview.interview_type,
                func.count(Interview.id),
            )
            .where(Interview.user_id == current_user.id)
            .group_by(Interview.interview_type)
        )
        interviews_by_type = {row[0]: row[1] for row in type_counts.all()}

        # Get average rating
        rating_result = await db.execute(
            select(func.avg(Interview.rating)).where(
                and_(
                    Interview.user_id == current_user.id,
                    Interview.rating.isnot(None),
                )
            )
        )
        average_rating = rating_result.scalar()

        # Get interviews this month
        now = datetime.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_interviews = await db.execute(
            select(func.count(Interview.id)).where(
                and_(
                    Interview.user_id == current_user.id,
                    Interview.scheduled_date >= month_start,
                )
            )
        )
        interviews_this_month = month_interviews.scalar() or 0

        # Get next upcoming interview
        next_interview_result = await db.execute(
            select(Interview)
            .where(
                and_(
                    Interview.user_id == current_user.id,
                    Interview.scheduled_date > datetime.now(),
                    Interview.status.in_(["scheduled", "confirmed"]),
                )
            )
            .order_by(Interview.scheduled_date.asc())
            .limit(1)
        )
        next_interview = next_interview_result.scalar_one_or_none()

        next_interview_response = None
        if next_interview:
            next_interview_response = await _get_interview_response(
                db, next_interview.id, current_user.id
            )

        return InterviewStats(
            total_interviews=status_data.get("scheduled", 0)
            + status_data.get("confirmed", 0)
            + status_data.get("completed", 0)
            + status_data.get("cancelled", 0)
            + status_data.get("rescheduled", 0),
            upcoming_interviews=status_data.get("scheduled", 0)
            + status_data.get("confirmed", 0),
            completed_interviews=status_data.get("completed", 0),
            cancelled_interviews=status_data.get("cancelled", 0),
            average_rating=average_rating,
            interviews_by_type=interviews_by_type,
            interviews_this_month=interviews_this_month,
            next_interview=next_interview_response,
        )

    except Exception as e:
        logger.error(
            "get_interview_stats_failed", user_id=str(current_user.id), error=str(e)
        )
        raise HTTPException(
            status_code=500, detail="Failed to load interview statistics"
        )


@router.get("/{interview_id}", response_model=InterviewResponse)
async def get_interview(
    interview_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed information about a specific interview.
    """
    try:
        # Verify ownership
        result = await db.execute(
            select(Interview).where(
                and_(
                    Interview.id == interview_id,
                    Interview.user_id == current_user.id,
                )
            )
        )
        interview = result.scalar_one_or_none()

        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")

        return await _get_interview_response(db, interview_id, current_user.id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "get_interview_failed",
            user_id=str(current_user.id),
            interview_id=str(interview_id),
            error=str(e),
        )
        raise HTTPException(status_code=500, detail="Failed to load interview")


@router.put("/{interview_id}", response_model=InterviewResponse)
async def update_interview(
    interview_id: UUID,
    interview_data: InterviewUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update interview information.

    Handles rescheduling and status changes.
    """
    try:
        # Get interview and verify ownership
        result = await db.execute(
            select(Interview).where(
                and_(
                    Interview.id == interview_id,
                    Interview.user_id == current_user.id,
                )
            )
        )
        interview = result.scalar_one_or_none()

        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")

        # Update fields
        update_data = interview_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(interview, field, value)

        # Handle reminder rescheduling if date changed
        if "scheduled_date" in update_data and interview.reminder_enabled:
            # Delete existing reminders
            await db.execute(
                select(InterviewReminder).where(
                    InterviewReminder.interview_id == interview_id
                )
            )
            # Create new reminders
            for timing in interview.reminder_timings:
                reminder_time = interview.scheduled_date - timedelta(hours=timing)
                reminder = InterviewReminder(
                    interview_id=interview.id,
                    user_id=current_user.id,
                    reminder_timing=timing,
                    scheduled_for=reminder_time,
                )
                db.add(reminder)

        await db.commit()

        logger.info(
            "interview_updated",
            user_id=str(current_user.id),
            interview_id=str(interview_id),
            updated_fields=list(update_data.keys()),
        )

        return await _get_interview_response(db, interview_id, current_user.id)

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(
            "update_interview_failed",
            user_id=str(current_user.id),
            interview_id=str(interview_id),
            error=str(e),
        )
        raise HTTPException(status_code=500, detail="Failed to update interview")


@router.delete("/{interview_id}", status_code=204)
async def delete_interview(
    interview_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete an interview and all associated data.

    This action cannot be undone.
    """
    try:
        # Verify ownership
        result = await db.execute(
            select(Interview).where(
                and_(
                    Interview.id == interview_id,
                    Interview.user_id == current_user.id,
                )
            )
        )
        interview = result.scalar_one_or_none()

        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")

        # Delete interview (cascade will handle reminders and events)
        await db.delete(interview)
        await db.commit()

        logger.info(
            "interview_deleted",
            user_id=str(current_user.id),
            interview_id=str(interview_id),
        )

        return None

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(
            "delete_interview_failed",
            user_id=str(current_user.id),
            interview_id=str(interview_id),
            error=str(e),
        )
        raise HTTPException(status_code=500, detail="Failed to delete interview")


@router.post("/{interview_id}/feedback", response_model=InterviewResponse)
async def submit_interview_feedback(
    interview_id: UUID,
    feedback_data: InterviewFeedback,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit feedback after an interview completion.

    Stores feedback, rating, and next steps.
    """
    try:
        # Get interview and verify ownership
        result = await db.execute(
            select(Interview).where(
                and_(
                    Interview.id == interview_id,
                    Interview.user_id == current_user.id,
                )
            )
        )
        interview = result.scalar_one_or_none()

        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")

        # Update feedback fields
        interview.feedback = feedback_data.feedback
        interview.rating = feedback_data.rating
        interview.next_steps = feedback_data.next_steps
        interview.status = "completed"

        await db.commit()

        logger.info(
            "interview_feedback_submitted",
            user_id=str(current_user.id),
            interview_id=str(interview_id),
            rating=feedback_data.rating,
        )

        return await _get_interview_response(db, interview_id, current_user.id)

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(
            "submit_feedback_failed",
            user_id=str(current_user.id),
            interview_id=str(interview_id),
            error=str(e),
        )
        raise HTTPException(status_code=500, detail="Failed to submit feedback")


async def _get_interview_response(
    db: AsyncSession, interview_id: UUID, user_id: UUID
) -> InterviewResponse:
    """
    Helper function to build complete interview response with related data.
    """
    # Get interview with application and job description data
    result = await db.execute(
        select(
            Interview,
            JD.company_name,
            JD.job_title,
            Resume.title,
        )
        .join(Application, Application.id == Interview.application_id)
        .join(JD, JD.id == Application.jd_id)
        .outerjoin(Resume, Resume.id == Application.resume_id)
        .where(Interview.id == interview_id)
    )

    interview_data = result.first()
    if not interview_data:
        raise HTTPException(status_code=404, detail="Interview not found")

    interview, company_name, job_title, resume_title = interview_data

    from api.models.interview import Interviewer

    return InterviewResponse(
        id=interview.id,
        application_id=interview.application_id,
        user_id=interview.user_id,
        title=interview.title,
        description=interview.description,
        interview_type=interview.interview_type,
        status=interview.status,
        scheduled_date=interview.scheduled_date,
        duration_minutes=interview.duration_minutes,
        timezone=interview.timezone,
        location_type=interview.location_type,
        location_url=interview.location_url,
        location_address=interview.location_address,
        meeting_platform=interview.meeting_platform,
        meeting_id=interview.meeting_id,
        meeting_password=interview.meeting_password,
        interviewers=(
            [Interviewer(**i) for i in interview.interviewers]
            if interview.interviewers
            else []
        ),
        preparation_notes=interview.preparation_notes,
        resume_version_id=interview.resume_version_id,
        feedback=interview.feedback,
        rating=interview.rating,
        next_steps=interview.next_steps,
        reminder_enabled=interview.reminder_enabled,
        reminder_timings=interview.reminder_timings or [],
        last_reminder_sent_at=interview.last_reminder_sent_at,
        created_at=interview.created_at,
        updated_at=interview.updated_at,
        job_title=job_title,
        company_name=company_name,
        resume_title=resume_title,
    )
