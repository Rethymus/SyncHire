import uuid
from typing import List
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.core.logger import logger
from app.schemas.application import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
    ApplicationStatusUpdate,
    BulkDeleteRequest,
    BulkDeleteResponse,
    BulkUpdateRequest,
    BulkStatusUpdateRequest,
    BulkNotesUpdateRequest,
    BulkUpdateResponse,
    BulkTagRequest,
    BulkTagResponse,
)
from app.services.application_service import ApplicationService
from pydantic import BaseModel


class PaginatedApplicationResponse(BaseModel):
    """Paginated response for application list."""

    items: List[ApplicationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


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


@router.get("/", response_model=PaginatedApplicationResponse)
async def list_applications(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List applications with pagination.

    Returns paginated list of applications with metadata for navigation.
    """
    applications, total = await ApplicationService.get_applications_paginated(
        db, current_user.id, page, page_size
    )

    total_pages = (total + page_size - 1) // page_size

    return PaginatedApplicationResponse(
        items=applications,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


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
    logger.info(
        f"Bulk delete request for {len(request.ids)} applications by user {current_user.id}"
    )
    return await ApplicationService.bulk_delete_applications(
        db, current_user.id, request.ids
    )


@router.post("/bulk-update", response_model=BulkUpdateResponse)
async def bulk_update_applications(
    request: BulkUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Bulk update multiple applications

    Updates multiple applications with different values per application.
    Supports partial failure handling.

    - **updates**: List of updates, each containing id and fields to update
    - **success_count**: Number of successfully updated applications
    - **failed_count**: Number of applications that failed to update
    - **errors**: List of errors for failed updates with ID and error message
    """
    logger.info(
        f"Bulk update request for {len(request.updates)} applications by user {current_user.id}"
    )
    return await ApplicationService.bulk_update_applications(
        db, current_user.id, request.updates
    )


@router.post("/bulk-status-update", response_model=BulkUpdateResponse)
async def bulk_update_application_status(
    request: BulkStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Bulk update application status

    Updates the status (and optionally notes) for multiple applications at once.
    Useful for moving multiple applications to the same stage.

    - **ids**: List of application IDs to update (max 100 at once)
    - **status**: New status to set for all applications
    - **notes**: Optional notes to add to all applications
    - **success_count**: Number of successfully updated applications
    - **failed_count**: Number of applications that failed to update
    - **errors**: List of errors for failed updates with ID and error message
    """
    logger.info(
        f"Bulk status update request for {len(request.ids)} applications "
        f"to status '{request.status}' by user {current_user.id}"
    )

    # Convert bulk status update to bulk update format
    updates = []
    for app_id in request.ids:
        update_data = {"id": str(app_id), "status": request.status}
        if request.notes:
            update_data["notes"] = request.notes
        updates.append(update_data)

    return await ApplicationService.bulk_update_applications(
        db, current_user.id, updates
    )


@router.post("/bulk-notes-update", response_model=BulkUpdateResponse)
async def bulk_update_application_notes(
    request: BulkNotesUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Bulk update application notes

    Updates notes for multiple applications at once.
    Can append to existing notes or replace them entirely.

    - **ids**: List of application IDs to update (max 100 at once)
    - **notes**: Notes content to set/add
    - **append**: If true, append to existing notes. If false, replace existing notes.
    - **success_count**: Number of successfully updated applications
    - **failed_count**: Number of applications that failed to update
    - **errors**: List of errors for failed updates with ID and error message
    """
    logger.info(
        f"Bulk notes update request for {len(request.ids)} applications "
        f"(append={request.append}) by user {current_user.id}"
    )

    # For append mode, we need to fetch current notes first
    if request.append:
        from sqlalchemy import select
        from app.models.application import Application

        result = await db.execute(
            select(Application.id, Application.notes).where(
                Application.id.in_(request.ids),
                Application.user_id == current_user.id,
            )
        )
        existing_notes = {row.id: row.notes for row in result.all()}

        updates = []
        for app_id in request.ids:
            current_notes = existing_notes.get(str(app_id))
            new_notes = (
                f"{current_notes}\n\n{request.notes}"
                if current_notes
                else request.notes
            )
            updates.append({"id": str(app_id), "notes": new_notes})
    else:
        # Replace mode - set the same notes for all
        updates = [{"id": str(app_id), "notes": request.notes} for app_id in request.ids]

    return await ApplicationService.bulk_update_applications(
        db, current_user.id, updates
    )


@router.post("/bulk-tag", response_model=BulkTagResponse)
async def bulk_tag_applications(
    request: BulkTagRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Bulk tag applications

    Add, remove, or replace tags on multiple applications at once.
    Supports partial failure handling.

    - **ids**: List of application IDs to update (max 100 at once)
    - **tags**: List of tags to add/remove/replace
    - **operation**: Operation type - 'add', 'remove', or 'replace'
      - add: Append tags to existing tags (no duplicates)
      - remove: Remove specified tags from existing tags
      - replace: Replace all existing tags with new tags
    - **success_count**: Number of successfully updated applications
    - **failed_count**: Number of applications that failed to update
    - **errors**: List of errors for failed updates with ID and error message
    """
    logger.info(
        f"Bulk {request.operation} tag request for {len(request.ids)} applications "
        f"with tags {request.tags} by user {current_user.id}"
    )

    return await ApplicationService.bulk_tag_applications(
        db, current_user.id, request
    )
