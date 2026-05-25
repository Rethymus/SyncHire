"""
Comprehensive rate limiting middleware for SyncHire API

Implements Redis-based rate limiting with configurable limits per endpoint type.
Supports both user-based and IP-based limiting with graceful degradation.
"""

import logging
import time
from enum import Enum
from typing import Optional, Callable, Awaitable, Any
from functools import wraps
from fastapi import Request, status, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from app.core.redis import redis_client
from app.core.config import get_settings
from app.core.errors import RateLimitError

logger = logging.getLogger(__name__)
settings = get_settings()


class RateLimitType(Enum):
    """Rate limit categories for different endpoint types"""

    SEARCH = "search"
    AUTH = "auth"
    UPLOAD = "upload"
    GENERAL = "general"


class RateLimitConfig:
    """Configuration for rate limiting - loaded from environment variables"""

    # Default rate limits (requests per minute) - from settings
    LIMITS = {
        RateLimitType.SEARCH: settings.RATE_LIMIT_SEARCH,
        RateLimitType.AUTH: settings.RATE_LIMIT_AUTH,
        RateLimitType.UPLOAD: settings.RATE_LIMIT_UPLOAD,
        RateLimitType.GENERAL: settings.RATE_LIMIT_GENERAL,
    }

    # Time window in seconds - from settings
    WINDOW_SIZE = settings.RATE_LIMIT_WINDOW_SIZE

    # Enable/disable rate limiting - from settings
    ENABLED = settings.RATE_LIMIT_ENABLED

    # Whether to use IP-based limiting for unauthenticated requests - from settings
    USE_IP_FALLBACK = settings.RATE_LIMIT_USE_IP_FALLBACK

    # Redis key prefix
    KEY_PREFIX = "rate_limit"


class RateLimiter:
    """
    Rate limiter using Redis for distributed rate limiting.
    Supports both user-based and IP-based limiting.
    """

    @staticmethod
    def _get_redis_key(identifier: str, limit_type: RateLimitType) -> str:
        """Generate Redis key for rate limiting"""
        return f"{RateLimitConfig.KEY_PREFIX}:{limit_type.value}:{identifier}"

    @staticmethod
    def _get_identifier(request: Request, limit_type: RateLimitType) -> str:
        """
        Get identifier for rate limiting.
        Uses user ID if authenticated, falls back to IP address.
        """
        # Try to get user ID from request state (set by auth middleware)
        if hasattr(request.state, "user_id") and request.state.user_id:
            return f"user:{request.state.user_id}"

        # Fall back to IP address
        if RateLimitConfig.USE_IP_FALLBACK:
            # Get client IP, handling proxy headers
            forwarded = request.headers.get("X-Forwarded-For")
            if forwarded:
                # Take the first IP in the chain
                ip = forwarded.split(",")[0].strip()
            else:
                ip = request.client.host if request.client else "unknown"
            return f"ip:{ip}"

        # Default fallback
        return f"request:{request.url.path}"

    @staticmethod
    async def check_rate_limit(
        identifier: str,
        limit_type: RateLimitType,
        window_size: int = RateLimitConfig.WINDOW_SIZE,
    ) -> tuple[bool, Optional[int]]:
        """
        Check if the identifier has exceeded the rate limit.

        Args:
            identifier: Unique identifier (user ID or IP)
            limit_type: Type of rate limit to apply
            window_size: Time window in seconds

        Returns:
            Tuple of (is_allowed, retry_after_seconds)
            - is_allowed: True if request is allowed, False if rate limited
            - retry_after: Seconds until next request is allowed (None if allowed)
        """
        if not RateLimitConfig.ENABLED:
            return True, None

        try:
            key = RateLimiter._get_redis_key(identifier, limit_type)
            max_requests = RateLimitConfig.LIMITS.get(
                limit_type, RateLimitConfig.LIMITS[RateLimitType.GENERAL]
            )

            # Get current count
            current = await redis_client.incr(key)

            # Set expiry on first request
            if current == 1:
                await redis_client.expire(key, window_size)

            # Check if limit exceeded
            if current > max_requests:
                # Calculate retry after time
                ttl = await redis_client.redis.ttl(key)
                retry_after = max(ttl, 1)  # At least 1 second
                logger.warning(
                    f"Rate limit exceeded for {identifier} ({limit_type.value}): {current}/{max_requests}"
                )
                return False, retry_after

            logger.debug(
                f"Rate limit check passed for {identifier} ({limit_type.value}): {current}/{max_requests}"
            )
            return True, None

        except Exception as e:
            # Fail open - allow request if Redis is unavailable
            logger.error(
                f"Rate limiting error, allowing request: {str(e)}", exc_info=True
            )
            return True, None

    @staticmethod
    async def get_rate_limit_status(
        identifier: str, limit_type: RateLimitType
    ) -> dict[str, Any]:
        """
        Get current rate limit status for an identifier.

        Returns:
            Dictionary with current usage and limits
        """
        try:
            key = RateLimiter._get_redis_key(identifier, limit_type)
            current = await redis_client.get(key)
            ttl = await redis_client.redis.ttl(key) if current else 0
            max_requests = RateLimitConfig.LIMITS.get(
                limit_type, RateLimitConfig.LIMITS[RateLimitType.GENERAL]
            )

            return {
                "limit_type": limit_type.value,
                "current": int(current) if current else 0,
                "max": max_requests,
                "remaining": (
                    max(max_requests - int(current), 0) if current else max_requests
                ),
                "reset_at": int(time.time()) + ttl if ttl > 0 else None,
            }
        except Exception as e:
            logger.error(f"Error getting rate limit status: {str(e)}", exc_info=True)
            return {
                "limit_type": limit_type.value,
                "current": 0,
                "max": RateLimitConfig.LIMITS.get(
                    limit_type, RateLimitConfig.LIMITS[RateLimitType.GENERAL]
                ),
                "remaining": 0,
                "reset_at": None,
            }


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Global rate limiting middleware.
    Provides basic rate limiting for all endpoints.
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.excluded_paths = {
            "/health",
            "/",
            "/docs",
            "/redoc",
            "/openapi.json",
        }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request through rate limiting middleware"""

        # Skip rate limiting for excluded paths
        if request.url.path in self.excluded_paths:
            return await call_next(request)

        # Get identifier
        identifier = RateLimiter._get_identifier(request, RateLimitType.GENERAL)

        # Check rate limit
        is_allowed, retry_after = await RateLimiter.check_rate_limit(
            identifier, RateLimitType.GENERAL
        )

        if not is_allowed:
            # Return 429 with retry-after header
            response = JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many requests. Please try again later.",
                        "details": {
                            "retry_after": retry_after,
                        },
                    }
                },
            )
            response.headers["Retry-After"] = str(retry_after)
            response.headers["X-RateLimit-Limit"] = str(
                RateLimitConfig.LIMITS[RateLimitType.GENERAL]
            )
            response.headers["X-RateLimit-Reset"] = str(int(time.time()) + retry_after)
            return response

        # Process request
        response = await call_next(request)

        # Add rate limit headers to response
        status_info = await RateLimiter.get_rate_limit_status(
            identifier, RateLimitType.GENERAL
        )
        response.headers["X-RateLimit-Limit"] = str(status_info["max"])
        response.headers["X-RateLimit-Remaining"] = str(status_info["remaining"])
        if status_info["reset_at"]:
            response.headers["X-RateLimit-Reset"] = str(status_info["reset_at"])

        return response


def rate_limit(limit_type: RateLimitType):
    """
    Decorator for applying rate limiting to specific endpoints.

    Usage:
        @router.get("/search")
        @rate_limit(RateLimitType.SEARCH)
        async def search_endpoint(...):
            ...

    Args:
        limit_type: Type of rate limit to apply
    """

    def decorator(func: Callable[..., Awaitable[Any]]) -> Callable[..., Awaitable[Any]]:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Extract request from kwargs
            request: Optional[Request] = kwargs.get("request")

            if not request:
                # Try to get request from args
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

            if not request:
                # No request object found, skip rate limiting
                return await func(*args, **kwargs)

            # Get identifier
            identifier = RateLimiter._get_identifier(request, limit_type)

            # Check rate limit
            is_allowed, retry_after = await RateLimiter.check_rate_limit(
                identifier, limit_type
            )

            if not is_allowed:
                # Raise RateLimitError
                raise RateLimitError(
                    message=f"Rate limit exceeded for {limit_type.value} endpoint. Please try again later.",
                    retry_after=retry_after,
                )

            # Execute the original function
            try:
                response = await func(*args, **kwargs)

                # Add rate limit headers if response is a Response object
                if hasattr(response, "headers"):
                    status_info = await RateLimiter.get_rate_limit_status(
                        identifier, limit_type
                    )
                    response.headers["X-RateLimit-Limit"] = str(status_info["max"])
                    response.headers["X-RateLimit-Remaining"] = str(
                        status_info["remaining"]
                    )
                    if status_info["reset_at"]:
                        response.headers["X-RateLimit-Reset"] = str(
                            status_info["reset_at"]
                        )

                return response

            except Exception as e:
                # Log error and re-raise
                logger.error(f"Error in rate-limited endpoint: {str(e)}", exc_info=True)
                raise

        return wrapper

    return decorator


async def check_rate_limit_middleware(
    request: Request, limit_type: RateLimitType = RateLimitType.GENERAL
) -> None:
    """
    Dependency function for rate limiting in endpoints.

    Usage:
        @router.get("/endpoint")
        async def endpoint(
            request: Request,
            _rate_limit: None = Depends(check_rate_limit_middleware(RateLimitType.SEARCH))
        ):
            ...

    Args:
        request: FastAPI request object
        limit_type: Type of rate limit to apply

    Raises:
        RateLimitError: If rate limit is exceeded
    """
    identifier = RateLimiter._get_identifier(request, limit_type)
    is_allowed, retry_after = await RateLimiter.check_rate_limit(identifier, limit_type)

    if not is_allowed:
        raise RateLimitError(
            message=f"Rate limit exceeded for {limit_type.value} endpoint. Please try again later.",
            retry_after=retry_after,
        )


def create_rate_limit_dependency(limit_type: RateLimitType):
    """
    Create a rate limit dependency function for a specific limit type.

    Usage:
        @router.get("/search")
        async def search(
            _rate_limit: None = Depends(create_rate_limit_dependency(RateLimitType.SEARCH))
        ):
            ...
    """

    async def rate_limit_dependency(request: Request) -> None:
        await check_rate_limit_middleware(request, limit_type)

    return rate_limit_dependency
