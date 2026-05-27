# Error Handling Documentation

## Overview

SyncHire implements a comprehensive error handling system across both frontend and backend to provide excellent user experience and facilitate debugging.

## Architecture

### Frontend Error Handling

#### 1. Error Classification System

```typescript
enum ErrorType {
  NETWORK = "NETWORK_ERROR",      // Network connectivity issues
  VALIDATION = "VALIDATION_ERROR", // Input validation failures
  AUTH = "AUTH_ERROR",            // Authentication/authorization issues
  NOT_FOUND = "NOT_FOUND",        // Resource not found (404)
  SERVER = "SERVER_ERROR",        // Server-side errors (5xx)
  UNKNOWN = "UNKNOWN_ERROR",      // Unexpected errors
}

enum ErrorSeverity {
  LOW = "low",                    // Informational, can be ignored
  MEDIUM = "medium",              // User should be notified
  HIGH = "high",                  // Requires user attention
  CRITICAL = "critical",          // System-wide issue
}
```

#### 2. Error Handling Components

- **Global Error Boundary**: Catches React component errors
- **Enhanced API Client**: Handles HTTP errors with retry logic
- **Circuit Breaker**: Prevents cascading failures
- **Error Recovery System**: Provides user-friendly recovery options
- **React Query Integration**: Automatic error handling for data fetching

#### 3. Error Flow

```
User Action → API Request → Circuit Breaker → Retry Logic → Error Handler → User Notification
```

### Backend Error Handling

#### 1. Custom Exception Classes

```python
class SyncHireError(Exception):
    """Base exception for all SyncHire-specific errors"""

class AuthenticationError(SyncHireError):
    """Authentication-related errors (401)"""

class AuthorizationError(SyncHireError):
    """Authorization-related errors (403)"""

class ValidationError(SyncHireError):
    """Input validation errors (400)"""

class NotFoundError(SyncHireError):
    """Resource not found errors (404)"""

class DatabaseError(SyncHireError):
    """Database operation errors (500)"""

class ExternalServiceError(SyncHireError):
    """External service integration errors (503)"""

class RateLimitError(SyncHireError):
    """Rate limiting errors (429)"""
```

#### 2. Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly error message",
    "error_id": "unique-error-id",
    "details": {
      "field": "email",
      "issue": "invalid format"
    }
  },
  "request_context": {
    "method": "POST",
    "path": "/api/auth/login"
  }
}
```

## Usage Examples

### Frontend

#### 1. Using the Enhanced API Client

```typescript
import { enhancedAPIClient, handleAPIResponse } from '@/lib/api-client-enhanced';

// Simple GET request
const response = await enhancedAPIClient.get<UserInfo>('/auth/me');

if (response.error) {
  const errorDetails = enhancedAPIClient.getErrorDetails(response);
  console.error('Error:', errorDetails?.userMessage);
} else {
  console.log('User:', response.data);
}

// Using handleAPIResponse for cleaner code
const user = handleAPIResponse(response, {
  onSuccess: (data) => console.log('User:', data),
  onError: (errorDetails) => console.error('Error:', errorDetails.userMessage),
  throwOnError: true,
});
```

#### 2. Using React Query with Error Handling

```typescript
import { useEnhancedQuery, useEnhancedMutation } from '@/lib/react-query-error-handling';

// Query with error handling
function UserProfile() {
  const { data, error, isLoading } = useEnhancedQuery(
    ['user', 'profile'],
    () => enhancedAPIClient.get<UserProfile>('/auth/me'),
    {
      onError: (appError) => {
        toast.error(appError.message);
      },
      onSuccess: (data) => {
        console.log('User loaded:', data);
      }
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <div>Welcome {data.name}</div>;
}

// Mutation with error handling
function LoginForm() {
  const login = useEnhancedMutation(
    (credentials) => enhancedAPIClient.post('/auth/login', credentials),
    {
      onSuccess: (data) => {
        toast.success('Login successful');
        // Redirect to dashboard
      },
      onError: (appError) => {
        if (appError.type === ErrorType.AUTH) {
          toast.error('Invalid email or password');
        } else {
          toast.error('Login failed. Please try again.');
        }
      }
    }
  );

  return <form onSubmit={(e) => {
    e.preventDefault();
    login.mutate(credentials);
  }}>
    {/* Form fields */}
  </form>;
}
```

#### 3. Using the Error Boundary

```typescript
import { ErrorBoundary } from '@/components/error-boundary';

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Error caught:', error);
        // Send error to monitoring service
      }}
    >
      <YourAppComponents />
    </ErrorBoundary>
  );
}
```

#### 4. Using Error Recovery Strategies

```typescript
import { ErrorRecoveryStrategies } from '@/lib/error-recovery';

const handleError = (error: AppError) => {
  const strategy = ErrorRecoveryStrategies.getStrategy(error);

  // Show user-friendly message
  alert(strategy.userMessage);

  // Show suggested actions
  console.log('Suggested actions:', strategy.context.suggestedActions);

  // Execute recovery action
  if (strategy.actions.length > 0) {
    strategy.actions[0].action(); // Execute primary action
  }
};
```

### Backend

#### 1. Raising Custom Errors

```python
from app.core.errors import (
    ValidationError,
    AuthenticationError,
    NotFoundError,
    DatabaseError
)

@router.post("/auth/register")
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Validate input
    if not user_data.email or not user_data.email.strip():
        raise ValidationError(
            message="Email is required",
            field="email"
        )

    # Check if user exists
    existing_user = await auth_service.get_user_by_email(db, user_data.email)
    if existing_user:
        raise ValidationError(
            message="Email already registered",
            field="email"
        )

    # Create user
    try:
        user = await auth_service.create_user(db, user_data)
        return user
    except IntegrityError as e:
        handle_database_error(e, "user registration")
```

#### 2. Handling Database Errors

```python
from sqlalchemy.exc import IntegrityError, OperationalError
from app.core.errors import handle_database_error, ValidationError

@router.post("/resumes")
async def create_resume(resume_data: ResumeCreate, db: AsyncSession = Depends(get_db)):
    try:
        resume = await resume_service.create(db, resume_data)
        return resume
    except IntegrityError as e:
        # Handle unique constraint violations
        handle_database_error(e, "resume creation")
    except OperationalError as e:
        # Handle connection issues
        handle_database_error(e, "resume creation")
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to create resume"
        )
```

#### 3. Using Error Tracking Middleware

```python
from app.middleware.error_tracking import (
    get_request_id,
    get_request_context,
    set_user_id
)

@router.get("/users/{user_id}")
async def get_user(user_id: str, request: Request):
    # Set user context for error tracking
    set_user_id(user_id)

    try:
        user = await user_service.get_by_id(user_id)
        if not user:
            raise NotFoundError(resource="User", details={"user_id": user_id})
        return user
    except Exception as e:
        # Get request context for logging
        context = get_request_context()
        logger.error(f"Error fetching user: {str(e)}", extra=context)
        raise
```

## Error Recovery Strategies

### Frontend Recovery Options

1. **Automatic Retry**: For transient errors (network issues, 5xx errors)
2. **Circuit Breaker**: Prevents overwhelming failing services
3. **User Notification**: Clear error messages with actionable steps
4. **Graceful Degradation**: Fallback to cached data or alternative UI
5. **Error Boundaries**: Isolate component errors

### Backend Recovery Options

1. **Database Retry**: For transient database issues
2. **Service Fallback**: Graceful degradation when external services fail
3. **Rate Limiting**: Prevent overwhelming the system
4. **Circuit Breaker**: Stop calling failing services
5. **Graceful Shutdown**: Clean up resources properly

## Monitoring and Logging

### Frontend Logging

```typescript
import { logger, LogCategory } from '@/lib/logger';
import { ErrorLogger } from '@/lib/error-handler';

// Log errors
ErrorLogger.log(appError);

// Log with context
logger.error(
  LogCategory.API,
  'Operation failed',
  error,
  { userId: '123', action: 'login' }
);
```

### Backend Logging

```python
import logging

logger = logging.getLogger(__name__)

# Log error with context
logger.error(
    f"User registration failed: {str(e)}",
    exc_info=True,
    extra={
        "error_id": error_id,
        "user_email": user_data.email,
        "request_id": get_request_id()
    }
)
```

## Error Codes Reference

| Code | Status | Description | Recovery |
|------|--------|-------------|----------|
| `AUTHENTICATION_FAILED` | 401 | Invalid credentials | Re-login |
| `AUTHORIZATION_FAILED` | 403 | Insufficient permissions | Contact admin |
| `VALIDATION_ERROR` | 400 | Invalid input | Fix input |
| `NOT_FOUND` | 404 | Resource missing | Check URL |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Wait and retry |
| `DATABASE_ERROR` | 500 | Database issue | Retry later |
| `EXTERNAL_SERVICE_ERROR` | 503 | Third-party service down | Retry later |
| `FILE_UPLOAD_ERROR` | 400 | Invalid file | Check file |
| `INTERNAL_ERROR` | 500 | Unexpected error | Contact support |

## Best Practices

### Frontend

1. **Always handle errors** in async operations
2. **Use type-safe error handling** with proper TypeScript types
3. **Provide user-friendly messages** without technical jargon
4. **Log errors for debugging** but don't expose sensitive data
5. **Implement retry logic** for transient failures
6. **Use error boundaries** to isolate component failures

### Backend

1. **Use custom exceptions** for different error types
2. **Never expose stack traces** to clients
3. **Include correlation IDs** for error tracking
4. **Log errors with context** for debugging
5. **Implement rate limiting** to prevent abuse
6. **Use circuit breakers** for external services
7. **Handle database errors** gracefully

## Testing Error Handling

### Frontend Tests

```typescript
describe('Error Handling', () => {
  it('should handle API errors', async () => {
    // Mock API error response
    const { result } = renderHook(() => useEnhancedQuery(
      ['test'],
      () => Promise.reject(new Error('API Error'))
    ));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.error.message).toBe('API Error');
    });
  });
});
```

### Backend Tests

```python
def test_validation_error(client):
    """Test validation error handling"""
    response = client.post("/auth/register", json={
        "email": "",  # Invalid email
        "password": "test"
    })

    assert response.status_code == 400
    assert "error" in response.json()
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"

def test_not_found_error(client, db):
    """Test not found error handling"""
    response = client.get("/users/nonexistent-id")

    assert response.status_code == 404
    assert "error" in response.json()
    assert response.json()["error"]["code"] == "NOT_FOUND"
```

## Troubleshooting

### Common Issues

1. **Circuit Breaker Always Open**
   - Check service health
   - Review failure threshold
   - Monitor error rates

2. **High Error Rates**
   - Check database connectivity
   - Review external service status
   - Monitor system resources

3. **User-Facing Errors**
   - Verify error messages are clear
   - Check recovery actions work
   - Test error boundary behavior

## Maintenance

### Regular Tasks

1. **Review error logs** for patterns
2. **Update error messages** for clarity
3. **Adjust circuit breaker thresholds**
4. **Test error recovery strategies**
5. **Monitor error rates** and performance

### Alerts

Set up alerts for:
- High error rates (>5%)
- Circuit breaker openings
- Slow database queries
- External service failures
- Authentication failures

## Further Reading

- [React Query Error Handling](https://tanstack.com/query/latest/docs/react/guides/error-handling)
- [Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [FastAPI Exception Handling](https://fastapi.tiangolo.com/tutorial/handling-errors/)
