# SyncHire (知遇) - Project Context Guide

## Project Overview

SyncHire is an AI-powered job application platform that helps job seekers create optimized resumes, analyze job descriptions (JDs), and match their experience with requirements. The platform uses Model Context Protocol (MCP) servers for modular AI processing.

**Vision:** Transform job hunting from manual, repetitive work into an intelligent, automated experience where candidates can apply to positions that truly match their skills and experience.

## Architecture

### Monorepo Structure

```
SyncHire/
├── frontend/          # Next.js 14 application (App Router)
├── mcp-servers/       # Modular MCP servers
│   ├── jd-parser/           # Parse and extract data from JDs
│   ├── resume-analyzer/     # Analyze and score resumes
│   ├── job-matcher/         # Match experience with requirements
│   └── interview-prep/      # Generate interview questions
├── api/              # FastAPI backend with async support
├── db/               # Database schemas and migrations
├── prompts/          # AI prompt templates (few-shot examples)
├── docs/             # Technical documentation
└── docker-compose.yml
```

### Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui
- **Backend:** FastAPI (Python 3.11+), async/await
- **Database:** PostgreSQL 16 + PGVector for embeddings
- **Cache/Queue:** Redis 7
- **Storage:** Minio (S3-compatible) for resume/JD files
- **AI:** OpenAI GPT-4, Anthropic Claude 3
- **Authentication:** JWT, OAuth2 (Google, GitHub)

### MCP Servers

Each MCP server is a standalone service that exposes specific AI capabilities:

1. **jd-parser:** Extracts structured data from unstructured JD text
2. **resume-analyzer:** Scores resumes against ATS criteria
3. **job-matcher:** Uses RAG to match user experience with requirements
4. **interview-prep:** Generates role-specific interview questions

## Development Guidelines

### Database Schema

- Users have many Resumes and Job Descriptions
- Applications link a Resume to a Job Description
- Both Resumes and JDs store embeddings for semantic search
- Use `gen_random_uuid()` for primary keys
- All tables have `created_at` and `updated_at` timestamps

### API Design

- RESTful endpoints with resource-based URLs
- Async/await for all database operations
- Pydantic models for request/response validation
- Standard HTTP status codes
- Rate limiting via Redis (100 req/min default)

### Frontend Patterns

- Server Components by default, Client Components when needed
- React Query for server state management
- Zustand for global client state
- Form validation with React Hook Form + Zod

### Code Style

- **TypeScript:** Strict mode enabled
- **Python:** Black formatter, Ruff linter
- **Commits:** Conventional commits (feat:, fix:, docs:)
- **Branches:** feature/, fix/, hotfix/ prefixes

## Testing

### Backend

- Pytest with async support
- Test database with `pytest-postgresql`
- Coverage goal: >80%

### Frontend

- Vitest for unit tests
- Playwright for E2E tests
- Testing Library for component tests

### MCP Servers

- Unit tests for tool functions
- Integration tests with mock MCP clients
- Validate against real-world JDs/resumes

## Environment Setup

1. **Clone and install:**
   ```bash
   npm install
   cp .env.example .env
   # Edit .env with your values
   ```

2. **Start infrastructure:**
   ```bash
   npm run docker:up
   ```

3. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

4. **Start development:**
   ```bash
   npm run dev
   ```

## Key Design Decisions

**Why MCP?** Modular AI services allow us to update specific capabilities (e.g., job matching) without touching the entire system.

**Why PGVector?** Native PostgreSQL extension means we can use SQL for vector operations and traditional queries in the same database.

**Why FastAPI?** Async support, automatic OpenAPI docs, and excellent Pydantic integration make it ideal for AI APIs.

**Why Next.js App Router?** Server Components reduce client JavaScript, React Cache improves performance, and the architecture aligns with modern React patterns.

## Current Status

- [x] Monorepo structure created
- [x] Docker Compose with PostgreSQL, Redis, PGVector
- [x] Database schema with migrations
- [ ] MCP servers implementation
- [ ] API endpoints
- [ ] Frontend application
- [ ] Authentication flow
- [ ] File upload handling

## Important Notes

- Never commit `.env` files
- All sensitive data must use environment variables
- Use prepared statements to prevent SQL injection
- Sanitize all user-generated content before AI processing
- Implement rate limiting on all public endpoints
