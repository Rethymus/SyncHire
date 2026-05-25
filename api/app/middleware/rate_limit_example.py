"""
Rate Limiting Usage Examples

This file demonstrates how to use the rate limiting middleware in different scenarios.
"""

from fastapi import APIRouter, Request, Depends
from app.middleware.rate_limit import (
    rate_limit,
    RateLimitType,
    create_rate_limit_dependency,
)

router = APIRouter(prefix="/examples", tags=["rate-limit-examples"])


# Example 1: Using the @rate_limit decorator
@router.get("/decorator")
@rate_limit(RateLimitType.SEARCH)
async def example_with_decorator():
    """This endpoint uses the decorator for rate limiting"""
    return {"message": "This endpoint is rate limited using the decorator"}


# Example 2: Using dependency injection
@router.get("/dependency")
async def example_with_dependency(
    _rate_limit: None = Depends(create_rate_limit_dependency(RateLimitType.UPLOAD)),
):
    """This endpoint uses dependency injection for rate limiting"""
    return {"message": "This endpoint is rate limited using dependencies"}


# Example 3: Different rate limits for different endpoints
@router.get("/search")
@rate_limit(RateLimitType.SEARCH)  # 100 requests/minute
async def search_example():
    """Search endpoint with higher rate limit"""
    return {"message": "Search endpoint - 100 requests/minute"}


@router.get("/auth")
@rate_limit(RateLimitType.AUTH)  # 10 requests/minute
async def auth_example():
    """Auth endpoint with lower rate limit"""
    return {"message": "Auth endpoint - 10 requests/minute"}


@router.get("/upload")
@rate_limit(RateLimitType.UPLOAD)  # 5 requests/minute
async def upload_example():
    """Upload endpoint with lowest rate limit"""
    return {"message": "Upload endpoint - 5 requests/minute"}


# Example 4: Custom rate limit checking in code
@router.get("/manual")
async def manual_rate_limit_check(request: Request):
    """
    This endpoint shows how to manually check rate limits
    when you need custom logic
    """
    from app.middleware.rate_limit import RateLimiter, RateLimitType

    # Get identifier
    if hasattr(request.state, "user_id") and request.state.user_id:
        identifier = f"user:{request.state.user_id}"
    else:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        identifier = f"ip:{ip}"

    # Check rate limit
    is_allowed, retry_after = await RateLimiter.check_rate_limit(
        identifier, RateLimitType.GENERAL
    )

    if not is_allowed:
        from app.core.errors import RateLimitError

        raise RateLimitError(
            message="Manual rate limit check failed", retry_after=retry_after
        )

    return {"message": "Manual rate limit check passed"}


# Example 5: Getting rate limit status
@router.get("/status")
async def get_rate_limit_status(request: Request):
    """Get current rate limit status for the requesting user/IP"""
    from app.middleware.rate_limit import RateLimiter, RateLimitType

    # Get identifier
    if hasattr(request.state, "user_id") and request.state.user_id:
        identifier = f"user:{request.state.user_id}"
    else:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        identifier = f"ip:{ip}"

    # Get status for different limit types
    search_status = await RateLimiter.get_rate_limit_status(
        identifier, RateLimitType.SEARCH
    )
    auth_status = await RateLimiter.get_rate_limit_status(
        identifier, RateLimitType.AUTH
    )
    upload_status = await RateLimiter.get_rate_limit_status(
        identifier, RateLimitType.UPLOAD
    )

    return {
        "identifier": identifier,
        "rate_limits": {
            "search": search_status,
            "auth": auth_status,
            "upload": upload_status,
        },
    }


# Example 6: Combining rate limiting with other dependencies
@router.get("/combined")
@rate_limit(RateLimitType.GENERAL)
async def combined_with_other_deps(
    request: Request,
    # You can still use other dependencies alongside rate limiting
    # current_user: User = Depends(get_current_user),
):
    """Rate limiting works alongside other FastAPI dependencies"""
    return {
        "message": "Rate limiting combined with other dependencies",
        "path": request.url.path,
    }
