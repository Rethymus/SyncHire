"""
Resumes API - Lightweight Version

Local-first resume management without authentication.
"""

from pathlib import Path
from uuid import uuid4
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.utils_lite import parse_uuid
from app.core.database_lite import get_db
from app.models.resume_lite import Resume
from app.schemas.schemas_lite import ResumeUpdate, ResumeResponse
from app.services.ai_service_lite import ai_service
from app.services.file_storage_lite import file_storage
from app.core.logger import logger, LogCategory

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def create_resume(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new resume.

    Args:
        request: JSON or multipart form request with title/content/file
        db: Database session

    Returns:
        Created resume
    """
    try:
        title: Optional[str] = None
        content: Optional[str] = None
        file: Optional[UploadFile] = None

        content_type = request.headers.get("content-type", "")
        if "multipart/form-data" in content_type:
            form = await request.form()
            title = str(form.get("title") or "").strip() or None
            content_value = form.get("content")
            content = str(content_value) if content_value is not None else None
            form_file = form.get("file")
            if form_file is not None and hasattr(form_file, "filename"):
                file = form_file
        else:
            data = await request.json()
            resume_data = data.get("resume", data) if isinstance(data, dict) else {}
            title = str(resume_data.get("title") or "").strip() or None
            content_value = resume_data.get("content")
            content = str(content_value) if content_value is not None else None

        if not title and file and file.filename:
            title = Path(file.filename).stem

        if not title:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Resume title is required",
            )

        # Generate ID
        resume_id = uuid4()

        # Handle file upload if provided
        file_path = None
        file_name = None
        if file:
            # Validate file type
            if not file_storage.is_allowed_type(file.filename):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid file type. Allowed: {file_storage.allowed_extensions}",
                )

            # Save file
            file_path = await file_storage.save_file(file, str(resume_id))
            file_name = file.filename

            # Parse file content if not provided
            if not content:
                content = await file_storage.extract_text(file_path)

        # Create resume record
        db_resume = Resume(
            id=resume_id,
            title=title,
            content=content or "",
            file_path=file_path,
            file_name=file_name,
        )

        db.add(db_resume)
        await db.commit()
        await db.refresh(db_resume)

        logger.info(LogCategory.DATA, f"Created resume: {resume_id}")

        return ResumeResponse(
            id=str(db_resume.id),
            title=db_resume.title,
            content=db_resume.content,
            file_name=db_resume.file_name,
            created_at=db_resume.created_at,
            updated_at=db_resume.updated_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA, f"Failed to create resume: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create resume",
        )


@router.get("", response_model=List[ResumeResponse])
async def list_resumes(
    skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)
):
    """
    List all resumes.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session

    Returns:
        List of resumes
    """
    try:
        result = await db.execute(
            select(Resume).offset(skip).limit(limit).order_by(Resume.updated_at.desc())
        )
        resumes = result.scalars().all()

        return [
            ResumeResponse(
                id=str(resume.id),
                title=resume.title,
                content=resume.content,
                file_name=resume.file_name,
                created_at=resume.created_at,
                updated_at=resume.updated_at,
            )
            for resume in resumes
        ]

    except Exception as e:
        logger.error(
            LogCategory.DATA, f"Failed to list resumes: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list resumes",
        )


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(resume_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get a specific resume.

    Args:
        resume_id: Resume ID
        db: Database session

    Returns:
        Resume details
    """
    try:
        resume_uuid = parse_uuid(resume_id, "resume_id")
        result = await db.execute(select(Resume).where(Resume.id == resume_uuid))
        resume = result.scalar_one_or_none()

        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found"
            )

        return ResumeResponse(
            id=str(resume.id),
            title=resume.title,
            content=resume.content,
            file_name=resume.file_name,
            created_at=resume.created_at,
            updated_at=resume.updated_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA,
            f"Failed to get resume {resume_id}: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get resume",
        )


@router.put("/{resume_id}", response_model=ResumeResponse)
async def update_resume(
    resume_id: str, resume: ResumeUpdate, db: AsyncSession = Depends(get_db)
):
    """
    Update a resume.

    Args:
        resume_id: Resume ID
        resume: Updated resume data
        db: Database session

    Returns:
        Updated resume
    """
    try:
        resume_uuid = parse_uuid(resume_id, "resume_id")
        result = await db.execute(select(Resume).where(Resume.id == resume_uuid))
        db_resume = result.scalar_one_or_none()

        if not db_resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found"
            )

        # Update fields
        if resume.title is not None:
            db_resume.title = resume.title
        if resume.content is not None:
            db_resume.content = resume.content

        await db.commit()
        await db.refresh(db_resume)

        logger.info(LogCategory.DATA, f"Updated resume: {resume_id}")

        return ResumeResponse(
            id=str(db_resume.id),
            title=db_resume.title,
            content=db_resume.content,
            file_name=db_resume.file_name,
            created_at=db_resume.created_at,
            updated_at=db_resume.updated_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA,
            f"Failed to update resume {resume_id}: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update resume",
        )


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(resume_id: str, db: AsyncSession = Depends(get_db)):
    """
    Delete a resume.

    Args:
        resume_id: Resume ID
        db: Database session

    Returns:
        No content on success
    """
    try:
        resume_uuid = parse_uuid(resume_id, "resume_id")
        result = await db.execute(select(Resume).where(Resume.id == resume_uuid))
        resume = result.scalar_one_or_none()

        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found"
            )

        # Delete associated file
        if resume.file_path:
            file_storage.delete_file(resume.file_path)

        # Delete database record
        await db.delete(resume)
        await db.commit()

        logger.info(LogCategory.DATA, f"Deleted resume: {resume_id}")

        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA,
            f"Failed to delete resume {resume_id}: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete resume",
        )


@router.post("/{resume_id}/optimize", response_model=ResumeResponse)
async def optimize_resume(resume_id: str, db: AsyncSession = Depends(get_db)):
    """
    Optimize a resume using AI.

    Args:
        resume_id: Resume ID
        db: Database session

    Returns:
        Optimized resume
    """
    try:
        resume_uuid = parse_uuid(resume_id, "resume_id")
        result = await db.execute(select(Resume).where(Resume.id == resume_uuid))
        resume = result.scalar_one_or_none()

        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found"
            )

        # Optimize with AI
        optimized_content = await ai_service.optimize_resume(resume.content)

        # Update resume
        resume.content = optimized_content
        await db.commit()
        await db.refresh(resume)

        logger.info(LogCategory.AI, f"Optimized resume: {resume_id}")

        return ResumeResponse(
            id=str(resume.id),
            title=resume.title,
            content=resume.content,
            file_name=resume.file_name,
            created_at=resume.created_at,
            updated_at=resume.updated_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.AI,
            f"Failed to optimize resume {resume_id}: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to optimize resume",
        )


@router.get("/{resume_id}/file")
async def download_resume_file(resume_id: str, db: AsyncSession = Depends(get_db)):
    """
    Download a resume file.

    Args:
        resume_id: Resume ID
        db: Database session

    Returns:
        Resume file
    """
    try:
        resume_uuid = parse_uuid(resume_id, "resume_id")
        result = await db.execute(select(Resume).where(Resume.id == resume_uuid))
        resume = result.scalar_one_or_none()

        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found"
            )

        if not resume.file_path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No file associated with this resume",
            )

        return await file_storage.get_file(resume.file_path, resume.file_name)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA,
            f"Failed to download resume file {resume_id}: {str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to download resume file",
        )
