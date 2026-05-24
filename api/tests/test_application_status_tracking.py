"""
Application Status Tracking Tests

Test the status tracking workflow including:
- Status history creation
- Status validation
- History retrieval
- Notification generation
"""

import pytest
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.application import Application
from app.models.application_status_history import ApplicationStatusHistory
from app.models.user import User
from app.models.resume import Resume
from app.models.jd import JD
from app.services.application_service import ApplicationService
from app.schemas.application import ApplicationStatusUpdate


@pytest.mark.asyncio
async def test_status_change_creates_history_entry(
    db: AsyncSession, test_user: User, test_resume: Resume, test_jd: JD
):
    """Test that changing status creates a history entry"""
    # Create application
    app_data = {
        "resume_id": test_resume.id,
        "jd_id": test_jd.id,
    }
    application = await ApplicationService.create_application(
        db, test_user.id, app_data
    )

    # Update status
    status_update = ApplicationStatusUpdate(
        status="applied", notes="Applied through company website"
    )
    updated_app = await ApplicationService.update_application_status(
        db, application.id, test_user.id, status_update
    )

    # Check status was updated
    assert updated_app.status == "applied"

    # Check history entry was created
    result = await db.execute(
        select(ApplicationStatusHistory).where(
            ApplicationStatusHistory.application_id == application.id
        )
    )
    history_entries = list(result.scalars().all())

    assert len(history_entries) == 1
    history_entry = history_entries[0]
    assert history_entry.old_status == "pending"
    assert history_entry.new_status == "applied"
    assert history_entry.notes == "Applied through company website"
    assert history_entry.user_id == test_user.id


@pytest.mark.asyncio
async def test_invalid_status_rejected(
    db: AsyncSession, test_user: User, test_resume: Resume, test_jd: JD
):
    """Test that invalid status is rejected"""
    # Create application
    app_data = {
        "resume_id": test_resume.id,
        "jd_id": test_jd.id,
    }
    application = await ApplicationService.create_application(
        db, test_user.id, app_data
    )

    # Try to update with invalid status
    status_update = ApplicationStatusUpdate(status="invalid_status")

    with pytest.raises(Exception) as exc_info:
        await ApplicationService.update_application_status(
            db, application.id, test_user.id, status_update
        )

    assert "Invalid status" in str(exc_info.value)


@pytest.mark.asyncio
async def test_status_history_ordering(
    db: AsyncSession, test_user: User, test_resume: Resume, test_jd: JD
):
    """Test that status history is ordered by changed_at descending"""
    # Create application
    app_data = {
        "resume_id": test_resume.id,
        "jd_id": test_jd.id,
    }
    application = await ApplicationService.create_application(
        db, test_user.id, app_data
    )

    # Make multiple status changes
    statuses = ["optimized", "applied", "interview"]
    for status in statuses:
        status_update = ApplicationStatusUpdate(status=status)
        await ApplicationService.update_application_status(
            db, application.id, test_user.id, status_update
        )

    # Get history
    result = await db.execute(
        select(ApplicationStatusHistory)
        .where(ApplicationStatusHistory.application_id == application.id)
        .order_by(ApplicationStatusHistory.changed_at.desc())
    )
    history_entries = list(result.scalars().all())

    # Check ordering (most recent first)
    assert len(history_entries) == 3
    assert history_entries[0].new_status == "interview"
    assert history_entries[1].new_status == "applied"
    assert history_entries[2].new_status == "optimized"


@pytest.mark.asyncio
async def test_application_includes_history(
    db: AsyncSession, test_user: User, test_resume: Resume, test_jd: JD
):
    """Test that get_application includes status history"""
    # Create application
    app_data = {
        "resume_id": test_resume.id,
        "jd_id": test_jd.id,
    }
    application = await ApplicationService.create_application(
        db, test_user.id, app_data
    )

    # Update status
    status_update = ApplicationStatusUpdate(
        status="applied", notes="Applied through LinkedIn"
    )
    await ApplicationService.update_application_status(
        db, application.id, test_user.id, status_update
    )

    # Get application
    fetched_app = await ApplicationService.get_application(
        db, application.id, test_user.id
    )

    # Check history is included
    assert hasattr(fetched_app, "status_history")
    assert len(fetched_app.status_history) == 1
    assert fetched_app.status_history[0].new_status == "applied"
    assert fetched_app.status_history[0].notes == "Applied through LinkedIn"


@pytest.mark.asyncio
async def test_status_history_cascade_delete(
    db: AsyncSession, test_user: User, test_resume: Resume, test_jd: JD
):
    """Test that deleting application cascades to history"""
    # Create application
    app_data = {
        "resume_id": test_resume.id,
        "jd_id": test_jd.id,
    }
    application = await ApplicationService.create_application(
        db, test_user.id, app_data
    )

    # Update status
    status_update = ApplicationStatusUpdate(status="applied")
    await ApplicationService.update_application_status(
        db, application.id, test_user.id, status_update
    )

    # Delete application
    await ApplicationService.delete_application(db, application.id, test_user.id)

    # Check history is also deleted
    result = await db.execute(
        select(ApplicationStatusHistory).where(
            ApplicationStatusHistory.application_id == application.id
        )
    )
    history_entries = list(result.scalars().all())

    assert len(history_entries) == 0


@pytest.mark.asyncio
async def test_status_workflow_progression(
    db: AsyncSession, test_user: User, test_resume: Resume, test_jd: JD
):
    """Test typical application status workflow"""
    # Create application
    app_data = {
        "resume_id": test_resume.id,
        "jd_id": test_jd.id,
    }
    application = await ApplicationService.create_application(
        db, test_user.id, app_data
    )

    # Simulate typical workflow
    workflow = [
        ("optimized", "Resume optimized for the position"),
        ("applied", "Submitted application via company portal"),
        ("interview", "Phone screen scheduled"),
        ("interview", "Technical interview completed"),
        ("offer", "Received offer letter"),
    ]

    for status, notes in workflow:
        status_update = ApplicationStatusUpdate(status=status, notes=notes)
        await ApplicationService.update_application_status(
            db, application.id, test_user.id, status_update
        )

    # Verify final state
    final_app = await ApplicationService.get_application(
        db, application.id, test_user.id
    )
    assert final_app.status == "offer"
    assert len(final_app.status_history) == 5

    # Verify history progression
    assert final_app.status_history[0].notes == "Received offer letter"
    assert final_app.status_history[-1].notes == "Resume optimized for the position"


from sqlalchemy import select
