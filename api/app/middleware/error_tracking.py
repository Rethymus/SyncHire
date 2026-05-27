"""
Error Tracking Middleware
Provides comprehensive error tracking, correlation, and monitoring
"""

from typing import Callable, Dict, Any, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import time
import uuid
import logging
from contextvars import ContextVar

from app.core.errors import SyncHireError

logger = logging.getLogger(__name__)

# Context variables for request tracking
request_id_var: ContextVar[str] = ContextVar("request_id", default="")
user_id_var: ContextVar[Optional[str]] = ContextVar("user_id", default=None)
error_count_var: ContextVar[int] = ContextVar("error_count", default=0)


class ErrorTrackingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for tracking errors and correlating them with requests
    """

    def __init__(
        self,
        app: ASGIApp,
        enable_detailed_logging: bool = True,
        log_errors: bool = True,
        track_performance: bool = True,
    ):
        super().__init__(app)
        self.enable_detailed_logging = enable_detailed_logging
        self.log_errors = log_errors
        self.track_performance = track_performance

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request_id_var.set(request_id)

        # Extract user ID if available
        user_id = getattr(request.state, "user_id", None)
        if user_id:
            user_id_var.set(user_id)

        # Initialize error count
        error_count_var.set(0)

        # Track start time
        start_time = time.time()

        # Add request ID to request state for access in endpoints
        request.state.request_id = request_id

        # Log request start
        if self.enable_detailed_logging:
            logger.info(
                f"Request started: {request.method} {request.url.path}",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "user_agent": request.headers.get("user-agent"),
                    "client_host": request.client.host if request.client else None,
                },
            )

        try:
            # Process request
            response = await call_next(request)

            # Calculate processing time
            processing_time = time.time() - start_time

            # Add custom headers
            response.headers["X-Request-ID"] = request_id
            if self.track_performance:
                response.headers["X-Processing-Time"] = str(processing_time)

            # Log successful request
            if self.enable_detailed_logging:
                logger.info(
                    f"Request completed: {request.method} {request.url.path} - {response.status_code}",
                    extra={
                        "request_id": request_id,
                        "method": request.method,
                        "path": request.url.path,
                        "status_code": response.status_code,
                        "processing_time": processing_time,
                        "error_count": error_count_var.get(),
                    },
                )

            return response

        except Exception as exc:
            # Calculate processing time
            processing_time = time.time() - start_time

            # Increment error count
            current_error_count = error_count_var.get()
            error_count_var.set(current_error_count + 1)

            # Log the error with full context
            if self.log_errors:
                self.log_error_with_context(request, exc, request_id, processing_time)

            # Re-raise the exception for error handlers to process
            raise

    def log_error_with_context(
        self,
        request: Request,
        exc: Exception,
        request_id: str,
        processing_time: float,
    ):
        """Log error with comprehensive context"""

        error_context = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "query_params": str(request.query_params),
            "user_agent": request.headers.get("user-agent"),
            "client_host": request.client.host if request.client else None,
            "processing_time": processing_time,
            "error_count": error_count_var.get(),
        }

        # Add user context if available
        if user_id_var.get():
            error_context["user_id"] = user_id_var.get()

        # Add error-specific context
        if isinstance(exc, SyncHireError):
            error_context.update(
                {
                    "error_code": exc.error_code,
                    "status_code": exc.status_code,
                    "error_details": exc.details,
                }
            )
        else:
            error_context.update(
                {
                    "exception_type": type(exc).__name__,
                    "exception_message": str(exc),
                }
            )

        # Log with appropriate level
        if isinstance(exc, SyncHireError):
            if exc.status_code >= 500:
                logger.error(
                    f"SyncHire error: {exc.message}",
                    exc_info=True,
                    extra=error_context,
                )
            else:
                logger.warning(
                    f"SyncHire error: {exc.message}",
                    extra=error_context,
                )
        else:
            logger.error(
                f"Unhandled exception: {str(exc)}",
                exc_info=True,
                extra=error_context,
            )


class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """
    Middleware for monitoring API performance and detecting issues
    """

    def __init__(
        self,
        app: ASGIApp,
        slow_request_threshold: float = 5.0,  # seconds
        very_slow_request_threshold: float = 10.0,  # seconds
    ):
        super().__init__(app)
        self.slow_request_threshold = slow_request_threshold
        self.very_slow_request_threshold = very_slow_request_threshold

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()

        try:
            response = await call_next(request)
            processing_time = time.time() - start_time

            # Log slow requests
            if processing_time >= self.very_slow_request_threshold:
                logger.critical(
                    f"Very slow request detected: {request.method} {request.url.path} - {processing_time:.2f}s",
                    extra={
                        "request_id": getattr(request.state, "request_id", "unknown"),
                        "method": request.method,
                        "path": request.url.path,
                        "processing_time": processing_time,
                        "alert_type": "very_slow_request",
                    },
                )
            elif processing_time >= self.slow_request_threshold:
                logger.warning(
                    f"Slow request detected: {request.method} {request.url.path} - {processing_time:.2f}s",
                    extra={
                        "request_id": getattr(request.state, "request_id", "unknown"),
                        "method": request.method,
                        "path": request.url.path,
                        "processing_time": processing_time,
                        "alert_type": "slow_request",
                    },
                )

            # Add performance header
            response.headers["X-Processing-Time"] = f"{processing_time:.3f}"

            return response

        except Exception as exc:
            processing_time = time.time() - start_time
            logger.error(
                f"Request failed after {processing_time:.2f}s: {request.method} {request.url.path}",
                extra={
                    "request_id": getattr(request.state, "request_id", "unknown"),
                    "method": request.method,
                    "path": request.url.path,
                    "processing_time": processing_time,
                },
                exc_info=True,
            )
            raise


class ErrorRateLimitingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for tracking error rates and detecting anomalies
    """

    def __init__(
        self,
        app: ASGIApp,
        error_threshold: int = 100,  # errors per minute
        window_seconds: int = 60,
    ):
        super().__init__(app)
        self.error_threshold = error_threshold
        self.window_seconds = window_seconds
        self.error_history: Dict[str, list] = {}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            request_id = getattr(request.state, "request_id", "unknown")

            # Track error
            self.track_error(request_id, exc)

            # Check error rate
            error_rate = self.get_error_rate()
            if error_rate >= self.error_threshold:
                logger.critical(
                    f"High error rate detected: {error_rate} errors in {self.window_seconds}s",
                    extra={
                        "alert_type": "high_error_rate",
                        "error_rate": error_rate,
                        "threshold": self.error_threshold,
                    },
                )

            raise

    def track_error(self, request_id: str, exc: Exception):
        """Track an error occurrence"""
        timestamp = time.time()
        error_type = type(exc).__name__

        if error_type not in self.error_history:
            self.error_history[error_type] = []

        self.error_history[error_type].append(timestamp)

        # Clean old errors outside the window
        cutoff_time = timestamp - self.window_seconds
        self.error_history[error_type] = [
            t for t in self.error_history[error_type] if t > cutoff_time
        ]

    def get_error_rate(self) -> int:
        """Get total error count in the current window"""
        total_errors = sum(len(errors) for errors in self.error_history.values())
        return total_errors


def get_request_context() -> Dict[str, Any]:
    """
    Get current request context for error logging
    """
    return {
        "request_id": request_id_var.get(),
        "user_id": user_id_var.get(),
        "error_count": error_count_var.get(),
    }


def get_request_id() -> str:
    """
    Get current request ID
    """
    return request_id_var.get()


def set_user_id(user_id: str):
    """
    Set user ID for current request
    """
    user_id_var.set(user_id)


def increment_error_count():
    """
    Increment error counter for current request
    """
    current_count = error_count_var.get()
    error_count_var.set(current_count + 1)
