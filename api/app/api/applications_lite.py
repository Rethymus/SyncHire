"""
Applications API - Lightweight Version

Local-first application tracking without authentication.
"""

from uuid import uuid4, UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database_lite import get_db
from app.models.application_lite import Application, ApplicationStatus
from app.models.resume_lite import Resume
from app.models.jd_lite import JobDescription
from app.schemas.schemas_lite import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
)
from app.services.ai_service_lite import ai_service
from app.core.logger import logger, LogCategory

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post(
    "", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED
)
async def create_application(
    application: ApplicationCreate, db: AsyncSession = Depends(get_db)
):
    """
    Create a new application.

    Args:
        application: Application data
        db: Database session

    Returns:
        Created application
    """
    try:
        # Validate resume exists
        resume_result = await db.execute(
            select(Resume).where(Resume.id == application.resume_id)
        )
        if not resume_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found"
            )

        # Validate JD exists
        jd_result = await db.execute(
            select(JobDescription).where(JobDescription.id == application.jd_id)
        )
        if not jd_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job description not found",
            )

        # Create application record
        application_id = uuid4()
        db_application = Application(
            id=application_id,
            resume_id=UUID(application.resume_id),
            jd_id=UUID(application.jd_id),
            status=application.status or ApplicationStatus.SAVED,
            notes=application.notes,
        )

        db.add(db_application)
        await db.commit()
        await db.refresh(db_application)

        logger.info(LogCategory.DATA, f"Created application: {application_id}")

        return ApplicationResponse(
            id=str(db_application.id),
            resume_id=str(db_application.resume_id),
            jd_id=str(db_application.jd_id),
            status=db_application.status.value,
            notes=db_application.notes,
            match_score=db_application.match_score,
            applied_date=db_application.applied_date,
            last_updated=db_application.last_updated,
            created_at=db_application.created_at,
            updated_at=db_application.updated_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA, f"Failed to create application: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create application",
        )


@router.get("", response_model=List[ApplicationResponse])
async def list_applications(
    skip: int = 0,
    limit: int = 100,
    status_filter: str = None,
    db: AsyncSession = Depends(get_db),
):
    """
    List all applications.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        status_filter: Optional status filter
        db: Database session

    Returns:
        List of applications
    """
    try:
        query = select(Application)

        if status_filter:
            try:
                query = query.where(
                    Application.status == ApplicationStatus(status_filter)
                )
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {status_filter}",
                )

        query = query.offset(skip).limit(limit).order_by(Application.updated_at.desc())

        result = await db.execute(query)
        applications = result.scalars().all()

        return [
            ApplicationResponse(
                id=str(app.id),
                resume_id=str(app.resume_id),
                jd_id=str(app.jd_id),
                status=app.status.value,
                notes=app.notes,
                match_score=app.match_score,
                applied_date=app.applied_date,
                last_updated=app.last_updated,
                created_at=app.created_at,
                updated_at=app.updated_at,
            )
            for app in applications
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA, f"Failed to list applications: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list applications",
        )


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(application_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get a specific application.

    Args:
        application_id: Application ID
        db: Database session

    Returns:
        Application details
    """
    try:
        result = await db.execute(
            select(Application)
            .options(
                selectinload(Application.resume),
                selectinload(Application.job_description),
            )
            .where(Application.id == application_id)
        )
        application = result.scalar_one_or_none()

        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
            )

        return ApplicationResponse(
            id=str(application.id),
            resume_id=str(application.resume_id),
            jd_id=str(application.jd_id),
            status=application.status.value,
            notes=application.notes,
            match_score=application.match_score,
            applied_date=application.applied_date,
            last_updated=application.last_updated,
            created_at=application.created_at,
            updated_at=application.updated_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA,
            f"Failed to get application {application_id}: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get application",
        )


@router.put("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: str,
    application: ApplicationUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Update an application.

    Args:
        application_id: Application ID
        application: Updated application data
        db: Database session

    Returns:
        Updated application
    """
    try:
        result = await db.execute(
            select(Application).where(Application.id == application_id)
        )
        db_application = result.scalar_one_or_none()

        if not db_application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
            )

        # Update fields
        if application.status is not None:
            try:
                db_application.status = ApplicationStatus(application.status)
                # Update last_updated when status changes
                from datetime import datetime

                db_application.last_updated = datetime.utcnow()
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {application.status}",
                )

        if application.notes is not None:
            db_application.notes = application.notes

        if application.match_score is not None:
            db_application.match_score = application.match_score

        if application.applied_date is not None:
            db_application.applied_date = application.applied_date

        await db.commit()
        await db.refresh(db_application)

        logger.info(LogCategory.DATA, f"Updated application: {application_id}")

        return ApplicationResponse(
            id=str(db_application.id),
            resume_id=str(db_application.resume_id),
            jd_id=str(db_application.jd_id),
            status=db_application.status.value,
            notes=db_application.notes,
            match_score=db_application.match_score,
            applied_date=db_application.applied_date,
            last_updated=db_application.last_updated,
            created_at=db_application.created_at,
            updated_at=db_application.updated_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA,
            f"Failed to update application {application_id}: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update application",
        )


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(application_id: str, db: AsyncSession = Depends(get_db)):
    """
    Delete an application.

    Args:
        application_id: Application ID
        db: Database session

    Returns:
        No content on success
    """
    try:
        result = await db.execute(
            select(Application).where(Application.id == application_id)
        )
        application = result.scalar_one_or_none()

        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
            )

        await db.delete(application)
        await db.commit()

        logger.info(LogCategory.DATA, f"Deleted application: {application_id}")

        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA,
            f"Failed to delete application {application_id}: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete application",
        )


@router.post("/{application_id}/match", response_model=ApplicationResponse)
async def calculate_match(application_id: str, db: AsyncSession = Depends(get_db)):
    """
    Calculate match score for application using AI.

    Args:
        application_id: Application ID
        db: Database session

    Returns:
        Updated application with match score
    """
    try:
        result = await db.execute(
            select(Application)
            .options(
                selectinload(Application.resume),
                selectinload(Application.job_description),
            )
            .where(Application.id == application_id)
        )
        application = result.scalar_one_or_none()

        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
            )

        # Calculate match score
        match_score = await ai_service.calculate_match_score(
            application.resume.content, application.job_description.description
        )

        # Update application
        application.match_score = match_score
        await db.commit()
        await db.refresh(application)

        logger.info(
            LogCategory.AI,
            f"Calculated match score for application {application_id}: {match_score}",
        )

        return ApplicationResponse(
            id=str(application.id),
            resume_id=str(application.resume_id),
            jd_id=str(application.jd_id),
            status=application.status.value,
            notes=application.notes,
            match_score=application.match_score,
            applied_date=application.applied_date,
            last_updated=application.last_updated,
            created_at=application.created_at,
            updated_at=application.updated_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.AI,
            f"Failed to calculate match for application {application_id}: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate match score",
        )


@router.post("/batch-update")
async def batch_update_applications(
    application_ids: List[str],
    status: str = None,
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Batch update applications.

    Args:
        application_ids: List of application IDs to update
        status: New status (optional)
        background_tasks: FastAPI background tasks
        db: Database session

    Returns:
        Batch update results
    """
    try:
        updated = 0
        failed = 0
        errors = []

        for app_id in application_ids:
            try:
                result = await db.execute(
                    select(Application).where(Application.id == app_id)
                )
                application = result.scalar_one_or_none()

                if application and status:
                    application.status = ApplicationStatus(status)
                    from datetime import datetime

                    application.last_updated = datetime.utcnow()
                    updated += 1

            except Exception as e:
                failed += 1
                errors.append(f"{app_id}: {str(e)}")

        await db.commit()

        logger.info(
            LogCategory.DATA,
            f"Batch updated applications: {updated} updated, {failed} failed",
        )

        return {"updated": updated, "failed": failed, "errors": errors}

    except Exception as e:
        logger.error(
            LogCategory.DATA,
            f"Failed to batch update applications: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to batch update applications",
        )
