# Bulk Operations API Documentation

## Overview

The SyncHire applications API now supports bulk operations for status updates and tagging, allowing you to efficiently manage multiple applications at once with comprehensive error handling and partial failure support.

## Base URL
```
/api/applications
```

## Authentication
All endpoints require authentication via JWT token. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Bulk Status Update

### Endpoint
```
POST /api/applications/bulk-status-update
```

### Description
Update the status (and optionally notes) for multiple applications at once. This is useful for moving multiple applications to the same stage, such as marking several applications as "applied" or "interview".

### Request Body
```json
{
  "ids": ["uuid1", "uuid2", "uuid3"],
  "status": "interview",
  "notes": "Scheduled for technical interview"
}
```

### Parameters
- **ids** (array of UUID, required): List of application IDs to update (max 100 at once)
- **status** (string, required): New status to set for all applications
  - Valid values: `"pending"`, `"optimized"`, `"applied"`, `"interview"`, `"offer"`, `"rejected"`
- **notes** (string, optional): Notes to add to all applications

### Response
```json
{
  "success_count": 2,
  "failed_count": 1,
  "errors": [
    {
      "id": "uuid3",
      "error": "Application not found or access denied"
    }
  ]
}
```

### Example Usage
```bash
curl -X POST "https://api.synchire.com/api/applications/bulk-status-update" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"],
    "status": "interview",
    "notes": "Scheduled for technical screening"
  }'
```

---

## Bulk Tagging

### Endpoint
```
POST /api/applications/bulk-tag
```

### Description
Add, remove, or replace tags on multiple applications at once. Tags are useful for categorizing applications (e.g., "high-priority", "remote", "referral").

### Request Body
```json
{
  "ids": ["uuid1", "uuid2", "uuid3"],
  "tags": ["high-priority", "remote"],
  "operation": "add"
}
```

### Parameters
- **ids** (array of UUID, required): List of application IDs to update (max 100 at once)
- **tags** (array of string, required): Tags to add/remove/replace
  - Each tag must be 1-50 characters
  - Whitespace is automatically trimmed
  - Empty tags are filtered out
- **operation** (string, required): Operation type
  - `"add"`: Append tags to existing tags (no duplicates)
  - `"remove"`: Remove specified tags from existing tags
  - `"replace"`: Replace all existing tags with new tags

### Response
```json
{
  "success_count": 3,
  "failed_count": 0,
  "errors": []
}
```

### Example Usage

#### Add tags to applications
```bash
curl -X POST "https://api.synchire.com/api/applications/bulk-tag" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"],
    "tags": ["high-priority", "remote"],
    "operation": "add"
  }'
```

#### Remove specific tags
```bash
curl -X POST "https://api.synchire.com/api/applications/bulk-tag" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["550e8400-e29b-41d4-a716-446655440000"],
    "tags": ["low-priority"],
    "operation": "remove"
  }'
```

#### Replace all tags
```bash
curl -X POST "https://api.synchire.com/api/applications/bulk-tag" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["550e8400-e29b-41d4-a716-446655440000"],
    "tags": ["interview-stage", "technical"],
    "operation": "replace"
  }'
```

---

## Bulk Notes Update

### Endpoint
```
POST /api/applications/bulk-notes-update
```

### Description
Update notes for multiple applications at once. Can append to existing notes or replace them entirely.

### Request Body
```json
{
  "ids": ["uuid1", "uuid2", "uuid3"],
  "notes": "Follow up scheduled for next week",
  "append": true
}
```

### Parameters
- **ids** (array of UUID, required): List of application IDs to update (max 100 at once)
- **notes** (string, required): Notes content to set/add
- **append** (boolean, optional): If true, append to existing notes. If false, replace existing notes. Default: true

### Response
```json
{
  "success_count": 3,
  "failed_count": 0,
  "errors": []
}
```

---

## Error Handling

All bulk operations support partial failure handling:

- **Success**: Operation completed for all specified applications
- **Partial Failure**: Operation completed for some applications, failed for others
- **Complete Failure**: Operation failed for all applications (validation error, database error)

### Common Error Responses

#### 422 Unprocessable Entity (Validation Error)
```json
{
  "detail": [
    {
      "loc": ["body", "operation"],
      "msg": "value is not a valid enumeration member",
      "type": "type_error.enum"
    }
  ]
}
```

#### 401 Unauthorized
```json
{
  "detail": "Could not validate credentials"
}
```

#### 403 Forbidden
```json
{
  "detail": "Application not found or access denied"
}
```

---

## Best Practices

1. **Batch Size**: Limit bulk operations to 100 items per request for optimal performance
2. **Error Handling**: Always check the `failed_count` and `errors` fields in responses
3. **Idempotency**: Bulk operations are idempotent - you can safely retry failed operations
4. **Transaction Safety**: Successful operations are committed even if some operations fail
5. **Tag Management**: Use descriptive, consistent tag names for better filtering

## Rate Limiting

Bulk operations are subject to rate limiting:
- 100 requests per minute per user
- Each bulk operation counts as one request regardless of the number of items

## Database Schema

### Applications Table
```sql
CREATE TABLE applications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    resume_id UUID NOT NULL,
    jd_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    tags VARCHAR(255)[],  -- Array of tags
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes
- GIN index on `tags` for efficient tag filtering
- B-tree index on `status` for efficient status queries

---

## Migration

To add the tags field to existing databases, run migration 007:

```bash
psql -U your_user -d your_database -f db/migrations/007_add_application_tags.sql
```

---

## Testing

Comprehensive test suite available in `api/tests/test_bulk_operations.py`:

```bash
# Run bulk operations tests
pytest api/tests/test_bulk_operations.py -v

# Run specific test class
pytest api/tests/test_bulk_operations.py::TestBulkTagging -v

# Run with coverage
pytest api/tests/test_bulk_operations.py --cov=app.services.application_service
```

---

## Changelog

### Version 1.0.0 (2026-05-27)
- Added bulk status update endpoint
- Added bulk tagging endpoint with add/remove/replace operations
- Added tags field to Application model
- Created migration 007 for tags column
- Added comprehensive test coverage
- Implemented partial failure handling
- Added input validation and sanitization

---

## Support

For issues or questions:
- GitHub: https://github.com/Rethymus/synchire/issues
- Documentation: https://docs.synchire.com
- Email: support@synchire.com
