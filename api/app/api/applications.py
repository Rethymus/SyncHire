import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.core.logger import logger, LogCategory
from app.schemas.application import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
    ApplicationStatusUpdate,
    BulkDeleteRequest,
    BulkDeleteResponse,
)
from app.services.application_service import ApplicationService

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post(
    "/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED
)
async def create_application(
    app_data: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ApplicationService.create_application(db, current_user.id, app_data)


@router.get("/", response_model=List[ApplicationResponse])
async def list_applications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ApplicationService.get_applications(db, current_user.id)


@router.get("/{application_id}/match")
async def get_match_score(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ApplicationService.get_match_score(db, application_id, current_user.id)


@router.post("/{application_id}/optimize")
async def optimize_application_resume(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ApplicationService.optimize_resume(db, application_id, current_user.id)


@router.get("/{application_id}/interview-prep")
async def get_interview_prep(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ApplicationService.generate_interview_prep(
        db, application_id, current_user.id
    )


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ApplicationService.get_application(db, application_id, current_user.id)


@router.put("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: uuid.UUID,
    app_data: ApplicationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ApplicationService.update_application(
        db, application_id, current_user.id, app_data
    )


@router.patch("/{application_id}/status", response_model=ApplicationResponse)
async def update_application_status(
    application_id: uuid.UUID,
    status_update: ApplicationStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update application status with history tracking"""
    return await ApplicationService.update_application_status(
        db, application_id, current_user.id, status_update
    )


@router.get("/{application_id}/history", response_model=List[dict])
async def get_application_status_history(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get status change history for an application"""
    application = await ApplicationService.get_application(
        db, application_id, current_user.id
    )
    return application.status_history


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await ApplicationService.delete_application(db, application_id, current_user.id)
    return None


@router.post("/bulk-delete", response_model=BulkDeleteResponse)
async def bulk_delete_applications(
    request: BulkDeleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Bulk delete multiple applications

    Deletes multiple applications by IDs with partial failure support.
    Returns detailed information about successful and failed deletions.

    - **ids**: List of application IDs to delete (max 100 at once)
    - **success_count**: Number of successfully deleted applications
    - **failed_count**: Number of applications that failed to delete
    - **errors**: List of errors for failed deletions with ID and error message
    """
    logger.info(f"Bulk delete request for {len(request.ids)} applications by user {current_user.id}")
    return await ApplicationService.bulk_delete_applications(db, current_user.id, request.ids)
