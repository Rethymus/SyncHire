# Audit Trail System for GDPR Compliance

This document describes the comprehensive audit trail system implemented for GDPR compliance in SyncHire.

## Overview

The audit system automatically tracks all data access, modifications, and user actions to ensure compliance with GDPR requirements, including:

- **Article 7(3)**: Data retention and deletion tracking
- **Article 30**: Records of processing activities
- **Right of Access**: User data access logs
- **Data Portability**: Complete data history exports

## Architecture

### Database Models

#### 1. AuditLog
Tracks all auditable actions on user data.

**Fields:**
- `id`: Unique identifier (UUID)
- `user_id`: User who performed the action
- `action`: Type of action (CREATE, READ, UPDATE, DELETE, EXPORT, AUTH_LOGIN, etc.)
- `resource_type`: Type of resource (user, resume, jd, application, etc.)
- `resource_id`: Specific resource affected
- `old_values`: Previous state (for UPDATE/DELETE)
- `new_values`: New state (for CREATE/UPDATE)
- `ip_address`: Client IP address
- `user_agent`: Client user agent string
- `request_id`: Unique request identifier for tracing
- `description`: Human-readable description
- `metadata`: Additional context (JSON)
- `timestamp`: When the action occurred

**Indexes:**
- `user_id`: Fast user history lookup
- `action`: Filter by action type
- `resource_type`: Filter by resource type
- `resource_id`: Track specific resource
- `timestamp`: Date range queries

#### 2. DataRetentionLog
Tracks data deletion and retention activities for GDPR Article 7(3).

**Fields:**
- `id`: Unique identifier (UUID)
- `user_id`: User whose data was deleted
- `resource_type`: Type of resource deleted
- `resource_id`: ID of deleted resource
- `retention_period_days`: Retention policy applied
- `deletion_reason`: Why data was deleted
- `deleted_at`: When deletion occurred
- `deleted_by`: User or system that performed deletion
- `backup_deleted`: Whether backups were also deleted
- `gdpr_request_id`: Related GDPR request ID

#### 3. ConsentLog
Tracks user consent for GDPR Article 7 compliance.

**Fields:**
- `id`: Unique identifier (UUID)
- `user_id`: User granting/revoking consent
- `consent_type`: Type of consent (marketing, analytics, data_processing)
- `granted`: Whether consent was granted or revoked
- `granted_at`: When consent was granted
- `revoked_at`: When consent was revoked (if applicable)
- `legal_basis`: Legal basis for processing
- `privacy_policy_version`: Version of policy accepted
- `ip_address`: Client IP address
- `user_agent`: Client user agent

### API Endpoints

#### GET /api/compliance/audit-report
Generate audit report for compliance reporting.

**Query Parameters:**
- `start_date`: Start of date range (default: 30 days ago)
- `end_date`: End of date range (default: now)
- `user_id`: Filter by specific user (admin only)
- `action_type`: Filter by action type
- `resource_type`: Filter by resource type
- `format`: Export format (`csv` or `json`, default: `csv`)

**Response:**
- CSV or JSON file with audit log data

**Example:**
```bash
curl -X GET "http://localhost:8000/api/compliance/audit-report?start_date=2026-04-01&end_date=2026-05-01&format=csv" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### GET /api/compliance/audit-logs
Get audit logs with pagination and filtering.

**Query Parameters:**
- `start_date`: Start of date range
- `end_date`: End of date range
- `user_id`: Filter by specific user (admin only)
- `action_type`: Filter by action type
- `resource_type`: Filter by resource type
- `skip`: Pagination offset (default: 0)
- `limit`: Maximum records (default: 100, max: 1000)

**Response:**
```json
{
  "logs": [...],
  "count": 150,
  "skip": 0,
  "limit": 100
}
```

#### GET /api/compliance/my-audit-logs
Get current user's audit history.

**Response:**
```json
{
  "logs": [...],
  "count": 50,
  "skip": 0,
  "limit": 100
}
```

#### GET /api/compliance/audit-statistics
Get audit statistics for compliance reporting (admin only).

**Response:**
```json
{
  "total_actions": 5000,
  "by_action": {
    "CREATE": 1200,
    "READ": 2500,
    "UPDATE": 1000,
    "DELETE": 300
  },
  "by_resource_type": {
    "resume": 1500,
    "jd": 2000,
    "application": 1500
  },
  "date_range": {
    "start": "2026-04-01T00:00:00",
    "end": "2026-05-01T00:00:00"
  }
}
```

#### GET /api/compliance/compliance-report
Generate comprehensive compliance report.

**Response:**
```json
{
  "report_generated": "2026-05-26T10:00:00",
  "report_period": {
    "start": "2026-02-25T10:00:00",
    "end": "2026-05-26T10:00:00"
  },
  "user": {...},
  "audit_summary": {...},
  "recent_activity": {...},
  "consent_history": [...],
  "data_retention": {...}
}
```

## Usage

### Automatic Logging via Middleware

The audit middleware automatically logs all requests to audited endpoints:

```python
# In main.py
app.add_middleware(AuditMiddleware)
```

**Automatically logged endpoints:**
- `/api/users/*` - User data access
- `/api/resumes/*` - Resume operations
- `/api/jds/*` - Job description operations
- `/api/applications/*` - Application operations
- `/api/auth/*` - Authentication events
- `/api/gdpr/*` - GDPR operations
- `/api/compliance/*` - Compliance operations

### Manual Logging in Endpoints

For custom audit logging, use the audit service:

```python
from app.services.audit_service import log_create, log_update, log_delete
from app.models.audit_log import ResourceType

@router.post("/resumes")
async def create_resume(
    resume_data: ResumeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Create resume
    resume = Resume(**resume_data.dict(), user_id=current_user.id)
    db.add(resume)
    await db.commit()
    await db.refresh(resume)

    # Log the action
    await log_create(
        db=db,
        user_id=current_user.id,
        resource_type=ResourceType.RESUME,
        resource_id=resume.id,
        new_values=resume_data.dict(),
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )

    return resume
```

### Convenience Functions

The audit service provides convenience functions for common operations:

```python
# Log data read
await log_read(db, user_id, ResourceType.RESUME, resume_id, ip_address, user_agent)

# Log data creation
await log_create(db, user_id, ResourceType.RESUME, resume_id, new_values, ip_address, user_agent)

# Log data update
await log_update(db, user_id, ResourceType.RESUME, resume_id, old_values, new_values, ip_address, user_agent)

# Log data deletion
await log_delete(db, user_id, ResourceType.RESUME, resume_id, old_values, ip_address, user_agent)

# Log authentication events
await log_auth_event(db, user_id, AuditAction.AUTH_LOGIN, ip_address, user_agent, metadata)
```

## GDPR Compliance Features

### 1. Right of Access (Article 15)

Users can retrieve their complete audit history:

```python
# Get user's audit logs
GET /api/compliance/my-audit-logs
```

### 2. Right to Data Portability (Article 20)

Export all user data in machine-readable format:

```python
# Export audit trail
GET /api/compliance/audit-report?format=json

# Get complete compliance report
GET /api/compliance/compliance-report
```

### 3. Data Retention (Article 7(3))

Track all data deletions:

```python
from app.services.audit_service import AuditService

await AuditService.log_data_deletion(
    db=db,
    user_id=user.id,
    resource_type="resume",
    resource_id=resume.id,
    deletion_reason="gdpr_request",
    gdpr_request_id="GDPR-2026-001",
    retention_period_days="30",
)
```

### 4. Consent Management (Article 7)

Track user consent:

```python
from app.services.audit_service import AuditService

await AuditService.log_consent(
    db=db,
    user_id=user.id,
    consent_type="data_processing",
    granted=True,
    legal_basis="consent",
    privacy_policy_version="1.0",
    ip_address=request.client.host,
    user_agent=request.headers.get("user-agent"),
)
```

## Database Migration

Run the migration to create audit tables:

```bash
cd api
alembic upgrade head
```

This creates:
- `audit_logs` table
- `data_retention_logs` table
- `consent_logs` table
- Indexes for optimal query performance

## Performance Considerations

### Indexes
All tables are indexed on frequently queried columns:
- `user_id` for user history lookups
- `timestamp` for date range queries
- `action` and `resource_type` for filtering

### Async Operations
Audit logging is performed asynchronously to avoid blocking request processing.

### Pagination
All list endpoints support pagination to prevent memory issues:
- Default: 100 records
- Maximum: 1000 records

## Security

### Access Control
- Regular users can only access their own audit logs
- Admin users can access all audit logs
- Compliance endpoints require authentication

### Data Integrity
- Audit logs are immutable (no update/delete operations)
- All logs include timestamps and user attribution
- IP addresses and user agents are tracked for forensic analysis

### Privacy
- Sensitive data in `old_values` and `new_values` is stored as JSONB
- No password or token data is logged
- Personal data is encrypted at rest

## Monitoring

### Health Check

Check compliance system status:

```bash
curl http://localhost:8000/api/compliance/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-05-26T10:00:00",
  "module": "compliance",
  "features": {
    "audit_logging": "enabled",
    "data_retention": "enabled",
    "consent_tracking": "enabled",
    "compliance_reporting": "enabled"
  }
}
```

## Best Practices

### 1. Always Log Data Modifications

```python
async def update_resume(resume_id: uuid.UUID, updates: ResumeUpdate):
    # Get old values
    old_resume = await db.get(Resume, resume_id)

    # Apply updates
    for field, value in updates.dict(exclude_unset=True).items():
        setattr(old_resume, field, value)

    await db.commit()

    # Log the update
    await log_update(
        db=db,
        user_id=current_user.id,
        resource_type=ResourceType.RESUME,
        resource_id=resume_id,
        old_values={"old": old_resume.dict()},
        new_values={"new": updates.dict()},
    )
```

### 2. Log Data Access

```python
async def get_resume(resume_id: uuid.UUID):
    resume = await db.get(Resume, resume_id)

    # Log access
    await log_read(
        db=db,
        user_id=current_user.id,
        resource_type=ResourceType.RESUME,
        resource_id=resume_id,
    )

    return resume
```

### 3. Log Data Deletion

```python
async def delete_resume(resume_id: uuid.UUID):
    resume = await db.get(Resume, resume_id)

    # Store old values before deletion
    old_values = resume.dict()

    # Delete
    await db.delete(resume)
    await db.commit()

    # Log deletion
    await log_delete(
        db=db,
        user_id=current_user.id,
        resource_type=ResourceType.RESUME,
        resource_id=resume_id,
        old_values=old_values,
    )

    # Log for data retention
    await AuditService.log_data_deletion(
        db=db,
        user_id=resume.user_id,
        resource_type="resume",
        resource_id=resume_id,
        deletion_reason="user_request",
        deleted_by=current_user.id,
    )
```

## Troubleshooting

### Issue: Audit logs not appearing

**Solution:**
1. Check middleware is loaded in `main.py`
2. Verify database tables exist
3. Check logs for errors

### Issue: Performance degradation

**Solution:**
1. Check database indexes are created
2. Use pagination for large queries
3. Consider archiving old logs

### Issue: Missing user_id in logs

**Solution:**
1. Ensure user is authenticated
2. Check `get_current_user` dependency is working
3. Verify user object has `id` field

## Future Enhancements

- [ ] Automated log archiving
- [ ] Real-time audit dashboard
- [ ] Anomaly detection for suspicious activity
- [ ] Integration with SIEM systems
- [ ] Blockchain-based immutable audit trail
- [ ] Automated compliance report generation
- [ ] Data retention policy enforcement

## References

- [GDPR Text](https://gdpr-info.eu/)
- [Article 7 - Conditions for Consent](https://gdpr-info.eu/art-7-gdpr/)
- [Article 15 - Right of Access](https://gdpr-info.eu/art-15-gdpr/)
- [Article 20 - Right to Data Portability](https://gdpr-info.eu/art-20-gdpr/)
- [Article 30 - Records of Processing Activities](https://gdpr-info.eu/art-30-gdpr/)
