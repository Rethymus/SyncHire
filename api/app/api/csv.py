import uuid
import io
from typing import Optional, List, Dict
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    BackgroundTasks,
    File,
    UploadFile,
    Form,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
import logging

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.csv_export_service import CSVExportService
from app.services.csv_import_service import CSVImportService
from app.services.task_service import task_service
from app.core.errors import ValidationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/csv", tags=["csv"])


# Schemas for request/response
class ExportRequest(BaseModel):
    entity_type: str = Field(
        ..., description="Type of entity to export: applications, resumes, or jds"
    )
    fields: Optional[List[str]] = Field(
        None, description="List of fields to include in export"
    )
    batch_size: int = Field(
        100, ge=1, le=1000, description="Number of records per batch"
    )


class ImportRequest(BaseModel):
    entity_type: str = Field(
        ..., description="Type of entity to import: applications, resumes, or jds"
    )
    on_duplicate: str = Field(
        "skip", description="Strategy for duplicates: skip, update, or error"
    )
    batch_size: int = Field(50, ge=1, le=500, description="Number of records per batch")


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: float
    processed: int
    total: int
    message: Optional[str] = None
    result: Optional[Dict] = None


class ExportProgressTracker:
    """Track export progress in Redis for polling"""

    @staticmethod
    async def update_progress(job_id: str, progress_data: Dict):
        """Update progress in Redis"""
        import json
        from app.core.config import settings

        try:
            # Try to use Redis if available
            import redis

            redis_client = redis.from_url(settings.REDIS_URL)
            await redis_client.setex(
                f"export_progress:{job_id}",
                3600,  # 1 hour expiry
                json.dumps(progress_data),
            )
            await redis_client.close()
        except Exception as e:
            logger.warning(f"Redis unavailable, using in-memory storage: {e}")
            # Fallback to task service storage
            await task_service.update_task_status(job_id, progress_data)

    @staticmethod
    async def get_progress(job_id: str) -> Optional[Dict]:
        """Get progress from Redis"""
        import json
        from app.core.config import settings

        try:
            import redis

            redis_client = redis.from_url(settings.REDIS_URL)
            data = await redis_client.get(f"export_progress:{job_id}")
            await redis_client.close()
            if data:
                return json.loads(data)
        except Exception as e:
            logger.warning(f"Redis unavailable: {e}")

        # Fallback to task service
        task = await task_service.get_task_status(job_id)
        if task:
            return {
                "status": task.get("status"),
                "progress": task.get("progress", 0),
                "processed": task.get("processed", 0),
                "total": task.get("total", 0),
                "message": task.get("message"),
            }
        return None


class ImportProgressTracker:
    """Track import progress in Redis for polling"""

    @staticmethod
    async def update_progress(job_id: str, progress_data: Dict):
        """Update progress in Redis"""
        import json
        from app.core.config import settings

        try:
            import redis

            redis_client = redis.from_url(settings.REDIS_URL)
            await redis_client.setex(
                f"import_progress:{job_id}",
                3600,  # 1 hour expiry
                json.dumps(progress_data),
            )
            await redis_client.close()
        except Exception as e:
            logger.warning(f"Redis unavailable, using in-memory storage: {e}")
            # Fallback to task service storage
            await task_service.update_task_status(job_id, progress_data)

    @staticmethod
    async def get_progress(job_id: str) -> Optional[Dict]:
        """Get progress from Redis"""
        import json
        from app.core.config import settings

        try:
            import redis

            redis_client = redis.from_url(settings.REDIS_URL)
            data = await redis_client.get(f"import_progress:{job_id}")
            await redis_client.close()
            if data:
                return json.loads(data)
        except Exception as e:
            logger.warning(f"Redis unavailable: {e}")

        # Fallback to task service
        task = await task_service.get_task_status(job_id)
        if task:
            return {
                "status": task.get("status"),
                "progress": task.get("progress", 0),
                "processed": task.get("processed", 0),
                "total": task.get("total", 0),
                "message": task.get("message"),
                "success": task.get("success", 0),
                "errors": task.get("errors", 0),
            }
        return None


async def run_export_job(
    job_id: str,
    user_id: uuid.UUID,
    entity_type: str,
    fields: Optional[List[str]],
    batch_size: int,
    db: AsyncSession,
):
    """Background task to run export and store result"""
    try:
        # Create storage for CSV data
        csv_data = io.StringIO()

        # Progress callback
        async def progress_callback(progress_data: Dict):
            await ExportProgressTracker.update_progress(job_id, progress_data)

        # Run export based on entity type
        if entity_type == "applications":
            async for chunk in CSVExportService.export_applications(
                db, user_id, fields, batch_size, progress_callback
            ):
                csv_data.write(chunk)
        elif entity_type == "resumes":
            async for chunk in CSVExportService.export_resumes(
                db, user_id, fields, batch_size, progress_callback
            ):
                csv_data.write(chunk)
        elif entity_type == "jds":
            async for chunk in CSVExportService.export_jds(
                db, user_id, fields, batch_size, progress_callback
            ):
                csv_data.write(chunk)
        else:
            raise ValidationError(f"Invalid entity type: {entity_type}")

        # Store result in Redis/temp storage
        result_data = csv_data.getvalue()
        await ExportProgressTracker.update_progress(
            job_id,
            {
                "status": "completed",
                "progress": 100,
                "data": result_data,
                "size": len(result_data),
            },
        )

        logger.info(f"Export job {job_id} completed successfully")

    except Exception as e:
        logger.error(f"Export job {job_id} failed: {str(e)}")
        await ExportProgressTracker.update_progress(
            job_id,
            {
                "status": "error",
                "error": str(e),
            },
        )


async def run_import_job(
    job_id: str,
    user_id: uuid.UUID,
    entity_type: str,
    csv_data: str,
    on_duplicate: str,
    batch_size: int,
    db: AsyncSession,
):
    """Background task to run import with progress tracking"""
    try:
        # Progress callback
        async def progress_callback(progress_data: Dict):
            await ImportProgressTracker.update_progress(job_id, progress_data)

        # Run import based on entity type
        final_result = None
        if entity_type == "applications":
            async for result in CSVImportService.import_applications(
                db, user_id, csv_data, batch_size, on_duplicate, progress_callback
            ):
                final_result = result
        elif entity_type == "resumes":
            async for result in CSVImportService.import_resumes(
                db, user_id, csv_data, batch_size, on_duplicate, progress_callback
            ):
                final_result = result
        elif entity_type == "jds":
            async for result in CSVImportService.import_jds(
                db, user_id, csv_data, batch_size, on_duplicate, progress_callback
            ):
                final_result = result
        else:
            raise ValidationError(f"Invalid entity type: {entity_type}")

        # Store final result
        await ImportProgressTracker.update_progress(job_id, final_result)

        logger.info(f"Import job {job_id} completed successfully")

    except Exception as e:
        logger.error(f"Import job {job_id} failed: {str(e)}")
        await ImportProgressTracker.update_progress(
            job_id,
            {
                "status": "error",
                "error": str(e),
            },
        )


@router.post("/export", response_model=Dict[str, str])
async def start_export(
    request: ExportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Start a CSV export job in the background

    Returns job_id for tracking progress
    """
    try:
        # Validate entity type
        if request.entity_type not in ["applications", "resumes", "jds"]:
            raise ValidationError(
                f"Invalid entity_type: {request.entity_type}. Must be applications, resumes, or jds"
            )

        # Generate job ID
        job_id = str(uuid.uuid4())

        # Initialize progress
        await ExportProgressTracker.update_progress(
            job_id,
            {
                "status": "pending",
                "progress": 0,
                "processed": 0,
                "total": 0,
            },
        )

        # Start background task
        background_tasks.add_task(
            run_export_job,
            job_id,
            current_user.id,
            request.entity_type,
            request.fields,
            request.batch_size,
            db,
        )

        logger.info(f"Started export job {job_id} for user {current_user.id}")

        return {"job_id": job_id, "status": "pending"}

    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error starting export: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start export: {str(e)}",
        )


@router.get("/export/{job_id}/status", response_model=JobStatusResponse)
async def get_export_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Check the status of an export job

    Returns progress information
    """
    try:
        progress_data = await ExportProgressTracker.get_progress(job_id)

        if not progress_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Export job {job_id} not found",
            )

        return JobStatusResponse(
            job_id=job_id,
            status=progress_data.get("status", "unknown"),
            progress=progress_data.get("progress", 0),
            processed=progress_data.get("processed", 0),
            total=progress_data.get("total", 0),
            message=progress_data.get("message"),
            result=(
                progress_data if progress_data.get("status") == "completed" else None
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting export status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get export status: {str(e)}",
        )


@router.get("/export/{job_id}/download")
async def download_export(
    job_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Download the completed export file

    Returns CSV file as streaming response
    """
    try:
        progress_data = await ExportProgressTracker.get_progress(job_id)

        if not progress_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Export job {job_id} not found",
            )

        if progress_data.get("status") != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Export job {job_id} is not completed yet",
            )

        csv_data = progress_data.get("data")
        if not csv_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No data found for export job {job_id}",
            )

        # Create streaming response
        return StreamingResponse(
            io.StringIO(csv_data),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=export_{job_id}.csv"
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading export: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download export: {str(e)}",
        )


@router.post("/import", response_model=Dict[str, str])
async def start_import(
    background_tasks: BackgroundTasks,
    csv_file: UploadFile = File(...),
    entity_type: str = Form(...),
    on_duplicate: str = Form("skip"),
    batch_size: int = Form(50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Start a CSV import job in the background

    Returns job_id for tracking progress
    """
    try:
        # Validate entity type
        if entity_type not in ["applications", "resumes", "jds"]:
            raise ValidationError(
                f"Invalid entity_type: {entity_type}. Must be applications, resumes, or jds"
            )

        # Validate on_duplicate strategy
        if on_duplicate not in ["skip", "update", "error"]:
            raise ValidationError(
                f"Invalid on_duplicate: {on_duplicate}. Must be skip, update, or error"
            )

        # Read and decode CSV data
        try:
            csv_data = (await csv_file.read()).decode("utf-8")
        except UnicodeDecodeError:
            raise ValidationError("CSV file must be UTF-8 encoded")

        # Generate job ID
        job_id = str(uuid.uuid4())

        # Initialize progress
        await ImportProgressTracker.update_progress(
            job_id,
            {
                "status": "pending",
                "progress": 0,
                "processed": 0,
                "total": 0,
            },
        )

        # Start background task
        background_tasks.add_task(
            run_import_job,
            job_id,
            current_user.id,
            entity_type,
            csv_data,
            on_duplicate,
            batch_size,
            db,
        )

        logger.info(f"Started import job {job_id} for user {current_user.id}")

        return {"job_id": job_id, "status": "pending"}

    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error starting import: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start import: {str(e)}",
        )


@router.get("/import/{job_id}/status", response_model=JobStatusResponse)
async def get_import_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Check the status of an import job

    Returns progress information including success/error counts
    """
    try:
        progress_data = await ImportProgressTracker.get_progress(job_id)

        if not progress_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Import job {job_id} not found",
            )

        return JobStatusResponse(
            job_id=job_id,
            status=progress_data.get("status", "unknown"),
            progress=progress_data.get("progress", 0),
            processed=progress_data.get("processed", 0),
            total=progress_data.get("total", 0),
            message=progress_data.get("message"),
            result=(
                progress_data if progress_data.get("status") == "completed" else None
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting import status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get import status: {str(e)}",
        )
