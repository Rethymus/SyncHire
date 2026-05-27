# SyncHire API Documentation

Complete API reference for the SyncHire platform.

## Base URL

```
Production: https://api.synchire.com
Development: http://localhost:8000
```

## Authentication

Most endpoints require authentication using JWT tokens.

### Headers

```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

### Token Management

**Obtain Token:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 604800
}
```

**Refresh Token:**
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "name": "John Doe",
  "company": "Optional Company"
}
```

**Response:** `201 Created`
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### OAuth Login
```http
GET /api/auth/oauth/{provider}
```

**Parameters:**
- `provider`: `google` | `github`

**Redirects to OAuth provider and back to:**
```http
GET /api/auth/oauth/{provider}/callback?code=...
```

### Resumes

#### Upload Resume
```http
POST /api/resumes
Content-Type: multipart/form-data
```

**Request Body:**
```http
file: <resume_file>
title: "My Resume"
description: "Software Developer Resume"
```

**Response:** `201 Created`
```json
{
  "id": "resume_123",
  "title": "My Resume",
  "status": "analyzing",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Get Resume Analysis
```http
GET /api/resumes/{resume_id}/analysis
```

**Response:** `200 OK`
```json
{
  "resume_id": "resume_123",
  "analysis": {
    "skills": {
      "technical": ["JavaScript", "Python", "React"],
      "soft": ["Leadership", "Communication"]
    },
    "experience": [
      {
        "company": "Tech Corp",
        "role": "Senior Developer",
        "duration": "2 years"
      }
    ],
    "education": [
      {
        "degree": "BS Computer Science",
        "school": "University",
        "year": 2020
      }
    ],
    "ats_score": 85,
    "recommendations": ["Add more metrics", "Include certifications"]
  }
}
```

#### List Resumes
```http
GET /api/resumes?page=1&page_size=20
```

**Response:** `200 OK`
```json
{
  "resumes": [
    {
      "id": "resume_123",
      "title": "My Resume",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "page_size": 20
}
```

#### Delete Resume
```http
DELETE /api/resumes/{resume_id}
```

**Response:** `204 No Content`

### Job Descriptions

#### Create Job Description
```http
POST /api/jobs/descriptions
```

**Request Body:**
```json
{
  "title": "Senior Software Engineer",
  "description": "We are looking for a senior software engineer...",
  "company": "Tech Company",
  "location": "Remote",
  "type": "full-time"
}
```

**Response:** `201 Created`
```json
{
  "id": "jd_123",
  "title": "Senior Software Engineer",
  "status": "analyzing",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Get Job Description Analysis
```http
GET /api/jobs/descriptions/{jd_id}/analysis
```

**Response:** `200 OK`
```json
{
  "jd_id": "jd_123",
  "analysis": {
    "required_skills": {
      "technical": ["Python", "Django", "PostgreSQL"],
      "soft": ["Team leadership", "Communication"]
    },
    "experience_level": "senior",
    "responsibilities": [
      "Design and implement features",
      "Mentor junior developers"
    ],
    "benefits": ["Health insurance", "Remote work"]
  }
}
```

#### List Job Descriptions
```http
GET /api/jobs/descriptions?page=1&page_size=20
```

**Response:** `200 OK`
```json
{
  "jobs": [
    {
      "id": "jd_123",
      "title": "Senior Software Engineer",
      "company": "Tech Company",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "page_size": 20
}
```

### Job Matching

#### Calculate Match
```http
POST /api/jobs/match
```

**Request Body:**
```json
{
  "resume_id": "resume_123",
  "jd_id": "jd_123"
}
```

**Response:** `200 OK`
```json
{
  "match_id": "match_123",
  "score": 85,
  "status": "high",
  "breakdown": {
    "hard_skills": {
      "score": 90,
      "matched": ["JavaScript", "React", "Node.js"],
      "missing": ["GraphQL", "Docker"]
    },
    "experience": {
      "score": 85,
      "matched_requirements": ["3+ years experience", "Team leadership"],
      "gaps": ["Large-scale system design"]
    },
    "soft_skills": {
      "score": 80,
      "matched": ["Communication", "Problem-solving"],
      "missing": ["Public speaking"]
    },
    "education": {
      "score": 100,
      "meets_requirements": true
    }
  },
  "recommendations": [
    "Learn GraphQL and Docker to increase match score",
    "Highlight large-scale project experience"
  ],
  "radar_data": [90, 85, 80, 100]
}
```

#### Get Match History
```http
GET /api/jobs/matches?page=1&page_size=20
```

**Response:** `200 OK`
```json
{
  "matches": [
    {
      "id": "match_123",
      "score": 85,
      "status": "high",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "page_size": 20
}
```

### Interview Preparation

#### Generate Interview Prep
```http
POST /api/interviews/prep
```

**Request Body:**
```json
{
  "resume_id": "resume_123",
  "jd_id": "jd_123"
}
```

**Response:** `200 OK`
```json
{
  "prep_id": "prep_123",
  "hr_questions": [
    {
      "question": "Tell me about yourself",
      "suggested_answer": "Focus on relevant experience and achievements..."
    }
  ],
  "technical_questions": [
    {
      "question": "Explain how you would optimize a slow React component",
      "topics": ["React.memo", "useCallback", "useMemo"]
    }
  ],
  "behavioral_questions": [
    {
      "question": "Tell me about a time you had to handle a difficult team member",
      "star_method": "Situation, Task, Action, Result"
    }
  ],
  "self_introduction": {
    "elevator_pitch": "30-second introduction focusing on key strengths...",
    "detailed_intro": "2-minute comprehensive introduction..."
  },
  "questions_to_ask": [
    "What does success look like in this role?",
    "How does the team approach technical challenges?"
  ],
  "preparation_checklist": [
    "Research the company and recent news",
    "Review technical fundamentals",
    "Prepare STAR stories"
  ]
}
```

### Applications

#### Create Application
```http
POST /api/applications
```

**Request Body:**
```json
{
  "resume_id": "resume_123",
  "jd_id": "jd_123",
  "status": "applied",
  "notes": "Applied through company website"
}
```

**Response:** `201 Created`
```json
{
  "id": "app_123",
  "status": "applied",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Update Application Status
```http
PATCH /api/applications/{app_id}
```

**Request Body:**
```json
{
  "status": "interview",
  "interview_date": "2024-01-15T10:00:00Z",
  "notes": "Phone screen scheduled"
}
```

**Response:** `200 OK`
```json
{
  "id": "app_123",
  "status": "interview",
  "interview_date": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### List Applications
```http
GET /api/applications?status=interview&page=1&page_size=20
```

**Response:** `200 OK`
```json
{
  "applications": [
    {
      "id": "app_123",
      "job": {
        "id": "jd_123",
        "title": "Senior Software Engineer",
        "company": "Tech Company"
      },
      "status": "interview",
      "interview_date": "2024-01-15T10:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 3,
  "page": 1,
  "page_size": 20
}
```

### Analytics

#### Get User Analytics
```http
GET /api/analytics/overview
```

**Response:** `200 OK`
```json
{
  "overview": {
    "total_applications": 25,
    "interviews_scheduled": 8,
    "offers_received": 2,
    "average_match_score": 78
  },
  "application_funnel": {
    "applied": 25,
    "under_review": 15,
    "interview": 8,
    "offer": 2,
    "rejected": 5
  },
  "skill_analysis": {
    "top_skills": ["JavaScript", "React", "Node.js"],
    "skill_gaps": ["GraphQL", "Docker", "Kubernetes"],
    "skill_trends": {
      "JavaScript": "in_high_demand",
      "React": "steady_demand"
    }
  }
}
```

#### Get Application Analytics
```http
GET /api/analytics/applications?period=30d
```

**Response:** `200 OK`
```json
{
  "period": "30d",
  "applications": [
    {"date": "2024-01-01", "count": 5},
    {"date": "2024-01-02", "count": 3}
  ],
  "conversion_rates": {
    "application_to_interview": 0.32,
    "interview_to_offer": 0.25
  },
  "average_response_time": "7 days"
}
```

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | User lacks permission for this action |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Error Examples

**Validation Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "email": ["Invalid email format"],
      "password": ["Password must be at least 8 characters"]
    },
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

**Rate Limit Error:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later.",
    "details": {
      "retry_after": 60,
      "limit": 100,
      "window": "1 minute"
    },
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## Rate Limiting

### Rate Limit Headers

All responses include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704110400
```

### Rate Limits by Endpoint

| Endpoint | Limit | Window |
|----------|-------|--------|
| Auth endpoints | 10/minute | IP |
| Job matching | 30/hour | User |
| Resume upload | 20/hour | User |
| Interview prep | 30/hour | User |
| Analytics | 60/hour | User |

## Pagination

### Pagination Parameters

All list endpoints support pagination:

```http
GET /api/resumes?page=1&page_size=20&sort=created_at&order=desc
```

**Parameters:**
- `page` (default: 1): Page number
- `page_size` (default: 20, max: 100): Items per page
- `sort` (optional): Field to sort by
- `order` (default: desc): `asc` or `desc`

### Pagination Response

```json
{
  "items": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "page_size": 20,
    "pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

## Webhooks

### Configure Webhook

```http
POST /api/webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks",
  "events": ["application.status_changed", "interview.scheduled"],
  "secret": "webhook_secret_key"
}
```

**Response:** `201 Created`
```json
{
  "id": "webhook_123",
  "url": "https://your-app.com/webhooks",
  "events": ["application.status_changed"],
  "active": true
}
```

### Webhook Events

| Event | Description |
|-------|-------------|
| `application.status_changed` | Application status updated |
| `interview.scheduled` | Interview scheduled |
| `interview.reminder` | Interview reminder (24h before) |
| `match.completed` | Job matching analysis completed |

### Webhook Payload Example

```json
{
  "event": "application.status_changed",
  "data": {
    "application_id": "app_123",
    "old_status": "applied",
    "new_status": "interview",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## SDK Integration

### JavaScript/TypeScript

```typescript
import { SyncHireClient } from '@synchire/sdk';

const client = new SyncHireClient({
  apiKey: 'your_api_key',
  baseURL: 'https://api.synchire.com'
});

// Upload resume
const resume = await client.resumes.upload({
  file: resumeFile,
  title: 'My Resume'
});

// Calculate match
const match = await client.jobs.match({
  resumeId: resume.id,
  jdId: jdId
});
```

### Python

```python
from synchire import SyncHireClient

client = SyncHireClient(
    api_key='your_api_key',
    base_url='https://api.synchire.com'
)

# Upload resume
resume = client.resumes.upload(
    file=resume_file,
    title='My Resume'
)

# Calculate match
match = client.jobs.match(
    resume_id=resume.id,
    jd_id=jd_id
)
```

## Testing

### Sandbox Environment

For testing, use the sandbox environment:

```http
Base URL: https://api-sandbox.synchire.com
```

Sandbox features:
- No real AI API calls required
- Test data and mocks
- Higher rate limits
- No charge for usage

### Test Credentials

```http
POST https://api-sandbox.synchire.com/api/auth/login
{
  "email": "test@example.com",
  "password": "test_password"
}
```

## Changelog

### Version 1.0.0 (2024-01-01)
- Initial API release
- Authentication endpoints
- Resume upload and analysis
- Job description analysis
- Job matching
- Interview preparation
- Application tracking
- Analytics endpoints

---

**Support:**
- Documentation: https://docs.synchire.com
- Status Page: https://status.synchire.com
- Support Email: api-support@synchire.com