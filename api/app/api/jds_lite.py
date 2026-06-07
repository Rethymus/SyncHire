"""
Job Descriptions API - Lightweight Version

Local-first job description management without authentication.
"""

from uuid import uuid4
from typing import List
from fastapi import APIRouter, Body, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx

from app.api.utils_lite import parse_uuid
from app.core.database_lite import get_db, AsyncSessionLocal
from app.models.jd_lite import JobDescription
from app.schemas.schemas_lite import (
    JobDescriptionCreate,
    JobDescriptionParseRequest,
    JobDescriptionUpdate,
    JobDescriptionResponse,
    UrlImportRequest,
)
from app.services.ai_service_lite import ai_service
from app.core.logger import logger, LogCategory
from app.core.config_lite import get_lite_settings

settings = get_lite_settings()

router = APIRouter(prefix="/jds", tags=["job-descriptions"])


@router.post(
    "", response_model=JobDescriptionResponse, status_code=status.HTTP_201_CREATED
)
async def create_jd(jd: JobDescriptionCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new job description.

    Args:
        jd: Job description data
        db: Database session

    Returns:
        Created job description
    """
    try:
        jd_id = uuid4()

        # Create JD record
        db_jd = JobDescription(
            id=jd_id,
            company=jd.company,
            title=jd.title,
            description=jd.description,
            url=jd.url,
            location=jd.location,
            salary_min=jd.salary_min,
            salary_max=jd.salary_max,
            currency=jd.currency,
            employment_type=jd.employment_type,
            remote=jd.remote,
        )

        db.add(db_jd)
        await db.commit()
        await db.refresh(db_jd)

        logger.info(LogCategory.DATA, f"Created JD: {jd_id}")

        return JobDescriptionResponse(
            id=str(db_jd.id),
            company=db_jd.company,
            title=db_jd.title,
            description=db_jd.description,
            url=db_jd.url,
            location=db_jd.location,
            salary_min=db_jd.salary_min,
            salary_max=db_jd.salary_max,
            currency=db_jd.currency,
            employment_type=db_jd.employment_type,
            remote=db_jd.remote,
            created_at=db_jd.created_at,
            updated_at=db_jd.updated_at,
        )

    except Exception as e:
        logger.error(LogCategory.DATA, f"Failed to create JD: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create job description",
        )


@router.get("", response_model=List[JobDescriptionResponse])
async def list_jds(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """
    List all job descriptions.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session

    Returns:
        List of job descriptions
    """
    try:
        result = await db.execute(
            select(JobDescription)
            .offset(skip)
            .limit(limit)
            .order_by(JobDescription.updated_at.desc())
        )
        jds = result.scalars().all()

        return [
            JobDescriptionResponse(
                id=str(jd.id),
                company=jd.company,
                title=jd.title,
                description=jd.description,
                url=jd.url,
                location=jd.location,
                salary_min=jd.salary_min,
                salary_max=jd.salary_max,
                currency=jd.currency,
                employment_type=jd.employment_type,
                remote=jd.remote,
                created_at=jd.created_at,
                updated_at=jd.updated_at,
            )
            for jd in jds
        ]

    except Exception as e:
        logger.error(LogCategory.DATA, f"Failed to list JDs: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list job descriptions",
        )


@router.get("/{jd_id}", response_model=JobDescriptionResponse)
async def get_jd(jd_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get a specific job description.

    Args:
        jd_id: Job description ID
        db: Database session

    Returns:
        Job description details
    """
    try:
        jd_uuid = parse_uuid(jd_id, "jd_id")
        result = await db.execute(
            select(JobDescription).where(JobDescription.id == jd_uuid)
        )
        jd = result.scalar_one_or_none()

        if not jd:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job description not found",
            )

        return JobDescriptionResponse(
            id=str(jd.id),
            company=jd.company,
            title=jd.title,
            description=jd.description,
            url=jd.url,
            location=jd.location,
            salary_min=jd.salary_min,
            salary_max=jd.salary_max,
            currency=jd.currency,
            employment_type=jd.employment_type,
            remote=jd.remote,
            created_at=jd.created_at,
            updated_at=jd.updated_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA, f"Failed to get JD {jd_id}: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get job description",
        )


@router.put("/{jd_id}", response_model=JobDescriptionResponse)
async def update_jd(
    jd_id: str, jd: JobDescriptionUpdate, db: AsyncSession = Depends(get_db)
):
    """
    Update a job description.

    Args:
        jd_id: Job description ID
        jd: Updated job description data
        db: Database session

    Returns:
        Updated job description
    """
    try:
        jd_uuid = parse_uuid(jd_id, "jd_id")
        result = await db.execute(
            select(JobDescription).where(JobDescription.id == jd_uuid)
        )
        db_jd = result.scalar_one_or_none()

        if not db_jd:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job description not found",
            )

        # Update fields
        if jd.company is not None:
            db_jd.company = jd.company
        if jd.title is not None:
            db_jd.title = jd.title
        if jd.description is not None:
            db_jd.description = jd.description
        if jd.url is not None:
            db_jd.url = jd.url
        if jd.location is not None:
            db_jd.location = jd.location
        if jd.salary_min is not None:
            db_jd.salary_min = jd.salary_min
        if jd.salary_max is not None:
            db_jd.salary_max = jd.salary_max
        if jd.currency is not None:
            db_jd.currency = jd.currency
        if jd.employment_type is not None:
            db_jd.employment_type = jd.employment_type
        if jd.remote is not None:
            db_jd.remote = jd.remote

        await db.commit()
        await db.refresh(db_jd)

        logger.info(LogCategory.DATA, f"Updated JD: {jd_id}")

        return JobDescriptionResponse(
            id=str(db_jd.id),
            company=db_jd.company,
            title=db_jd.title,
            description=db_jd.description,
            url=db_jd.url,
            location=db_jd.location,
            salary_min=db_jd.salary_min,
            salary_max=db_jd.salary_max,
            currency=db_jd.currency,
            employment_type=db_jd.employment_type,
            remote=db_jd.remote,
            created_at=db_jd.created_at,
            updated_at=db_jd.updated_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA, f"Failed to update JD {jd_id}: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update job description",
        )


@router.delete("/{jd_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_jd(jd_id: str, db: AsyncSession = Depends(get_db)):
    """
    Delete a job description.

    Args:
        jd_id: Job description ID
        db: Database session

    Returns:
        No content on success
    """
    try:
        jd_uuid = parse_uuid(jd_id, "jd_id")
        result = await db.execute(
            select(JobDescription).where(JobDescription.id == jd_uuid)
        )
        jd = result.scalar_one_or_none()

        if not jd:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job description not found",
            )

        await db.delete(jd)
        await db.commit()

        logger.info(LogCategory.DATA, f"Deleted JD: {jd_id}")

        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA, f"Failed to delete JD {jd_id}: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete job description",
        )


@router.post("/parse", response_model=JobDescriptionResponse)
async def parse_jd(
    request: JobDescriptionParseRequest | None = Body(None),
    content: str | None = None,
    url: str | None = None,
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Parse job description from text or URL using AI.

    Args:
        content: Raw JD content or URL
        url: Optional URL source
        background_tasks: FastAPI background tasks
        db: Database session

    Returns:
        Parsed job description
    """
    try:
        if request is not None:
            content = request.content
            url = request.url or url

        if not content:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Job description content is required",
            )

        # If content is a URL, fetch the content
        if content.startswith("http"):
            url = content
            async with httpx.AsyncClient() as client:
                response = await client.get(content, timeout=30.0)
                response.raise_for_status()
                content = response.text

        # Parse with AI
        parsed = await ai_service.parse_jd(content)

        # Create JD record
        jd_id = uuid4()
        db_jd = JobDescription(
            id=jd_id,
            company=parsed.get("company") or "Unknown Company",
            title=parsed.get("title") or "Unknown Position",
            description=parsed.get("description", content),
            url=url,
            location=parsed.get("location"),
            salary_min=parsed.get("salary_min"),
            salary_max=parsed.get("salary_max"),
            currency="USD",
            employment_type=parsed.get("employment_type"),
            remote=parsed.get("remote", "unknown"),
            requirements=str(parsed.get("requirements", [])),
            benefits=str(parsed.get("benefits", [])),
            parsed_data=str(parsed),
        )

        db.add(db_jd)
        await db.commit()
        await db.refresh(db_jd)

        logger.info(LogCategory.AI, f"Parsed JD: {jd_id}")

        return JobDescriptionResponse(
            id=str(db_jd.id),
            company=db_jd.company,
            title=db_jd.title,
            description=db_jd.description,
            url=db_jd.url,
            location=db_jd.location,
            salary_min=db_jd.salary_min,
            salary_max=db_jd.salary_max,
            currency=db_jd.currency,
            employment_type=db_jd.employment_type,
            remote=db_jd.remote,
            created_at=db_jd.created_at,
            updated_at=db_jd.updated_at,
        )

    except Exception as e:
        logger.error(LogCategory.AI, f"Failed to parse JD: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse job description",
        )


@router.post("/import")
async def import_jd_from_url(
    request: UrlImportRequest | None = Body(None),
    url: str | None = None,
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Import job description from URL.

    Args:
        url: URL to import from
        background_tasks: FastAPI background tasks
        db: Database session

    Returns:
        Import job ID for tracking
    """
    try:
        if request is not None:
            url = request.url

        if not url:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="URL is required",
            )

        # Validate URL
        if not url.startswith("http"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid URL"
            )

        # Fetch content in background
        job_id = uuid4()

        async def fetch_and_parse():
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(url, timeout=30.0)
                    response.raise_for_status()
                    content = response.text

                # Parse with AI
                parsed = await ai_service.parse_jd(content)

                # Create JD record
                db_jd = JobDescription(
                    id=job_id,
                    company=parsed.get("company") or "Unknown Company",
                    title=parsed.get("title") or "Unknown Position",
                    description=parsed.get("description", content),
                    url=url,
                    location=parsed.get("location"),
                    salary_min=parsed.get("salary_min"),
                    salary_max=parsed.get("salary_max"),
                    parsed_data=str(parsed),
                )

                async with AsyncSessionLocal() as session:
                    session.add(db_jd)
                    await session.commit()

                logger.info(LogCategory.DATA, f"Imported JD from URL: {url}")

            except Exception as e:
                logger.error(
                    LogCategory.DATA, f"Failed to import JD: {str(e)}", exc_info=True
                )

        if background_tasks is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Background task runner is unavailable",
            )

        background_tasks.add_task(fetch_and_parse)

        return {
            "job_id": str(job_id),
            "status": "processing",
            "message": "Job description is being imported",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA, f"Failed to start import: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to import job description",
        )
