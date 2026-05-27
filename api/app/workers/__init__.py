"""
Background workers for async task processing.

This package contains worker processes that handle long-running
tasks in the background to keep the API responsive.
"""

from app.workers.task_worker import TaskWorker

__all__ = ["TaskWorker"]
