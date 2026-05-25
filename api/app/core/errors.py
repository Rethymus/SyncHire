"""
Comprehensive error handling system for SyncHire API
Provides custom exceptions, error handlers, and error response formatting
"""

from typing import Any, Dict, Optional, Union
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError
import logging
import uuid

logger = logging.getLogger(__name__)


class SyncHireError(Exception):
    """Base exception for all SyncHire-specific errors"""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: str = "INTERNAL_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}
        self.error_id = str(uuid.uuid4())
        super().__init__(self.message)


class AuthenticationError(SyncHireError):
    """Authentication-related errors"""

    def __init__(
        self,
        message: str = "Authentication failed",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTHENTICATION_FAILED",
            details=details,
        )


class AuthorizationError(SyncHireError):
    """Authorization-related errors"""

    def __init__(
        self,
        message: str = "Insufficient permissions",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="AUTHORIZATION_FAILED",
            details=details,
        )


class ValidationError(SyncHireError):
    """Input validation errors"""

    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        if field:
            details = details or {}
            details["field"] = field
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="VALIDATION_ERROR",
            details=details,
        )


class NotFoundError(SyncHireError):
    """Resource not found errors"""

    def __init__(
        self,
        resource: str = "Resource",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=f"{resource} not found",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
            details=details,
        )


class ConflictError(SyncHireError):
    """Resource conflict errors (e.g., duplicate entries)"""

    def __init__(
        self,
        message: str = "Resource conflict",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT",
            details=details,
        )


class FileUploadError(SyncHireError):
    """File upload related errors"""

    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="FILE_UPLOAD_ERROR",
            details=details,
        )


class FileSizeError(FileUploadError):
    """File size validation errors"""

    def __init__(
        self,
        max_size: int,
        actual_size: int,
    ):
        super().__init__(
            message=f"File too large. Maximum size: {max_size / (1024 * 1024):.1f}MB",
            details={
                "max_size_bytes": max_size,
                "actual_size_bytes": actual_size,
                "max_size_mb": max_size / (1024 * 1024),
            },
        )


class FileTypeError(FileUploadError):
    """File type validation errors"""

    def __init__(
        self,
        allowed_types: list[str],
        actual_type: str,
    ):
        super().__init__(
            message=f"Invalid file type. Allowed types: {', '.join(allowed_types)}",
            details={
                "allowed_types": allowed_types,
                "actual_type": actual_type,
            },
        )


class DatabaseError(SyncHireError):
    """Database operation errors"""

    def __init__(
        self,
        message: str = "Database operation failed",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="DATABASE_ERROR",
            details=details,
        )


class ExternalServiceError(SyncHireError):
    """External service integration errors"""

    def __init__(
        self,
        service: str,
        message: str = "External service error",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=f"{service}: {message}",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code="EXTERNAL_SERVICE_ERROR",
            details=details,
        )


class RateLimitError(SyncHireError):
    """Rate limiting errors"""

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        details = details or {}
        if retry_after:
            details["retry_after"] = retry_after
        super().__init__(
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_EXCEEDED",
            details=details,
        )


class ErrorFormatter:
    """Format error responses consistently"""

    @staticmethod
    def format_error(
        error: SyncHireError,
        request: Optional[Request] = None,
    ) -> Dict[str, Any]:
        """Format error response with consistent structure"""
        response = {
            "error": {
                "code": error.error_code,
                "message": error.message,
                "error_id": error.error_id,
            }
        }

        # Add details if present
        if error.details:
            response["error"]["details"] = error.details

        # Add request context if available
        if request:
            response["request_context"] = {
                "method": request.method,
                "path": request.url.path,
            }

        return response

    @staticmethod
    def format_validation_error(
        error: RequestValidationError,
        request: Request,
    ) -> Dict[str, Any]:
        """Format FastAPI validation errors"""
        errors = []
        for err in error.errors():
            field_path = " -> ".join(str(loc) for loc in err["loc"])
            errors.append({
                "field": field_path,
                "message": err["msg"],
                "type": err["type"],
            })

        return {
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": {"errors": errors},
            },
            "request_context": {
                "method": request.method,
                "path": request.url.path,
            },
        }

    @staticmethod
    def format_http_error(
        error: Union[HTTPException, StarletteHTTPException],
        request: Request,
    ) -> Dict[str, Any]:
        """Format HTTP errors"""
        return {
            "error": {
                "code": error.status_code,
                "message": error.detail,
            },
            "request_context": {
                "method": request.method,
                "path": request.url.path,
            },
        }


async def synchire_error_handler(
    request: Request,
    exc: SyncHireError,
) -> JSONResponse:
    """Handle SyncHire-specific errors"""
    logger.error(
        f"SyncHire error [{exc.error_id}]: {exc.message}",
        extra={
            "error_id": exc.error_id,
            "error_code": exc.error_code,
            "status_code": exc.status_code,
            "details": exc.details,
            "path": request.url.path,
            "method": request.method,
        },
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorFormatter.format_error(exc, request),
    )


async def validation_error_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Handle FastAPI validation errors"""
    logger.warning(
        f"Validation error: {len(exc.errors())} errors",
        extra={
            "errors": exc.errors(),
            "path": request.url.path,
            "method": request.method,
        },
    )

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=ErrorFormatter.format_validation_error(exc, request),
    )


async def http_error_handler(
    request: Request,
    exc: Union[HTTPException, StarletteHTTPException],
) -> JSONResponse:
    """Handle HTTP exceptions"""
    logger.warning(
        f"HTTP error: {exc.status_code} - {exc.detail}",
        extra={
            "status_code": exc.status_code,
            "detail": exc.detail,
            "path": request.url.path,
            "method": request.method,
        },
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorFormatter.format_http_error(exc, request),
    )


async def general_error_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    """Handle all other exceptions"""
    error_id = str(uuid.uuid4())

    # Log the full error with traceback
    logger.error(
        f"Unhandled exception [{error_id}]: {str(exc)}",
        exc_info=True,
        extra={
            "error_id": error_id,
            "exception_type": type(exc).__name__,
            "path": request.url.path,
            "method": request.method,
        },
    )

    # Return generic error message to avoid leaking sensitive information
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred. Please try again later.",
                "error_id": error_id,
            },
            "request_context": {
                "method": request.method,
                "path": request.url.path,
            },
        },
    )


def handle_database_error(error: Exception, operation: str = "database operation") -> None:
    """
    Handle database errors with proper logging and user-friendly messages
    Raises appropriate SyncHireError based on the database error type
    """
    error_id = str(uuid.uuid4())

    if isinstance(error, IntegrityError):
        logger.error(
            f"Database integrity error [{error_id}] in {operation}",
            exc_info=True,
            extra={"error_id": error_id, "operation": operation},
        )
        raise ValidationError(
            message="Data integrity constraint violated",
            details={"error_id": error_id},
        )

    elif isinstance(error, OperationalError):
        logger.error(
            f"Database operational error [{error_id}] in {operation}",
            exc_info=True,
            extra={"error_id": error_id, "operation": operation},
        )
        raise DatabaseError(
            message="Database operation failed. Please try again.",
            details={"error_id": error_id},
        )

    elif isinstance(error, SQLAlchemyError):
        logger.error(
            f"Database error [{error_id}] in {operation}",
            exc_info=True,
            extra={"error_id": error_id, "operation": operation},
        )
        raise DatabaseError(
            message="Database error occurred",
            details={"error_id": error_id},
        )

    else:
        logger.error(
            f"Unexpected database error [{error_id}] in {operation}",
            exc_info=True,
            extra={"error_id": error_id, "operation": operation},
        )
        raise DatabaseError(
            message="Unexpected database error",
            details={"error_id": error_id},
        )


async def handle_async_operation(
    operation: str,
    error_message: str = "Operation failed",
):
    """
    Context manager for handling async operations with proper error handling
    Usage:
        async with handle_async_operation("user registration"):
            result = await some_async_function()
    """
    # This would be implemented as an async context manager
    # For now, it's a placeholder for future implementation
    pass
