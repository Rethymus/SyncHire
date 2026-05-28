import uuid
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.task import Task, TaskType, TaskStatus
from app.services.ai_service import AIService
from app.services.mcp_client import mcp_client, MCPError
from app.core.redis import redis_client
from app.core.logger import logger


class TaskService:
    """
    Service for managing async task processing of AI operations.

    This service provides a task queue pattern for resource-intensive operations
    like resume optimization, JD parsing, and interview preparation.
    """

    # Task priorities
    PRIORITY_HIGH = "high"
    PRIORITY_NORMAL = "normal"
    PRIORITY_LOW = "low"

    # Task processing configuration
    MAX_RETRIES = 3
    TASK_TIMEOUT = 300  # 5 minutes
    CLEANUP_OLD_TASKS_DAYS = 7

    @staticmethod
    async def submit_task(
        db: AsyncSession,
        user_id: uuid.UUID,
        task_type: str,
        input_data: Dict[str, Any],
        priority: str = PRIORITY_NORMAL,
    ) -> Task:
        """
        Submit a new task for async processing.

        Args:
            db: Database session
            user_id: User ID submitting the task
            task_type: Type of task (resume_optimization, jd_parsing, etc.)
            input_data: Task input parameters
            priority: Task priority (high, normal, low)

        Returns:
            Created task object

        Raises:
            ValueError: If task_type is invalid
            DatabaseError: If task creation fails
        """
        try:
            # Validate task type
            valid_types = [t.value for t in TaskType]
            if task_type not in valid_types:
                raise ValueError(
                    f"Invalid task_type: {task_type}. Must be one of: {valid_types}"
                )

            # Validate priority
            if priority not in [
                TaskService.PRIORITY_HIGH,
                TaskService.PRIORITY_NORMAL,
                TaskService.PRIORITY_LOW,
            ]:
                raise ValueError(
                    f"Invalid priority: {priority}. Must be one of: high, normal, low"
                )

            # Create task
            task = Task(
                user_id=user_id,
                task_type=task_type,
                status=TaskStatus.PENDING.value,
                input_data=input_data,
                priority=priority,
            )

            db.add(task)
            await db.commit()
            await db.refresh(task)

            logger.info(
                f"Task {task.id} submitted: type={task_type}, user={user_id}, priority={priority}"
            )

            # Add to Redis queue for background processing
            try:
                await redis_client.lpush(
                    f"task_queue:{priority}",
                    json.dumps({"task_id": str(task.id), "task_type": task_type}),
                )
            except Exception as e:
                logger.warning(f"Failed to add task to Redis queue: {e}")

            return task

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to submit task: {str(e)}", exc_info=True)
            await db.rollback()
            raise

    @staticmethod
    async def get_task_status(
        db: AsyncSession, task_id: uuid.UUID, user_id: uuid.UUID
    ) -> Task:
        """
        Get the current status of a task.

        Args:
            db: Database session
            task_id: Task ID to check
            user_id: User ID for authorization

        Returns:
            Task object with current status

        Raises:
            ValueError: If task not found or access denied
        """
        try:
            result = await db.execute(
                select(Task).where(and_(Task.id == task_id, Task.user_id == user_id))
            )
            task = result.scalar_one_or_none()

            if not task:
                raise ValueError("Task not found or access denied")

            return task

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to get task status: {str(e)}", exc_info=True)
            raise

    @staticmethod
    async def get_task_result(
        db: AsyncSession, task_id: uuid.UUID, user_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Get the result of a completed task.

        Args:
            db: Database session
            task_id: Task ID to get result for
            user_id: User ID for authorization

        Returns:
            Task result data

        Raises:
            ValueError: If task not found, not completed, or access denied
        """
        try:
            task = await TaskService.get_task_status(db, task_id, user_id)

            if task.status != TaskStatus.COMPLETED.value:
                raise ValueError(f"Task not completed. Current status: {task.status}")

            if task.result_data is None:
                raise ValueError("Task completed but no result data available")

            return task.result_data

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to get task result: {str(e)}", exc_info=True)
            raise

    @staticmethod
    async def process_tasks(db: AsyncSession, max_concurrent: int = 3) -> None:
        """
        Background worker to process pending tasks.

        This should be run as a background process/worker. It processes tasks
        from the Redis queue in priority order.

        Args:
            db: Database session
            max_concurrent: Maximum number of tasks to process concurrently
        """
        logger.info("Starting task processing worker")

        while True:
            try:
                # Process tasks in priority order
                for priority in [
                    TaskService.PRIORITY_HIGH,
                    TaskService.PRIORITY_NORMAL,
                    TaskService.PRIORITY_LOW,
                ]:
                    # Get task from queue
                    task_data = await redis_client.rpop(f"task_queue:{priority}")
                    if not task_data:
                        continue

                    try:
                        task_info = json.loads(task_data)
                        task_id = uuid.UUID(task_info["task_id"])

                        # Fetch task from database
                        result = await db.execute(
                            select(Task).where(Task.id == task_id)
                        )
                        task = result.scalar_one_or_none()

                        if not task or task.status != TaskStatus.PENDING.value:
                            logger.warning(f"Task {task_id} not found or not pending")
                            continue

                        # Process the task
                        await TaskService._process_single_task(db, task)

                    except Exception as e:
                        logger.error(f"Error processing task: {str(e)}", exc_info=True)

                # Wait before checking for more tasks
                await asyncio.sleep(1)

            except Exception as e:
                logger.error(f"Error in task processing loop: {str(e)}", exc_info=True)
                await asyncio.sleep(5)

    @staticmethod
    async def _process_single_task(db: AsyncSession, task: Task) -> None:
        """
        Process a single task with error handling and retries.

        Args:
            db: Database session
            task: Task object to process
        """
        try:
            # Update task status to processing
            task.status = TaskStatus.PROCESSING.value
            task.started_at = datetime.utcnow()
            await db.commit()

            logger.info(f"Processing task {task.id} of type {task.task_type}")

            # Process based on task type
            result_data = None
            if task.task_type == TaskType.JD_PARSING.value:
                result_data = await TaskService._process_jd_parsing(task)
            elif task.task_type == TaskType.RESUME_OPTIMIZATION.value:
                result_data = await TaskService._process_resume_optimization(task)
            elif task.task_type == TaskType.INTERVIEW_PREP.value:
                result_data = await TaskService._process_interview_prep(task)
            elif task.task_type == TaskType.MATCH_ANALYSIS.value:
                result_data = await TaskService._process_match_analysis(task)
            elif task.task_type == TaskType.RESUME_PARSING.value:
                result_data = await TaskService._process_resume_parsing(task)
            else:
                raise ValueError(f"Unknown task type: {task.task_type}")

            # Update task with results
            task.status = TaskStatus.COMPLETED.value
            task.result_data = result_data
            task.completed_at = datetime.utcnow()
            await db.commit()

            logger.info(f"Task {task.id} completed successfully")

        except Exception as e:
            logger.error(f"Task {task.id} failed: {str(e)}", exc_info=True)

            # Update task with error
            task.status = TaskStatus.FAILED.value
            task.error_message = str(e)
            task.error_details = {"error_type": type(e).__name__}
            task.completed_at = datetime.utcnow()
            await db.commit()

    @staticmethod
    async def _process_jd_parsing(task: Task) -> Dict[str, Any]:
        """Process JD parsing task."""
        content = task.input_data.get("content")
        if not content:
            raise ValueError("Missing content in input_data")

        # Try MCP client first, fallback to AI service
        try:
            result = await mcp_client.parse_jd(content)
        except MCPError:
            result = await AIService.parse_jd(content)

        # Generate embedding
        try:
            embedding = await AIService.generate_embedding(content)
            result["embedding"] = embedding
        except Exception as e:
            logger.warning(f"Failed to generate embedding for JD: {e}")

        return result

    @staticmethod
    async def _process_resume_optimization(task: Task) -> Dict[str, Any]:
        """Process resume optimization task."""
        resume_content = task.input_data.get("resume_content")
        jd_content = task.input_data.get("jd_content")
        parsed_jd = task.input_data.get("parsed_jd")

        if not resume_content or not jd_content:
            raise ValueError("Missing resume_content or jd_content in input_data")

        # Try MCP client first, fallback to AI service
        try:
            resume_data = (
                json.loads(resume_content)
                if isinstance(resume_content, str)
                else resume_content
            )
            jd_data = json.loads(parsed_jd) if isinstance(parsed_jd, str) else parsed_jd
            result = await mcp_client.optimize_resume(resume_data, jd_data)
        except (MCPError, json.JSONDecodeError):
            result = await AIService.optimize_resume(
                resume_content, jd_content, parsed_jd or {}
            )

        return result

    @staticmethod
    async def _process_interview_prep(task: Task) -> Dict[str, Any]:
        """Process interview preparation task."""
        resume_content = task.input_data.get("resume_content")
        jd_content = task.input_data.get("jd_content")

        if not resume_content or not jd_content:
            raise ValueError("Missing resume_content or jd_content in input_data")

        # Try MCP client first, fallback to AI service
        try:
            resume_data = (
                json.loads(resume_content)
                if isinstance(resume_content, str)
                else resume_content
            )
            jd_data = (
                json.loads(jd_content) if isinstance(jd_content, str) else jd_content
            )
            result = await mcp_client.generate_interview_prep(resume_data, jd_data)
        except (MCPError, json.JSONDecodeError):
            result = await AIService.generate_interview_prep(resume_content, jd_content)

        return result

    @staticmethod
    async def _process_match_analysis(task: Task) -> Dict[str, Any]:
        """Process resume-JD match analysis task."""
        resume_content = task.input_data.get("resume_content")
        jd_content = task.input_data.get("jd_content")

        if not resume_content or not jd_content:
            raise ValueError("Missing resume_content or jd_content in input_data")

        # Try MCP client first, fallback to AI service
        try:
            result = await mcp_client.match_resume_to_jd(
                (
                    json.loads(resume_content)
                    if isinstance(resume_content, str)
                    else resume_content
                ),
                json.loads(jd_content) if isinstance(jd_content, str) else jd_content,
            )
        except (MCPError, json.JSONDecodeError):
            result = await AIService.match_resume(resume_content, jd_content)

        return result

    @staticmethod
    async def _process_resume_parsing(task: Task) -> Dict[str, Any]:
        """Process resume parsing task."""
        content = task.input_data.get("content")
        if not content:
            raise ValueError("Missing content in input_data")

        # Try MCP client first, fallback to AI service
        try:
            result = await mcp_client.parse_resume(content)
        except MCPError:
            # Fallback to basic parsing
            result = {
                "raw_text": content,
                "sections": {},
                "skills": [],
                "experience": [],
            }

        # Generate embedding
        try:
            embedding = await AIService.generate_embedding(content)
            result["embedding"] = embedding
        except Exception as e:
            logger.warning(f"Failed to generate embedding for resume: {e}")

        return result

    @staticmethod
    async def get_user_tasks(
        db: AsyncSession,
        user_id: uuid.UUID,
        status: Optional[str] = None,
        task_type: Optional[str] = None,
        limit: int = 50,
    ) -> List[Task]:
        """
        Get all tasks for a user with optional filtering.

        Args:
            db: Database session
            user_id: User ID
            status: Optional status filter
            task_type: Optional task type filter
            limit: Maximum number of tasks to return

        Returns:
            List of task objects
        """
        try:
            query = select(Task).where(Task.user_id == user_id)

            if status:
                query = query.where(Task.status == status)
            if task_type:
                query = query.where(Task.task_type == task_type)

            query = query.order_by(Task.created_at.desc()).limit(limit)

            result = await db.execute(query)
            tasks = list(result.scalars().all())

            return tasks

        except Exception as e:
            logger.error(f"Failed to get user tasks: {str(e)}", exc_info=True)
            raise

    @staticmethod
    async def cleanup_old_tasks(
        db: AsyncSession, days: int = CLEANUP_OLD_TASKS_DAYS
    ) -> int:
        """
        Clean up old completed/failed tasks.

        Args:
            db: Database session
            days: Number of days after which to clean up tasks

        Returns:
            Number of tasks cleaned up
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)

            # Delete old completed/failed tasks
            from sqlalchemy import delete as sql_delete

            delete_stmt = sql_delete(Task).where(
                and_(
                    Task.completed_at < cutoff_date,
                    Task.status.in_(
                        [TaskStatus.COMPLETED.value, TaskStatus.FAILED.value]
                    ),
                )
            )

            result = await db.execute(delete_stmt)
            count = result.rowcount
            await db.commit()

            logger.info(f"Cleaned up {count} old tasks (older than {days} days)")
            return count

        except Exception as e:
            logger.error(f"Failed to cleanup old tasks: {str(e)}", exc_info=True)
            await db.rollback()
            raise

    @staticmethod
    async def get_task_stats(db: AsyncSession, user_id: uuid.UUID) -> Dict[str, Any]:
        """
        Get statistics about user's tasks.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Dictionary with task statistics
        """
        try:
            from sqlalchemy import func

            # Count tasks by status
            result = await db.execute(
                select(Task.status, func.count(Task.id))
                .where(Task.user_id == user_id)
                .group_by(Task.status)
            )
            status_counts = {row[0]: row[1] for row in result.all()}

            # Count tasks by type
            result = await db.execute(
                select(Task.task_type, func.count(Task.id))
                .where(Task.user_id == user_id)
                .group_by(Task.task_type)
            )
            type_counts = {row[0]: row[1] for row in result.all()}

            return {
                "by_status": status_counts,
                "by_type": type_counts,
                "total": sum(status_counts.values()),
            }

        except Exception as e:
            logger.error(f"Failed to get task stats: {str(e)}", exc_info=True)
            raise
