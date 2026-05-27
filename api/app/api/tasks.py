import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.task import TaskStatus
from app.services.task_service import TaskService
from app.core.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


# Request/Response Schemas
class TaskSubmitRequest(BaseModel):
    """Request schema for submitting a new task."""

    task_type: str = Field(
        ..., description="Type of task (resume_optimization, jd_parsing, etc.)"
    )
    input_data: dict = Field(..., description="Task input parameters")
    priority: str = Field("normal", description="Task priority (high, normal, low)")


class TaskSubmitResponse(BaseModel):
    """Response schema for task submission."""

    task_id: uuid.UUID
    task_type: str
    status: str
    created_at: str
    message: str


class TaskStatusResponse(BaseModel):
    """Response schema for task status."""

    task_id: uuid.UUID
    task_type: str
    status: str
    input_data: Optional[dict] = None
    result_data: Optional[dict] = None
    error_message: Optional[str] = None
    error_details: Optional[dict] = None
    priority: Optional[str] = None
    progress: Optional[dict] = None
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    updated_at: str


class TaskListResponse(BaseModel):
    """Response schema for task list."""

    tasks: List[dict]
    total: int


class TaskStatsResponse(BaseModel):
    """Response schema for task statistics."""

    by_status: dict
    by_type: dict
    total: int


# Endpoint Handlers
@router.post(
    "/submit", response_model=TaskSubmitResponse, status_code=status.HTTP_202_ACCEPTED
)
async def submit_task(
    task_request: TaskSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit a new task for async processing.

    This endpoint creates a new task and returns immediately with a task ID.
    The task will be processed in the background by the task worker.

    **Task Types:**
    - `resume_optimization`: Optimize resume for a specific job description
    - `jd_parsing`: Parse and extract structured data from job description
    - `resume_parsing`: Parse and extract structured data from resume
    - `interview_prep`: Generate interview preparation materials
    - `match_analysis`: Analyze resume-JD match score and details

    **Priority Levels:**
    - `high`: Processed first
    - `normal`: Default priority
    - `low`: Processed when no higher priority tasks exist

    Returns task ID that can be used to check status and retrieve results.
    """
    try:
        task = await TaskService.submit_task(
            db=db,
            user_id=current_user.id,
            task_type=task_request.task_type,
            input_data=task_request.input_data,
            priority=task_request.priority,
        )

        return TaskSubmitResponse(
            task_id=task.id,
            task_type=task.task_type,
            status=task.status,
            created_at=task.created_at.isoformat(),
            message="Task submitted successfully. Use the task_id to check status and retrieve results.",
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Failed to submit task: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit task. Please try again.",
        )


@router.get("/{task_id}/status", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the current status of a task.

    Use this endpoint to poll for task completion before retrieving results.
    The status field will be one of:
    - `pending`: Task is queued and waiting to be processed
    - `processing`: Task is currently being processed
    - `completed`: Task completed successfully (results available)
    - `failed`: Task failed (error details available)
    """
    try:
        task = await TaskService.get_task_status(
            db=db, task_id=task_id, user_id=current_user.id
        )

        return TaskStatusResponse(**task.to_dict())

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Failed to get task status: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve task status.",
        )


@router.get("/{task_id}/result")
async def get_task_result(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the result of a completed task.

    This endpoint only returns results for successfully completed tasks.
    Use /status endpoint to check if task is completed before calling this.

    Returns the result_data field which contains the task execution results.
    """
    try:
        result = await TaskService.get_task_result(
            db=db, task_id=task_id, user_id=current_user.id
        )

        return {
            "task_id": str(task_id),
            "status": "completed",
            "result": result,
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Failed to get task result: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve task result.",
        )


@router.get("/", response_model=TaskListResponse)
async def get_user_tasks(
    status_filter: Optional[str] = None,
    task_type_filter: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all tasks for the current user with optional filtering.

    **Query Parameters:**
    - `status_filter`: Filter by task status (pending, processing, completed, failed)
    - `task_type_filter`: Filter by task type (resume_optimization, jd_parsing, etc.)
    - `limit`: Maximum number of tasks to return (default: 50)

    Returns a list of tasks ordered by creation date (newest first).
    """
    try:
        tasks = await TaskService.get_user_tasks(
            db=db,
            user_id=current_user.id,
            status=status_filter,
            task_type=task_type_filter,
            limit=limit,
        )

        return TaskListResponse(
            tasks=[task.to_dict() for task in tasks],
            total=len(tasks),
        )

    except Exception as e:
        logger.error(f"Failed to get user tasks: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tasks.",
        )


@router.get("/stats", response_model=TaskStatsResponse)
async def get_task_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get statistics about the user's tasks.

    Returns counts of tasks grouped by status and type.
    Useful for dashboards and analytics.
    """
    try:
        stats = await TaskService.get_task_stats(db=db, user_id=current_user.id)

        return TaskStatsResponse(**stats)

    except Exception as e:
        logger.error(f"Failed to get task stats: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve task statistics.",
        )


@router.delete("/{task_id}")
async def delete_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a task and its associated data.

    Only completed or failed tasks can be deleted.
    Pending or processing tasks cannot be deleted.

    **Note:** This is a permanent deletion. Use with caution.
    """
    try:
        # Get the task
        task = await TaskService.get_task_status(
            db=db, task_id=task_id, user_id=current_user.id
        )

        # Check if task can be deleted
        if task.status in [TaskStatus.PENDING.value, TaskStatus.PROCESSING.value]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete task with status: {task.status}. "
                "Only completed or failed tasks can be deleted.",
            )

        # Delete the task
        await db.delete(task)
        await db.commit()

        return {
            "message": "Task deleted successfully",
            "task_id": str(task_id),
        }

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Failed to delete task: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete task.",
        )


@router.post("/cleanup")
async def cleanup_old_tasks(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Clean up old completed/failed tasks.

    This endpoint removes tasks that completed more than the specified
    number of days ago. Useful for managing storage and improving performance.

    **Query Parameters:**
    - `days`: Number of days after which to clean up tasks (default: 7)

    Returns the number of tasks cleaned up.
    """
    try:
        if days < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Days must be at least 1",
            )

        count = await TaskService.cleanup_old_tasks(db=db, days=days)

        return {
            "message": f"Cleaned up {count} old tasks",
            "tasks_deleted": count,
            "days_threshold": days,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cleanup old tasks: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cleanup old tasks.",
        )
