import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.jd import JDCreate, JDResponse, JDParse, JDParseResponse
from app.services.jd_service import JDService

router = APIRouter(prefix="/jds", tags=["jds"])


@router.post("/parse", response_model=JDParseResponse)
async def parse_jd(
    jd_data: JDParse,
    current_user: User = Depends(get_current_user),
):
    parsed_data = await JDService.parse_jd(jd_data.content)
    return JDParseResponse(parsed_data=parsed_data)


@router.post("/", response_model=JDResponse, status_code=status.HTTP_201_CREATED)
async def create_jd(
    jd_data: JDCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await JDService.create_jd(db, current_user.id, jd_data)


@router.get("/", response_model=List[JDResponse])
async def list_jds(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await JDService.get_jds(db, current_user.id)


@router.get("/{jd_id}", response_model=JDResponse)
async def get_jd(
    jd_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await JDService.get_jd(db, jd_id, current_user.id)
