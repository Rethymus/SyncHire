# Error Handling Quick Reference Guide

## Frontend Quick Reference

### 1. Enhanced API Client

```typescript
import { enhancedAPIClient } from '@/lib/api-client-enhanced';

// Basic usage
const response = await enhancedAPIClient.get<UserInfo>('/auth/me');
if (response.error) {
  console.error('Error:', response.error.message);
} else {
  console.log('Data:', response.data);
}

// With error details
const errorDetails = enhancedAPIClient.getErrorDetails(response);
if (errorDetails?.retryable) {
  // Retry the request
}

// File upload with progress
await enhancedAPIClient.uploadFile('/upload', file, (progress) => {
  console.log(`Upload: ${progress}%`);
});
```

### 2. React Query Hooks

```typescript
import { useEnhancedQuery, useEnhancedMutation } from '@/lib/react-query-error-handling';

// Query with error handling
function UserProfile() {
  const { data, error, isLoading } = useEnhancedQuery(
    ['user', 'profile'],
    () => enhancedAPIClient.get('/auth/me'),
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
      },
      onError: (appError) => {
        if (appError.type === ErrorType.AUTH) {
          toast.error('Invalid credentials');
        } else {
          toast.error('Login failed');
        }
      }
    }
  );

  return <button onClick={() => login.mutate(credentials)}>Login</button>;
}
```

### 3. Error Handler

```typescript
import { ErrorHandler, ErrorType, ErrorSeverity } from '@/lib/error-handler';

// Handle errors
const appError = ErrorHandler.handleApiError(error);

// Check error type
if (appError.type === ErrorType.AUTH) {
  // Redirect to login
}

// Check severity
if (appError.severity === ErrorSeverity.CRITICAL) {
  // Show critical error UI
}

// Create custom errors
const customError = ErrorHandler.createError(
  ErrorType.VALIDATION,
  'Email is required',
  ErrorSeverity.LOW,
  { field: 'email' }
);
```

### 4. Circuit Breaker

```typescript
import { circuitBreakers, circuitBreakerRegistry } from '@/lib/circuit-breaker';

// Check circuit status
const stats = circuitBreakers.api.getStats();
if (stats.state === CircuitState.OPEN) {
  console.log('API circuit is open');
}

// Get all circuit breaker stats
const allStats = circuitBreakerRegistry.getAllStats();

// Reset circuit breaker (for testing)
circuitBreakers.api.reset();
```

### 5. Error Recovery

```typescript
import { ErrorRecoveryStrategies } from '@/lib/error-recovery';

// Get recovery strategy for error
const strategy = ErrorRecoveryStrategies.getStrategy(appError);

// Show user message
alert(strategy.userMessage);

// Show suggested actions
strategy.context.suggestedActions.forEach(action => {
  console.log('Action:', action);
});

// Execute recovery action
if (strategy.actions.length > 0) {
  strategy.actions[0].action(); // Execute primary action
}
```

## Backend Quick Reference

### 1. Custom Exceptions

```python
from app.core.errors import (
    ValidationError,
    AuthenticationError,
    NotFoundError,
    DatabaseError
)

# Validation error
if not user_data.email:
    raise ValidationError(
        message="Email is required",
        field="email"
    )

# Authentication error
if not user.is_active:
    raise AuthenticationError(
        message="User account is disabled",
        details={"user_id": str(user.id)}
    )

# Not found error
if not user:
    raise NotFoundError(
        resource="User",
        details={"user_id": user_id}
    )

# Database error
try:
    user = await create_user(db, user_data)
except IntegrityError as e:
    handle_database_error(e, "user creation")
```

### 2. Error Tracking

```python
from app.middleware.error_tracking import (
    get_request_id,
    get_request_context,
    set_user_id
)

# Set user context
@app.get("/api/users/{user_id}")
async def get_user(user_id: str, request: Request):
    set_user_id(user_id)

    # Get request context
    context = get_request_context()
    logger.info("Processing request", extra=context)

    # Your logic
    return user
```

### 3. Error Response Format

All errors follow this format:
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

## Common Error Scenarios

### Frontend

```typescript
// 1. Network error
if (error.type === ErrorType.NETWORK) {
  toast.error('Network error. Please check your connection.');
}

// 2. Authentication error
if (error.type === ErrorType.AUTH) {
  toast.error('Please login again');
  router.push('/login');
}

// 3. Validation error
if (error.type === ErrorType.VALIDATION) {
  const field = error.details?.field;
  toast.error(`${field} is invalid`);
}

// 4. Server error
if (error.type === ErrorType.SERVER) {
  toast.error('Server error. Please try again later.');
}

// 5. Not found error
if (error.type === ErrorType.NOT_FOUND) {
  toast.error('Resource not found');
  router.push('/404');
}
```

### Backend

```python
# 1. Validation error (400)
raise ValidationError(
    message="Invalid input",
    field="email"
)

# 2. Authentication error (401)
raise AuthenticationError(
    message="Invalid credentials"
)

# 3. Authorization error (403)
raise AuthorizationError(
    message="Insufficient permissions"
)

# 4. Not found error (404)
raise NotFoundError(
    resource="User"
)

# 5. Rate limit error (429)
raise RateLimitError(
    message="Too many requests",
    retry_after=60
)

# 6. Server error (500)
raise DatabaseError(
    message="Database operation failed"
)
```

## Error Types Reference

| Error Type | Status Code | Retryable | User Action |
|------------|-------------|-----------|-------------|
| NETWORK | 0 | Yes | Check connection |
| AUTH | 401 | No | Re-login |
| VALIDATION | 400 | No | Fix input |
| NOT_FOUND | 404 | No | Check URL |
| SERVER | 500 | Yes | Retry later |
| RATE_LIMIT | 429 | Yes | Wait and retry |

## Response Headers

All responses include these headers:
- `X-Request-ID`: Unique request identifier
- `X-Processing-Time`: Request processing time (seconds)

## Testing Error Handling

### Frontend Tests

```typescript
// Test API error handling
it('should handle API errors', async () => {
  const { result } = renderHook(() =>
    useEnhancedQuery(['test'], () => Promise.reject(new Error('API Error')))
  );

  await waitFor(() => {
    expect(result.current.error).toBeDefined();
  });
});
```

### Backend Tests

```python
# Test error handling
def test_validation_error(client):
    response = client.post("/api/auth/register", json={
        "email": "",  # Invalid
        "password": "test"
    })

    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
```

## Best Practices

### Frontend
1. Always handle errors in async operations
2. Use type-safe error handling
3. Provide user-friendly messages
4. Log errors for debugging
5. Implement retry for transient failures

### Backend
1. Use custom exceptions for different error types
2. Never expose stack traces to clients
3. Include correlation IDs for tracking
4. Log errors with context
5. Implement rate limiting

## Quick Troubleshooting

### Issue: Circuit breaker always open
- Check service health
- Review failure threshold
- Monitor error rates

### Issue: High error rates
- Check database connectivity
- Review external service status
- Monitor system resources

### Issue: Generic error messages
- Verify error messages are clear
- Check recovery actions work
- Test error boundary behavior

## Further Reading

- [Complete Error Handling Guide](./ERROR_HANDLING.md)
- [Implementation Summary](./ERROR_HANDLING_SUMMARY.md)
- [Implementation Report](./ERROR_HANDLING_IMPLEMENTATION_REPORT.md)

---

**Last Updated**: 2026-05-26
**Version**: 1.0.0
