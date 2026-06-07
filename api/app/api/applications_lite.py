"""
Applications API - Lightweight Version

Local-first application tracking without authentication.
"""

from uuid import uuid4
from typing import List
from fastapi import APIRouter, Body, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.local_first_helpers import dump_json, load_json
from app.api.utils_lite import parse_uuid
from app.core.database_lite import get_db
from app.models.application_lite import Application, ApplicationStatus
from app.models.application_material_lite import ApplicationMaterial
from app.models.resume_variant_lite import ResumeVariant
from app.models.resume_lite import Resume
from app.models.jd_lite import JobDescription
from app.schemas.schemas_lite import (
    ApplicationBatchUpdateRequest,
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
)
from app.services.ai_service_lite import ai_service
from app.core.logger import logger, LogCategory

router = APIRouter(prefix="/applications", tags=["applications"])


def _application_response(application: Application) -> ApplicationResponse:
    return ApplicationResponse(
        id=str(application.id),
        resume_id=str(application.resume_id),
        jd_id=str(application.jd_id),
        status=application.status.value,
        resume_variant_id=(
            str(application.resume_variant_id)
            if application.resume_variant_id
            else None
        ),
        materials_id=(
            str(application.materials_id) if application.materials_id else None
        ),
        platform=application.platform,
        source_url=application.source_url,
        notes=application.notes,
        match_score=application.match_score,
        applied_date=application.applied_date,
        submitted_manually_at=application.submitted_manually_at,
        next_action=application.next_action,
        next_action_at=application.next_action_at,
        contact_name=application.contact_name,
        contact_channel=application.contact_channel,
        timeline=load_json(application.timeline_json),
        last_updated=application.last_updated,
        created_at=application.created_at,
        updated_at=application.updated_at,
    )


async def _ensure_materials_ready_allowed(
    db: AsyncSession,
    application: Application,
    materials_id=None,
) -> None:
    material_id = materials_id or application.materials_id
    if material_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="materials_ready requires linked application materials",
        )

    result = await db.execute(
        select(ApplicationMaterial).where(ApplicationMaterial.id == material_id)
    )
    material = result.scalar_one_or_none()
    if material is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application materials not found",
        )
    if material.review_status not in {"reviewed", "ready"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="materials_ready requires reviewed or ready materials",
        )


async def _validate_optional_application_links(
    db: AsyncSession,
    resume_variant_id=None,
    materials_id=None,
) -> None:
    if resume_variant_id is not None:
        result = await db.execute(
            select(ResumeVariant).where(ResumeVariant.id == resume_variant_id)
        )
        if result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume variant not found",
            )
    if materials_id is not None:
        result = await db.execute(
            select(ApplicationMaterial).where(ApplicationMaterial.id == materials_id)
        )
        if result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application materials not found",
            )


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
        resume_id = parse_uuid(application.resume_id, "resume_id")
        jd_id = parse_uuid(application.jd_id, "jd_id")
        resume_variant_id = (
            parse_uuid(application.resume_variant_id, "resume_variant_id")
            if application.resume_variant_id
            else None
        )
        materials_id = (
            parse_uuid(application.materials_id, "materials_id")
            if application.materials_id
            else None
        )

        # Validate resume exists
        resume_result = await db.execute(select(Resume).where(Resume.id == resume_id))
        if not resume_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found"
            )

        # Validate JD exists
        jd_result = await db.execute(
            select(JobDescription).where(JobDescription.id == jd_id)
        )
        if not jd_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job description not found",
            )

        await _validate_optional_application_links(
            db, resume_variant_id=resume_variant_id, materials_id=materials_id
        )

        # Create application record
        application_id = uuid4()
        db_application = Application(
            id=application_id,
            resume_id=resume_id,
            jd_id=jd_id,
            resume_variant_id=resume_variant_id,
            materials_id=materials_id,
            status=ApplicationStatus(
                (application.status or ApplicationStatus.SAVED).value
            ),
            platform=application.platform,
            source_url=application.source_url,
            notes=application.notes,
        )

        if db_application.status == ApplicationStatus.MATERIALS_READY:
            await _ensure_materials_ready_allowed(db, db_application, materials_id)

        db.add(db_application)
        await db.commit()
        await db.refresh(db_application)

        logger.info(LogCategory.DATA, f"Created application: {application_id}")

        return _application_response(db_application)

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

        return [_application_response(app) for app in applications]

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
        application_uuid = parse_uuid(application_id, "application_id")
        result = await db.execute(
            select(Application)
            .options(
                selectinload(Application.resume),
                selectinload(Application.job_description),
            )
            .where(Application.id == application_uuid)
        )
        application = result.scalar_one_or_none()

        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
            )

        return _application_response(application)

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
        application_uuid = parse_uuid(application_id, "application_id")
        result = await db.execute(
            select(Application).where(Application.id == application_uuid)
        )
        db_application = result.scalar_one_or_none()

        if not db_application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
            )

        # Update fields
        if application.status is not None:
            try:
                next_status = ApplicationStatus(application.status)
                if next_status == ApplicationStatus.MATERIALS_READY:
                    pending_materials_id = (
                        parse_uuid(application.materials_id, "materials_id")
                        if application.materials_id
                        else db_application.materials_id
                    )
                    await _ensure_materials_ready_allowed(
                        db, db_application, pending_materials_id
                    )
                db_application.status = next_status
                # Update last_updated when status changes
                from datetime import datetime

                db_application.last_updated = datetime.utcnow()
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {application.status}",
                )

        if application.resume_variant_id is not None:
            resume_variant_id = parse_uuid(
                application.resume_variant_id, "resume_variant_id"
            )
            await _validate_optional_application_links(
                db, resume_variant_id=resume_variant_id
            )
            db_application.resume_variant_id = resume_variant_id

        if application.materials_id is not None:
            materials_id = parse_uuid(application.materials_id, "materials_id")
            await _validate_optional_application_links(db, materials_id=materials_id)
            db_application.materials_id = materials_id

        if application.platform is not None:
            db_application.platform = application.platform

        if application.source_url is not None:
            db_application.source_url = application.source_url

        if application.notes is not None:
            db_application.notes = application.notes

        if application.match_score is not None:
            db_application.match_score = application.match_score

        if application.applied_date is not None:
            db_application.applied_date = application.applied_date

        if application.submitted_manually_at is not None:
            db_application.submitted_manually_at = application.submitted_manually_at

        if application.next_action is not None:
            db_application.next_action = application.next_action

        if application.next_action_at is not None:
            db_application.next_action_at = application.next_action_at

        if application.contact_name is not None:
            db_application.contact_name = application.contact_name

        if application.contact_channel is not None:
            db_application.contact_channel = application.contact_channel

        if application.timeline is not None:
            db_application.timeline_json = dump_json(application.timeline)

        await db.commit()
        await db.refresh(db_application)

        logger.info(LogCategory.DATA, f"Updated application: {application_id}")

        return _application_response(db_application)

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
        application_uuid = parse_uuid(application_id, "application_id")
        result = await db.execute(
            select(Application).where(Application.id == application_uuid)
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
        application_uuid = parse_uuid(application_id, "application_id")
        result = await db.execute(
            select(Application)
            .options(
                selectinload(Application.resume),
                selectinload(Application.job_description),
            )
            .where(Application.id == application_uuid)
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

        return _application_response(application)

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
    request: ApplicationBatchUpdateRequest = Body(...),
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Batch update applications.

    Args:
        request: Application IDs and optional new status
        background_tasks: FastAPI background tasks
        db: Database session

    Returns:
        Batch update results
    """
    try:
        updated = 0
        failed = 0
        errors = []

        for app_id in request.application_ids:
            try:
                app_uuid = parse_uuid(app_id, "application_id")
                result = await db.execute(
                    select(Application).where(Application.id == app_uuid)
                )
                application = result.scalar_one_or_none()

                if application and request.status:
                    next_status = ApplicationStatus(request.status.value)
                    if next_status == ApplicationStatus.MATERIALS_READY:
                        await _ensure_materials_ready_allowed(db, application)
                    application.status = next_status
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
