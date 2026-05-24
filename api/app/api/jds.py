import uuid
from typing import List
from fastapi import APIRouter, Depends, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.jd import (
    JDCreate,
    JDUpdate,
    JDResponse,
    JDParse,
    JDParseResponse,
    JDFileUploadResponse,
)
from app.services.jd_service import JDService
from app.services.file_parser import FileParserService

router = APIRouter(prefix="/jds", tags=["jds"])


@router.post("/parse", response_model=JDParseResponse)
async def parse_jd(
    jd_data: JDParse,
    current_user: User = Depends(get_current_user),
):
    parsed_data = await JDService.parse_jd(jd_data.content)
    return JDParseResponse(parsed_data=parsed_data)


@router.post(
    "/upload", response_model=JDFileUploadResponse, status_code=status.HTTP_201_CREATED
)
async def upload_jd_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload and parse a JD from PDF or DOCX file."""
    # Read file content
    file_content = await file.read()

    # Parse file to extract text
    content = await FileParserService.parse_file(file.filename, file_content)

    # Parse JD content
    parsed_data = await JDService.parse_jd(content)

    # Extract title and company from parsed data if available
    title = parsed_data.get("title", file.filename or "Uploaded Position")
    company = parsed_data.get("company")

    # Create JD in database
    jd = await JDService.create_jd(
        db,
        current_user.id,
        JDCreate(title=title, company=company, content=content),
    )

    return JDFileUploadResponse(
        id=jd.id,
        title=jd.title,
        company=jd.company,
        content=jd.content,
        parsed_data=parsed_data,
        created_at=jd.created_at,
        updated_at=jd.updated_at,
        message="JD file uploaded and parsed successfully",
    )


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


@router.put("/{jd_id}", response_model=JDResponse)
async def update_jd(
    jd_id: uuid.UUID,
    jd_data: JDUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await JDService.update_jd(db, jd_id, current_user.id, jd_data)


@router.delete("/{jd_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_jd(
    jd_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await JDService.delete_jd(db, jd_id, current_user.id)
    return None
