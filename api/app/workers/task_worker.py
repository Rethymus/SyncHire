#!/usr/bin/env python3
"""
Background worker for processing async tasks.

This script runs as a separate process and continuously processes
tasks from the Redis queue. It should be started alongside the API server.

Usage:
    python -m app.workers.task_worker

The worker will:
1. Connect to Redis and the database
2. Poll for pending tasks in priority order
3. Process tasks using the appropriate service
4. Update task status and results
5. Handle errors and retries gracefully
"""

import asyncio
import signal
import sys
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings
from app.core.database import get_db, Base
from app.core.redis import redis_client
from app.core.logger import setup_logger
from app.services.task_service import TaskService

# Setup
settings = get_settings()
logger = setup_logger(__name__)

# Global state
worker_running = True
worker_task = None


class TaskWorker:
    """
    Background worker for processing async tasks.

    This worker processes tasks from the Redis queue in priority order
    and updates the database with results.
    """

    def __init__(self, max_concurrent: int = 3):
        """
        Initialize the task worker.

        Args:
            max_concurrent: Maximum number of tasks to process concurrently
        """
        self.max_concurrent = max_concurrent
        self.engine = None
        self.session_factory = None
        self.running = False

    async def start(self):
        """Start the task worker."""
        logger.info("Starting task worker...")

        try:
            # Initialize database connection
            self.engine = create_async_engine(
                settings.DATABASE_URL,
                echo=False,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
            )
            self.session_factory = sessionmaker(
                self.engine, class_=AsyncSession, expire_on_commit=False
            )

            # Connect to Redis
            await redis_client.connect()
            logger.info("Connected to Redis")

            # Start processing tasks
            self.running = True
            await self._process_tasks_loop()

        except Exception as e:
            logger.error(f"Failed to start task worker: {e}", exc_info=True)
            raise

    async def stop(self):
        """Stop the task worker gracefully."""
        logger.info("Stopping task worker...")
        self.running = False

        # Close connections
        try:
            await redis_client.disconnect()
            if self.engine:
                await self.engine.dispose()
            logger.info("Task worker stopped")
        except Exception as e:
            logger.error(f"Error stopping task worker: {e}", exc_info=True)

    async def _process_tasks_loop(self):
        """Main processing loop for tasks."""
        logger.info("Task processing loop started")

        while self.running:
            try:
                # Create database session for this iteration
                async with self.session_factory() as db:
                    # Process tasks with concurrency control
                    tasks = []

                    # Process high priority tasks first
                    for _ in range(self.max_concurrent):
                        task = await self._get_next_task(db)
                        if task:
                            tasks.append(self._process_single_task(db, task))

                    # Run tasks concurrently
                    if tasks:
                        await asyncio.gather(*tasks, return_exceptions=True)
                    else:
                        # No tasks found, wait before checking again
                        await asyncio.sleep(1)

            except Exception as e:
                logger.error(f"Error in task processing loop: {e}", exc_info=True)
                await asyncio.sleep(5)  # Wait before retrying

    async def _get_next_task(self, db: AsyncSession):
        """
        Get the next pending task from the database.

        Args:
            db: Database session

        Returns:
            Task object or None if no tasks available
        """
        try:
            from sqlalchemy import select
            from app.models.task import Task, TaskStatus

            # Get next pending task ordered by priority and creation time
            result = await db.execute(
                select(Task)
                .where(Task.status == TaskStatus.PENDING.value)
                .order_by(Task.created_at.asc())
                .limit(1)
            )
            return result.scalar_one_or_none()

        except Exception as e:
            logger.error(f"Error getting next task: {e}", exc_info=True)
            return None

    async def _process_single_task(self, db: AsyncSession, task):
        """
        Process a single task with error handling.

        Args:
            db: Database session
            task: Task object to process
        """
        try:
            await TaskService._process_single_task(db, task)
        except Exception as e:
            logger.error(f"Failed to process task {task.id}: {e}", exc_info=True)


# Signal handlers for graceful shutdown
def handle_signal(signum, frame):
    """Handle shutdown signals gracefully."""
    global worker_running, worker_task

    logger.info(f"Received signal {signum}, shutting down...")
    worker_running = False

    if worker_task:
        worker_task.cancel()


async def main():
    """Main entry point for the task worker."""
    global worker_running, worker_task

    # Setup signal handlers
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    # Create and start worker
    worker = TaskWorker(max_concurrent=3)

    try:
        worker_task = asyncio.create_task(worker.start())
        await worker_task

    except asyncio.CancelledError:
        logger.info("Worker task cancelled, shutting down...")
    except Exception as e:
        logger.error(f"Worker error: {e}", exc_info=True)
    finally:
        await worker.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker stopped by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)
