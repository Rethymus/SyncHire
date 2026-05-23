import uuid
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.application import ApplicationCreate, ApplicationResponse
from app.services.application_service import ApplicationService

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
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
    return await ApplicationService.generate_interview_prep(db, application_id, current_user.id)
