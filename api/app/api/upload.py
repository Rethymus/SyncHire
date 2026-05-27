"""
Chunked File Upload API

Handles large file uploads by accepting chunks, storing them temporarily,
and recombining them into complete files when all chunks are received.
"""

import uuid
import shutil
import logging
from pathlib import Path
from typing import Optional
from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
    status,
    Depends,
)
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from pydantic import BaseModel
from app.services.resume_service import ResumeService
from app.services.jd_service import JDService
from app.middleware.rate_limit import rate_limit, RateLimitType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["upload"])

# Configuration
CHUNK_DIR = Path("/tmp/chunks")
UPLOAD_DIR = Path("/tmp/uploads")
MAX_CHUNK_SIZE = 10 * 1024 * 1024  # 10MB max chunk size
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB max file size

# Ensure directories exist
CHUNK_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class ChunkUploadResponse(BaseModel):
    """Response for chunk upload."""

    chunkIndex: int
    etag: str
    received: int


class CompleteUploadRequest(BaseModel):
    """Request to complete chunked upload."""

    fileId: str
    fileName: str
    totalChunks: int
    title: Optional[str] = None
    uploadType: Optional[str] = "resume"  # "resume" or "jd"


class CompleteUploadResponse(BaseModel):
    """Response for completed upload."""

    id: str
    title: str
    content: str
    file_path: str
    created_at: str


@router.post("/chunk", response_model=ChunkUploadResponse)
@rate_limit(RateLimitType.UPLOAD)
async def upload_chunk(
    chunk: UploadFile = File(...),
    chunkIndex: int = Form(...),
    totalChunks: int = Form(...),
    fileId: str = Form(...),
    fileName: str = Form(...),
    fileSize: int = Form(...),
    fileType: str = Form(...),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a single chunk of a larger file.

    Chunks are stored temporarily and identified by fileId and chunkIndex.
    """
    try:
        # Validate inputs
        if totalChunks <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="totalChunks must be greater than 0",
            )

        if chunkIndex < 0 or chunkIndex >= totalChunks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"chunkIndex must be between 0 and {totalChunks - 1}",
            )

        if fileSize > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE} bytes",
            )

        # Create user-specific chunk directory
        user_chunk_dir = CHUNK_DIR / str(current_user.id) / fileId
        user_chunk_dir.mkdir(parents=True, exist_ok=True)

        # Save chunk to temporary file
        chunk_path = user_chunk_dir / f"chunk_{chunkIndex}"

        # Read and validate chunk size
        chunk_content = await chunk.read()
        if len(chunk_content) > MAX_CHUNK_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Chunk size exceeds maximum allowed size of {MAX_CHUNK_SIZE} bytes",
            )

        # Write chunk to disk
        with open(chunk_path, "wb") as f:
            f.write(chunk_content)

        logger.info(
            f"Received chunk {chunkIndex + 1}/{totalChunks} "
            f"for file {fileName} (user: {current_user.id})"
        )

        # Generate ETag for this chunk
        etag = f"{chunkIndex}-{uuid.uuid4().hex[:8]}"

        return ChunkUploadResponse(
            chunkIndex=chunkIndex, etag=etag, received=len(chunk_content)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading chunk: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload chunk",
        )


@router.post("/complete", response_model=CompleteUploadResponse)
async def complete_upload(
    fileId: str = Form(...),
    fileName: str = Form(...),
    totalChunks: int = Form(...),
    title: Optional[str] = Form(None),
    uploadType: str = Form("resume"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Complete a chunked upload by recombining all chunks into a single file.

    Validates that all chunks are present, recombines them in order,
    and processes the final file based on upload type (resume or JD).
    """
    try:
        # Validate inputs
        if totalChunks <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="totalChunks must be greater than 0",
            )

        # Locate chunk directory
        user_chunk_dir = CHUNK_DIR / str(current_user.id) / fileId
        if not user_chunk_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No chunks found for this file ID",
            )

        # Verify all chunks are present
        missing_chunks = []
        for i in range(totalChunks):
            chunk_path = user_chunk_dir / f"chunk_{i}"
            if not chunk_path.exists():
                missing_chunks.append(i)

        if missing_chunks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing chunks: {missing_chunks}",
            )

        # Recombine chunks into final file
        final_file_path = UPLOAD_DIR / f"{current_user.id}_{fileName}"

        with open(final_file_path, "wb") as output_file:
            for i in range(totalChunks):
                chunk_path = user_chunk_dir / f"chunk_{i}"
                with open(chunk_path, "rb") as chunk_file:
                    shutil.copyfileobj(chunk_file, output_file)

        logger.info(
            f"Recombined {totalChunks} chunks into {fileName} "
            f"(user: {current_user.id}, size: {final_file_path.stat().st_size} bytes)"
        )

        # Process file based on upload type
        if uploadType == "jd":
            # Process as Job Description
            result = await _process_jd_upload(
                db, current_user.id, final_file_path, fileName, title
            )
        else:
            # Process as Resume (default)
            result = await _process_resume_upload(
                db, current_user.id, final_file_path, fileName, title
            )

        # Clean up chunks
        shutil.rmtree(user_chunk_dir)

        # Clean up final file (it's been processed)
        final_file_path.unlink(missing_ok=True)

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing upload: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete upload",
        )


async def _process_resume_upload(
    db: AsyncSession,
    user_id: uuid.UUID,
    file_path: Path,
    filename: str,
    title: Optional[str],
) -> CompleteUploadResponse:
    """Process uploaded resume file."""
    # Create a mock UploadFile for the resume service
    from fastapi import UploadFile as FastAPIUploadFile

    with open(file_path, "rb") as f:
        file_content = f.read()

    # Create a file-like object
    from io import BytesIO

    file_obj = BytesIO(file_content)

    # Create UploadFile
    upload_file = FastAPIUploadFile(
        filename=filename, file=file_obj, content_type="application/octet-stream"
    )

    # Use resume service to create resume
    result = await ResumeService.create_resume(
        db, user_id, upload_file, title or filename.replace(r"\.[^/.]+$", "")
    )

    return CompleteUploadResponse(
        id=str(result.id),
        title=result.title,
        content=result.content or "",
        file_path=result.file_path,
        created_at=result.created_at.isoformat(),
    )


async def _process_jd_upload(
    db: AsyncSession,
    user_id: uuid.UUID,
    file_path: Path,
    filename: str,
    title: Optional[str],
) -> CompleteUploadResponse:
    """Process uploaded JD file."""
    # Create a mock UploadFile for the JD service
    from fastapi import UploadFile as FastAPIUploadFile

    with open(file_path, "rb") as f:
        file_content = f.read()

    # Create a file-like object
    from io import BytesIO

    file_obj = BytesIO(file_content)

    # Create UploadFile
    upload_file = FastAPIUploadFile(
        filename=filename, file=file_obj, content_type="application/pdf"
    )

    # Use JD service to create JD
    result = await JDService.create_jd_from_file(
        db, user_id, upload_file, title or filename.replace(r"\.[^/.]+$", "")
    )

    return CompleteUploadResponse(
        id=str(result.id),
        title=result.title,
        content=result.content or "",
        file_path=result.file_path,
        created_at=result.created_at.isoformat(),
    )


@router.delete("/cleanup/{fileId}")
async def cleanup_chunks(
    fileId: str,
    current_user: User = Depends(get_current_user),
):
    """
    Clean up chunks for a cancelled or failed upload.

    Removes all temporary chunk files for the given file ID.
    """
    try:
        user_chunk_dir = CHUNK_DIR / str(current_user.id) / fileId

        if not user_chunk_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No chunks found for this file ID",
            )

        # Remove chunk directory
        shutil.rmtree(user_chunk_dir)

        logger.info(f"Cleaned up chunks for fileId {fileId} (user: {current_user.id})")

        return {"message": "Chunks cleaned up successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cleaning up chunks: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clean up chunks",
        )


# Cleanup utility for scheduled maintenance
async def cleanup_old_chunks(max_age_hours: int = 24):
    """
    Clean up chunk directories older than specified hours.

    This should be called periodically (e.g., via cron job).
    """
    try:
        import time

        current_time = time.time()
        max_age_seconds = max_age_hours * 3600

        for user_dir in CHUNK_DIR.iterdir():
            if user_dir.is_dir():
                for file_dir in user_dir.iterdir():
                    if file_dir.is_dir():
                        # Check directory age
                        dir_age = current_time - file_dir.stat().st_mtime
                        if dir_age > max_age_seconds:
                            logger.info(f"Removing old chunk directory: {file_dir}")
                            shutil.rmtree(file_dir)

    except Exception as e:
        logger.error(f"Error in cleanup_old_chunks: {str(e)}")
