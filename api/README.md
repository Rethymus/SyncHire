# SyncHire API Documentation

FastAPI backend for the SyncHire (知遇) platform - AI-powered resume optimization and job matching.

## 🚀 Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Run the development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 📚 API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

## 🔐 Authentication

All endpoints (except auth) require JWT authentication:

```bash
# Get access token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Use token in requests
curl http://localhost:8000/api/resumes \
  -H "Authorization: Bearer <access_token>"
```

## 📡 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login and get JWT tokens |
| POST | `/refresh` | Refresh access token |
| GET | `/me` | Get current user info |

### Resumes (`/api/resumes`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Upload and parse resume (PDF/Word) |
| GET | `/` | List user's resumes |
| GET | `/{id}` | Get resume details |
| PUT | `/{id}` | Update resume |
| DELETE | `/{id}` | Delete resume |
| POST | `/{id}/reparse` | Re-parse resume with MCP |
| POST | `/{id}/export` | Export resume as PDF |

### Job Descriptions (`/api/jds`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/parse` | Parse JD text |
| POST | `/` | Save JD |
| GET | `/` | List saved JDs |
| GET | `/{id}` | Get JD details |

### Applications (`/api/applications`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create application (resume + JD) |
| GET | `/` | List applications |
| GET | `/{id}/match` | Get match score |
| POST | `/{id}/optimize` | Generate optimized resume |
| GET | `/{id}/interview-prep` | Get interview prep materials |

## 📝 Request/Response Examples

### Register User

**Request:**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "full_name": "John Doe"
  }'
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "full_name": "John Doe",
  "is_active": true,
  "created_at": "2026-05-21T10:00:00Z",
  "updated_at": "2026-05-21T10:00:00Z"
}
```

### Login

**Request:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Upload Resume

**Request:**
```bash
curl -X POST http://localhost:8000/api/resumes \
  -H "Authorization: Bearer <access_token>" \
  -F "file=@resume.pdf" \
  -F "title=Software Engineer Resume"
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Software Engineer Resume",
  "content": "{\"text_content\":\"...\",\"sections\":{...}}",
  "parsed_data": {
    "text_content": "...",
    "sections": {...}
  },
  "created_at": "2026-05-21T10:05:00Z",
  "updated_at": "2026-05-21T10:05:00Z"
}
```

### Parse Job Description

**Request:**
```bash
curl -X POST http://localhost:8000/api/jds/parse \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Senior Software Engineer position... Requirements: 5+ years experience..."
  }'
```

**Response:**
```json
{
  "parsed_data": {
    "skills": ["Python", "FastAPI", "PostgreSQL", "Redis"],
    "experience_level": "senior",
    "requirements": [
      "5+ years of software development experience",
      "Strong proficiency in Python"
    ],
    "responsibilities": [
      "Design and develop backend services",
      "Collaborate with cross-functional teams"
    ],
    "nice_to_have": [
      "Experience with cloud platforms (AWS/GCP)",
      "Knowledge of containerization (Docker, Kubernetes)"
    ]
  }
}
```

### Create Application

**Request:**
```bash
curl -X POST http://localhost:8000/api/applications \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "resume_id": "550e8400-e29b-41d4-a716-446655440001",
    "jd_id": "550e8400-e29b-41d4-a716-446655440002"
  }'
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "resume_id": "550e8400-e29b-41d4-a716-446655440001",
  "jd_id": "550e8400-e29b-41d4-a716-446655440002",
  "match_score": null,
  "status": "pending",
  "created_at": "2026-05-21T10:10:00Z",
  "updated_at": "2026-05-21T10:10:00Z"
}
```

### Get Match Score

**Request:**
```bash
curl -X GET http://localhost:8000/api/applications/{id}/match \
  -H "Authorization: Bearer <access_token>"
```

**Response:**
```json
{
  "match_score": 85.5,
  "matched_skills": ["Python", "FastAPI", "PostgreSQL"],
  "missing_skills": ["Kubernetes"],
  "strengths": [
    "Strong backend development experience",
    "Excellent system design skills"
  ],
  "gaps": [
    "Limited container orchestration experience"
  ],
  "recommendations": [
    "Highlight your Docker experience more prominently",
    "Consider taking a Kubernetes course"
  ]
}
```

### Generate Interview Preparation

**Request:**
```bash
curl -X GET http://localhost:8000/api/applications/{id}/interview-prep \
  -H "Authorization: Bearer <access_token>"
```

**Response:**
```json
{
  "likely_questions": [
    {
      "question": "Tell me about your experience with FastAPI",
      "suggested_answer": "Discuss your projects using FastAPI..."
    }
  ],
  "technical_topics": ["REST API design", "Database optimization", "Async programming"],
  "company_research": ["Recent product launches", "Engineering culture", "Tech stack"],
  "questions_to_ask": [
    "What does the typical development lifecycle look like?",
    "How does the team handle technical debt?"
  ],
  "key_talking_points": [
    "Built scalable backend services serving 1M+ users",
    "Led migration from monolith to microservices"
  ]
}
```

## ⚠️ Error Handling

### Error Response Format

All errors return a consistent JSON format:

```json
{
  "detail": "Error message description"
}
```

### Common HTTP Status Codes

| Code | Description | Example |
|------|-------------|---------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | User lacks permission |
| 404 | Not Found | Resource does not exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Rate Limiting

- **Default**: 100 requests per 60 seconds per IP
- **Headers**: Check `X-RateLimit-Remaining` and `X-RateLimit-Reset`

## 🔧 Configuration

### Environment Variables

```bash
# Database
POSTGRES_USER=synchire
POSTGRES_PASSWORD=synchire_dev
POSTGRES_DB=synchire
DATABASE_URL=

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret_change_this
JWT_ALGORITHM=HS256
JWT_EXPIRES_IN=604800

# CORS
CORS_ORIGINS=http://localhost:3000

# AI APIs
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# MCP Server
MCP_SERVER_URL=http://localhost:3000

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
```

## 🏗️ Project Structure

```
api/
├── app/
│   ├── api/              # FastAPI routers
│   │   ├── auth.py
│   │   ├── resumes.py
│   │   ├── jds.py
│   │   └── applications.py
│   ├── core/             # Core functionality
│   │   ├── config.py     # Configuration
│   │   ├── database.py   # Database setup
│   │   ├── redis.py      # Redis client
│   │   ├── security.py   # JWT & passwords
│   │   └── deps.py       # Dependencies
│   ├── models/           # SQLAlchemy models
│   │   ├── user.py
│   │   ├── resume.py
│   │   ├── jd.py
│   │   └── application.py
│   ├── schemas/          # Pydantic schemas
│   │   ├── user.py
│   │   ├── resume.py
│   │   ├── jd.py
│   │   └── application.py
│   └── services/         # Business logic
│       ├── auth_service.py
│       ├── resume_service.py
│       ├── jd_service.py
│       ├── application_service.py
│       ├── ai_service.py
│       └── mcp_client.py
├── main.py               # Canonical FastAPI entrypoint
├── main_lite.py          # Local-first desktop/Electron entrypoint
├── requirements.txt      # Python dependencies
└── .env.example          # Environment template
```

## 🧪 Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test
pytest tests/test_auth.py
```

## 📦 Production Deployment

```bash
# Build Docker image
docker build -t synchire-api .

# Run with Docker Compose
docker-compose up -d

# Or use Gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## 🤝 Client Libraries

See `/examples/` directory for:
- Python client examples
- JavaScript/TypeScript client examples
- cURL command examples
