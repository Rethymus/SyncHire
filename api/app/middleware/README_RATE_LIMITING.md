# Rate Limiting Middleware

## Overview

The SyncHire API implements a comprehensive Redis-based rate limiting system to prevent abuse and ensure fair resource allocation. The system supports both user-based and IP-based limiting with configurable limits per endpoint type.

## Features

- **Redis-based**: Distributed rate limiting using Redis for scalability
- **User-based limiting**: Rate limit by user ID when authenticated
- **IP-based limiting**: Fall back to IP address for unauthenticated requests
- **Configurable limits**: Different limits for different endpoint types
- **Graceful degradation**: System fails open if Redis is unavailable
- **Standard headers**: Returns `Retry-After`, `X-RateLimit-*` headers
- **Easy integration**: Simple decorator and dependency injection patterns

## Configuration

Rate limiting is configured via environment variables in `app/core/config.py`:

```python
# Enable/disable rate limiting
RATE_LIMIT_ENABLED: bool = True

# Rate limits by endpoint type (requests per minute)
RATE_LIMIT_SEARCH: int = 100    # Search endpoints
RATE_LIMIT_AUTH: int = 10       # Authentication endpoints
RATE_LIMIT_UPLOAD: int = 5      # File upload endpoints
RATE_LIMIT_GENERAL: int = 60    # General API endpoints

# Time window size (seconds)
RATE_LIMIT_WINDOW_SIZE: int = 60

# Use IP fallback for unauthenticated requests
RATE_LIMIT_USE_IP_FALLBACK: bool = True
```

## Usage

### 1. Using the Decorator (Recommended)

The simplest way to add rate limiting to an endpoint:

```python
from fastapi import APIRouter
from app.middleware.rate_limit import rate_limit, RateLimitType

router = APIRouter()

@router.get("/search")
@rate_limit(RateLimitType.SEARCH)
async def search_endpoint():
    return {"results": []}
```

### 2. Using Dependency Injection

Alternative approach using FastAPI dependencies:

```python
from fastapi import APIRouter, Depends
from app.middleware.rate_limit import create_rate_limit_dependency, RateLimitType

router = APIRouter()

@router.get("/upload")
async def upload_endpoint(
    _rate_limit: None = Depends(create_rate_limit_dependency(RateLimitType.UPLOAD))
):
    return {"status": "uploaded"}
```

### 3. Manual Rate Limit Checking

For custom logic, you can check rate limits manually:

```python
from app.middleware.rate_limit import RateLimiter, RateLimitType

async def custom_endpoint(request: Request):
    # Get identifier
    if hasattr(request.state, 'user_id') and request.state.user_id:
        identifier = f"user:{request.state.user_id}"
    else:
        identifier = f"ip:{request.client.host}"

    # Check rate limit
    is_allowed, retry_after = await RateLimiter.check_rate_limit(
        identifier, RateLimitType.GENERAL
    )

    if not is_allowed:
        raise RateLimitError(
            message="Rate limit exceeded",
            retry_after=retry_after
        )

    # Your endpoint logic here
    return {"status": "success"}
```

## Rate Limit Types

| Type | Default Limit | Use Case |
|------|---------------|----------|
| `SEARCH` | 100 req/min | Search endpoints, semantic search |
| `AUTH` | 10 req/min | Login, registration, token refresh |
| `UPLOAD` | 5 req/min | File uploads (resumes, JDs) |
| `GENERAL` | 60 req/min | General API endpoints |

## Response Headers

When rate limiting is active, the API includes these headers:

- `X-RateLimit-Limit`: Maximum requests allowed in the window
- `X-RateLimit-Remaining`: Remaining requests in the current window
- `X-RateLimit-Reset`: Unix timestamp when the window resets
- `Retry-After`: Seconds until retry is allowed (on 429 responses)

## Error Responses

When rate limit is exceeded, the API returns:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retry_after": 45
    }
  }
}
```

HTTP Status: `429 Too Many Requests`

## Applied Endpoints

### Search Endpoints (100 req/min)
- `/api/search/resumes`
- `/api/search/jds`
- `/api/search/applications`
- `/api/search/match/{resume_id}/{jd_id}`
- `/api/search/suggestions`

### Authentication Endpoints (10 req/min)
- `/api/auth/register`
- `/api/auth/login`

### Upload Endpoints (5 req/min)
- `/api/resumes` (POST)
- `/api/jds/upload`

### General API (60 req/min)
- All other endpoints via global middleware

## Testing

You can test rate limiting using the example endpoints:

```bash
# Test search rate limiting
curl -X GET http://localhost:8000/api/search/resumes?q=test

# Check rate limit status
curl -X GET http://localhost:8000/examples/status

# Test with authentication
curl -X GET http://localhost:8000/api/search/resumes?q=test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Monitoring

Rate limiting is logged at the warning level when limits are exceeded:

```python
logger.warning(
    f"Rate limit exceeded for {identifier} ({limit_type.value}): "
    f"{current}/{max_requests}"
)
```

Monitor logs for patterns that might indicate:
- Bot attacks
- API abuse
- Legitimate users hitting limits
- Need for limit adjustments

## Best Practices

1. **Choose appropriate limits**: Base limits on actual usage patterns and system capacity
2. **Monitor and adjust**: Review logs regularly and adjust limits as needed
3. **Communicate with users**: Document rate limits in API documentation
4. **Use proper HTTP headers**: Clients should respect `Retry-After` headers
5. **Graceful degradation**: System fails open if Redis is unavailable

## Security Considerations

1. **IP-based limiting**: Can be circumvented with proxies, but provides basic protection
2. **User-based limiting**: More effective for authenticated users
3. **Redis security**: Ensure Redis is properly secured and not exposed publicly
4. **Distributed systems**: Redis sharing across multiple API instances works correctly

## Troubleshooting

### Rate limiting not working

1. Check Redis connection: `await redis_client.is_connected()`
2. Verify rate limiting is enabled: `settings.RATE_LIMIT_ENABLED`
3. Check middleware is registered in `main.py`
4. Review logs for errors

### Limits too restrictive

1. Monitor actual usage patterns
2. Adjust limits in configuration
3. Consider per-user limits for premium tiers
4. Implement burst allowance for legitimate spikes

### Redis performance issues

1. Use Redis connection pooling
2. Monitor Redis memory usage
3. Consider TTL optimization
4. Use Redis clustering for high traffic

## Future Enhancements

- Per-user rate limits (e.g., premium users get higher limits)
- Burst allowance for short-term spikes
- Rate limit analytics dashboard
- Automatic limit adjustment based on load
- Sliding window rate limiting for smoother limits
- GraphQL cost-based rate limiting

## Files

- `app/middleware/rate_limit.py` - Core rate limiting implementation
- `app/core/config.py` - Configuration settings
- `app/core/redis.py` - Redis client
- `main.py` - Middleware registration
- `app/middleware/rate_limit_example.py` - Usage examples
