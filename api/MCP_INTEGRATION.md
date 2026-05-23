# MCP Integration for SyncHire Backend

## Overview

The SyncHire FastAPI backend now integrates with MCP (Model Context Protocol) servers for intelligent resume parsing, JD parsing, and job matching.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Auth Module  │  │ Resume Module│  │   JD Module  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               MCP Client (mcp_client.py)              │  │
│  │  - HTTP client for MCP servers                        │  │
│  │  - Fallback to OpenAI AI service                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Servers                              │
│                                                              │
│  ┌──────────────────┐  ┌────────────────┐                 │
│  │ Resume Analyzer  │  │   JD Parser    │                 │
│  │  - PDF parsing   │  │  - Skills      │                 │
│  │  - Data extract  │  │  - Requirements│                 │
│  └──────────────────┘  └────────────────┘                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Job Matcher                          │  │
│  │  - Match scoring                                      │  │
│  │  - Resume optimization                                │  │
│  │  - Interview preparation                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## MCP Client API

### Configuration

```python
# app/core/config.py
MCP_SERVER_URL: str = "http://localhost:3000"
```

### Available Methods

```python
from app.services.mcp_client import mcp_client

# Parse resume from uploaded file
parsed = await mcp_client.parse_resume(
    file_path="/path/to/resume.pdf",
    file_content=bytes  # optional
)

# Parse job description text
parsed_jd = await mcp_client.parse_jd(content="Job description text...")

# Match resume to job description
match_result = await mcp_client.match_resume_to_jd(
    resume_data={...},
    jd_data={...}
)

# Optimize resume for specific job
optimized = await mcp_client.optimize_resume(
    resume_data={...},
    jd_data={...}
)

# Generate interview preparation
prep = await mcp_client.generate_interview_prep(
    resume_data={...},
    jd_data={...}
)
```

## Service Integration

### Resume Service

```python
# app/services/resume_service.py

class ResumeService:
    @staticmethod
    async def create_resume(db, user_id, file, title) -> Resume:
        # 1. Save uploaded file
        # 2. Parse using MCP client
        parsed_data = await mcp_client.parse_resume(file_path, content)
        # 3. Generate embedding for semantic search
        embedding = await AIService.generate_embedding(text)
        # 4. Save to database
        return resume
```

### JD Service

```python
# app/services/jd_service.py

class JDService:
    @staticmethod
    async def parse_jd(content: str) -> dict:
        try:
            return await mcp_client.parse_jd(content)
        except MCPError:
            # Fallback to OpenAI
            return await AIService.parse_jd(content)
```

### Application Service

```python
# app/services/application_service.py

class ApplicationService:
    @staticmethod
    async def get_match_score(...) -> dict:
        return await mcp_client.match_resume_to_jd(resume_data, jd_data)

    @staticmethod
    async def optimize_resume(...) -> dict:
        return await mcp_client.optimize_resume(resume_data, jd_data)

    @staticmethod
    async def generate_interview_prep(...) -> dict:
        return await mcp_client.generate_interview_prep(resume_data, jd_data)
```

## API Endpoints

### Resumes

- `POST /api/resumes/` - Upload and parse resume
- `POST /api/resumes/{id}/reparse` - Re-parse with updated MCP

### Job Descriptions

- `POST /api/jds/parse` - Parse JD text
- `POST /api/jds/` - Save parsed JD

### Applications

- `GET /api/applications/{id}/match` - Get match score
- `POST /api/applications/{id}/optimize` - Optimize resume
- `GET /api/applications/{id}/interview-prep` - Get interview prep

## Error Handling

All MCP calls include fallback to OpenAI AI service:

```python
try:
    result = await mcp_client.parse_jd(content)
except MCPError:
    result = await AIService.parse_jd(content)
```

This ensures the API remains functional even when MCP servers are unavailable.

## Environment Setup

```bash
# .env
MCP_SERVER_URL=http://localhost:3000
OPENAI_API_KEY=sk-...
```

## Testing

```bash
# Start MCP servers
cd /home/re/code/SyncHire/mcp-servers
npm start

# Start FastAPI backend
cd /home/re/code/SyncHire/api
uvicorn main:app --reload
```

## Next Steps

1. Implement MCP server HTTP endpoints
2. Add integration tests
3. Add monitoring for MCP call success/failure rates
4. Implement caching for repeated parse operations
