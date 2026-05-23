# SyncHire API Error Codes

## Error Response Format

All errors follow a consistent JSON format:

```json
{
  "detail": "Human-readable error message"
}
```

For validation errors, additional detail may be provided:

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

## HTTP Status Codes

### 2xx Success

| Code | Name | Description |
|------|------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 204 | No Content | Request succeeded, no content returned |

### 4xx Client Errors

| Code | Name | Description |
|------|------|-------------|
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required or failed |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 413 | Payload Too Large | Request exceeds size limit |
| 415 | Unsupported Media Type | Invalid content type |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |

### 5xx Server Errors

| Code | Name | Description |
|------|------|-------------|
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | Upstream service error |
| 503 | Service Unavailable | Service temporarily unavailable |

## Common Error Messages

### Authentication Errors

#### `Email already registered`
```json
{
  "detail": "Email already registered"
}
```
- **Code**: 400
- **Cause**: Attempting to register with an existing email
- **Solution**: Use a different email or login

#### `Incorrect email or password`
```json
{
  "detail": "Incorrect email or password"
}
```
- **Code**: 401
- **Cause**: Invalid credentials
- **Solution**: Verify email and password

#### `Invalid authentication credentials`
```json
{
  "detail": "Invalid authentication credentials"
}
```
- **Code**: 401
- **Cause**: Invalid or expired JWT token
- **Solution**: Re-authenticate to get new token

#### `User not found`
```json
{
  "detail": "User not found"
}
```
- **Code**: 401
- **Cause**: Token valid but user deleted
- **Solution**: Register new account

#### `User account is disabled`
```json
{
  "detail": "User account is disabled"
}
```
- **Code**: 403
- **Cause**: Account deactivated
- **Solution**: Contact support

### Resume Errors

#### `File type .xxx not allowed`
```json
{
  "detail": "File type .exe not allowed"
}
```
- **Code**: 400
- **Cause**: Invalid file extension
- **Solution**: Use .pdf or .docx files only

#### `File too large`
```json
{
  "detail": "File too large"
}
```
- **Code**: 400
- **Cause**: File exceeds 10MB limit
- **Solution**: Compress or reduce file size

#### `Resume not found`
```json
{
  "detail": "Resume not found"
}
```
- **Code**: 404
- **Cause**: Resume doesn't exist or access denied
- **Solution**: Verify resume ID and ownership

#### `Resume or JD content not available`
```json
{
  "detail": "Resume or JD content not available"
}
```
- **Code**: 400
- **Cause**: Resume parsing incomplete
- **Solution**: Re-parse the resume

### Job Description Errors

#### `JD not found`
```json
{
  "detail": "JD not found"
}
```
- **Code**: 404
- **Cause**: JD doesn't exist or access denied
- **Solution**: Verify JD ID and ownership

### Application Errors

#### `Application not found`
```json
{
  "detail": "Application not found"
}
```
- **Code**: 404
- **Cause**: Application doesn't exist or access denied
- **Solution**: Verify application ID

#### `Resume or JD not parsed yet`
```json
{
  "detail": "Resume or JD not parsed yet"
}
```
- **Code**: 400
- **Cause**: Required parsing not complete
- **Solution**: Re-parse resume and/or JD

### Rate Limiting

#### `Rate limit exceeded`
```json
{
  "detail": "Rate limit exceeded"
}
```
- **Code**: 429
- **Cause**: Too many requests
- **Solution**: Wait before retrying
- **Headers**:
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

### Validation Errors

#### `field required`
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```
- **Code**: 422
- **Cause**: Missing required field
- **Solution**: Include all required fields

#### `value is not a valid email address`
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```
- **Code**: 422
- **Cause**: Invalid email format
- **Solution**: Provide valid email address

### Server Errors

#### `Internal Server Error`
```json
{
  "detail": "Internal Server Error"
}
```
- **Code**: 500
- **Cause**: Unexpected server error
- **Solution**: Report the issue with request details

#### `Failed to parse resume`
```json
{
  "detail": "Failed to parse resume: MCP parsing failed"
}
```
- **Code**: 500
- **Cause**: MCP/AI service error
- **Solution**: Try again later or use fallback

#### `PDF generation failed`
```json
{
  "detail": "PDF generation failed: [error details]"
}
```
- **Code**: 500
- **Cause**: PDF generation error
- **Solution**: Report with resume details

## Error Handling Best Practices

### Client-Side

1. **Always check HTTP status code** before processing response
2. **Handle 401 errors** by refreshing token or redirecting to login
3. **Show user-friendly messages** for common errors
4. **Log error details** for debugging
5. **Implement retry logic** for 429 and 5xx errors

### Example Error Handler (JavaScript)

```javascript
try {
  const response = await fetch('http://localhost:8000/api/resumes', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();

    switch (response.status) {
      case 401:
        // Redirect to login
        window.location.href = '/login';
        break;
      case 429:
        // Show rate limit message
        showError('Too many requests. Please wait.');
        break;
      case 404:
        // Show not found message
        showError('Resource not found');
        break;
      default:
        showError(error.detail || 'An error occurred');
    }
    return;
  }

  const data = await response.json();
  // Process data
} catch (error) {
  console.error('Request failed:', error);
}
```

### Example Error Handler (Python)

```python
import requests
from requests.exceptions import HTTPError, RequestException

def api_call(url, token):
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()

    except HTTPError as e:
        status = e.response.status_code

        if status == 401:
            print("Authentication failed - please login again")
        elif status == 429:
            print("Rate limit exceeded - please wait")
        elif status == 404:
            print("Resource not found")
        else:
            print(f"HTTP error: {e.response.json().get('detail')}")

    except RequestException as e:
        print(f"Request failed: {e}")

    return None
```

## Monitoring and Alerts

### Recommended Monitoring

- Track error rates by endpoint
- Alert on 5xx error spikes
- Monitor rate limit violations
- Track authentication failures
- Monitor MCP/AI service availability

### Logging

All errors should be logged with:
- Timestamp
- Request ID
- Endpoint
- User ID (if available)
- Error message
- Stack trace (for 5xx errors)

## Support

For persistent errors or issues not covered here:
- Check API status: http://localhost:8000/health
- Review logs in `/var/log/synchire/`
- Contact support with error details and request ID
