import uuid
import logging
from typing import List
from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException, Query
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
    BulkDeleteRequest,
    BulkDeleteResponse,
)
from app.services.jd_service import JDService
from app.services.file_parser import FileParserService
from app.middleware.rate_limit import rate_limit, RateLimitType
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class PaginatedJDResponse(BaseModel):
    """Paginated response for JD list."""
    items: List[JDResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

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
@rate_limit(RateLimitType.UPLOAD)
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


@router.get("/", response_model=PaginatedJDResponse)
async def list_jds(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List job descriptions with pagination.

    Returns paginated list of JDs with metadata for navigation.
    """
    jds, total = await JDService.get_jds_paginated(
        db, current_user.id, page, page_size
    )

    total_pages = (total + page_size - 1) // page_size

    return PaginatedJDResponse(
        items=jds,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


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


@router.post("/bulk-delete", response_model=BulkDeleteResponse)
async def bulk_delete_jds(
    request: BulkDeleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Bulk delete multiple job descriptions

    Deletes multiple JDs by IDs with partial failure support.
    Returns detailed information about successful and failed deletions.

    - **ids**: List of JD IDs to delete (max 100 at once)
    - **success_count**: Number of successfully deleted JDs
    - **failed_count**: Number of JDs that failed to delete
    - **errors**: List of errors for failed deletions with ID and error message
    """
    logger.info(f"Bulk delete request for {len(request.ids)} JDs by user {current_user.id}")
    return await JDService.bulk_delete_jds(db, current_user.id, request.ids)


@router.post("/import-url", response_model=JDFileUploadResponse, status_code=status.HTTP_201_CREATED)
@rate_limit(RateLimitType.UPLOAD)
async def import_jd_from_url(
    url: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import a job description from a URL by scraping the content."""
    try:
        # Validate URL format
        from urllib.parse import urlparse
        parsed = urlparse(url)
        if not all([parsed.scheme, parsed.netloc]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid URL format"
            )
        
        # Allow only common job posting sites
        allowed_domains = [
            'linkedin.com', 'indeed.com', 'glassdoor.com',
            'monster.com', 'careerbuilder.com', 'ziprecruiter.com',
            'stackoverflow.com', 'lever.co', 'greenhouse.io'
        ]
        if not any(domain in parsed.netloc.lower() for domain in allowed_domains):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="URL domain not supported. Please use major job posting sites."
            )
        
        # Import web scraping service
        import httpx
        from bs4 import BeautifulSoup
        
        # Fetch the URL content
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            response.raise_for_status()
        
        # Parse HTML content
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract job description content (heuristic approach)
        # Try common selectors for job descriptions
        content_selectors = [
            'div.description',
            'div.job-description',
            'section.job__description',
            'div[class*="description"]',
            'div[class*="job"]'
        ]
        
        content = None
        for selector in content_selectors:
            element = soup.select_one(selector)
            if element:
                content = element.get_text(strip=True)
                break
        
        if not content:
            # Fallback to getting all text from body
            body = soup.find('body')
            if body:
                content = body.get_text(strip=True)
        
        if not content or len(content) < 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract job description from URL. The page may not be accessible or may require login."
            )
        
        # Parse JD content
        parsed_data = await JDService.parse_jd(content)
        
        # Extract title and company from parsed data
        title = parsed_data.get("title") or "Imported Position"
        company = parsed_data.get("company") or parsed.netloc.replace("www.", "")
        
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
            message=f"Successfully imported job description from {url}",
        )
        
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch URL: {e.response.status_code}"
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="URL import timed out. Please try again."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import job description: {str(e)}"
        )
