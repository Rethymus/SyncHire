# SyncHire Developer Guide

Comprehensive guide for contributing to and developing the SyncHire platform.

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Architecture](#project-architecture)
3. [Development Workflow](#development-workflow)
4. [Code Style Guide](#code-style-guide)
5. [Testing Guidelines](#testing-guidelines)
6. [API Development](#api-development)
7. [Frontend Development](#frontend-development)
8. [MCP Server Development](#mcp-server-development)
9. [Database Development](#database-development)
10. [Deployment](#deployment)
11. [Performance Optimization](#performance-optimization)
12. [Security Best Practices](#security-best-practices)

## Development Environment Setup

### Prerequisites

- **Node.js** 22+ (engines: >=22.0.0)
- **npm** 10+ (engines: >=10.0.0)
- **Python** 3.11+
- **Docker** and Docker Compose
- **Git** for version control
- **Make** for build automation

### Initial Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Rethymus/synchire.git
   cd SyncHire
   ```

2. **Install Dependencies**
   ```bash
   # Install all workspace dependencies
   npm install
   
   # Install the frontend workspace
   npm install --workspace=frontend

   # Install backend dependencies
   cd api
   python -m pip install -r requirements.txt
   cd ..
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Start Infrastructure**
   ```bash
   npm run docker:up
   ```

5. **Initialize Database**
   ```bash
   npm run db:migrate
   ```

6. **Start Development Servers**
   ```bash
   # Start all services
   npm run dev
   
   # Or start individually
   npm run dev:frontend  # Next.js dev server
   npm run dev:api       # FastAPI dev server
   npm run dev:mcp       # MCP servers
   ```

### Development Tools

**Recommended IDE Setup:**
- **VS Code** with extensions:
  - ESLint
  - Prettier
  - TypeScript Vue Plugin
  - Auto Rename Tag
  - Error Lens

**Required Global Tools:**
```bash
npm install -g typescript
npm install -g eslint
npm install -g prettier
```

## Project Architecture

### Monorepo Structure

```
SyncHire/
├── frontend/                 # Next.js 16 application
│   ├── app/                 # App Router pages
│   ├── components/          # React components
│   ├── lib/                 # Utilities & helpers
│   ├── public/              # Static assets
│   └── package.json
├── api/                     # FastAPI backend
│   ├── app/
│   │   ├── api/             # API routers
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   └── core/            # Config, database, security
│   ├── main.py              # Canonical server entrypoint
│   ├── main_lite.py         # Local-first desktop/Electron entrypoint
│   └── tests/               # Backend tests
├── mcp-servers/            # AI processing servers
│   ├── jd-parser/
│   ├── resume-analyzer/
│   ├── job-matcher/
│   └── interview-prep/
├── db/                      # Database schemas
│   └── migrations/          # Alembic migrations
├── docs/                    # Documentation
├── deploy/                  # Deployment configs
├── k8s/                     # Kubernetes manifests
└── package.json            # Root workspace config
```

### Technology Stack

**Frontend:**
- Next.js 16.2.6 (App Router + Turbopack)
- TypeScript 5 (strict mode)
- TailwindCSS 4
- React Query (TanStack Query)
- Zustand 5 (state management)

**Backend:**
- FastAPI (Python 3.11+)
- PostgreSQL 16 + PGVector
- Redis 7
- Alembic (migrations)

**AI/ML:**
- OpenAI GPT-4
- Anthropic Claude 3
- Custom MCP servers

### Key Design Patterns

1. **Monorepo Architecture**: npm workspaces for unified dependency management
2. **MCP Pattern**: Modular AI processing with independent servers
3. **Repository Pattern**: Database access abstraction in API layer
4. **Component Composition**: Reusable React components with shadcn/ui
5. **Service Layer**: Business logic separation in API services

## Development Workflow

### Git Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # Or for bug fixes
   git checkout -b fix/bug-description
   ```

2. **Make Changes**
   - Follow code style guidelines
   - Write tests for new features
   - Update documentation

3. **Pre-commit Validation**
   ```bash
   # Run all checks
   npm run lint
   npm run type-check
   npm run test
   npm run build
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push & Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create PR on GitHub
   ```

### Commit Message Format

Follow Conventional Commits specification:

```
<type>: <description>

[optional body]

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

**Examples:**
```bash
feat: implement user authentication with OAuth2
fix: resolve memory leak in resume parser
docs: update API documentation with new endpoints
refactor: optimize database query performance
test: add unit tests for job matching algorithm
```

### Pull Request Guidelines

1. **PR Title**: Use conventional commit format
2. **PR Description**: Include:
   - What changes were made
   - Why the changes were needed
   - How to test the changes
   - Related issue numbers
3. **Testing**: All tests must pass
4. **Review**: Address all review comments
5. **Approval**: At least one approval required

## Code Style Guide

### TypeScript Guidelines

**Type Safety:**
```typescript
// ✅ Good: Explicit types
function calculateMatch(score: number): MatchResult {
  return { score, status: score > 80 ? 'high' : 'low' };
}

// ❌ Bad: Any types
function calculateMatch(score: any): any {
  return { score, status: score > 80 ? 'high' : 'low' };
}
```

**Null Safety:**
```typescript
// ✅ Good: Proper null handling
function getUser(id: string): User | null {
  const user = users.find(u => u.id === id);
  return user ?? null;
}

// ❌ Bad: Potential null reference
function getUser(id: string): User {
  return users.find(u => u.id === id)!;
}
```

**Async/Await:**
```typescript
// ✅ Good: Proper async handling
async function fetchJobs(): Promise<Job[]> {
  try {
    const response = await fetch('/api/jobs');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
    return [];
  }
}
```

### React Best Practices

**Component Structure:**
```typescript
// ✅ Good: Organized component
interface JobCardProps {
  job: Job;
  onApply: (jobId: string) => void;
}

export function JobCard({ job, onApply }: JobCardProps) {
  const [isApplied, setIsApplied] = useState(false);
  
  const handleApply = useCallback(() => {
    onApply(job.id);
    setIsApplied(true);
  }, [job.id, onApply]);
  
  return (
    <div className="job-card">
      <h3>{job.title}</h3>
      <button onClick={handleApply} disabled={isApplied}>
        {isApplied ? 'Applied' : 'Apply'}
      </button>
    </div>
  );
}
```

**Performance Optimization:**
```typescript
// ✅ Good: Memoized expensive component
export const JobList = memo(function JobList({ jobs }: JobListProps) {
  return (
    <div className="job-list">
      {jobs.map(job => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
});
```

### Python Guidelines

**Type Hints:**
```python
# ✅ Good: Proper type hints
from typing import List, Optional
from pydantic import BaseModel

class JobMatch(BaseModel):
    score: float
    status: str
    gaps: List[str]

def calculate_match(resume: Resume, jd: JobDescription) -> JobMatch:
    """Calculate compatibility score between resume and job."""
    return JobMatch(score=0.85, status="high", gaps=[])
```

**Async/Await:**
```python
# ✅ Good: Proper async handling
async def get_user_jobs(user_id: str) -> List[Job]:
    try:
        async with database.transaction():
            jobs = await Job.filter(user_id=user_id).all()
            return jobs
    except Exception as e:
        logger.error(f"Failed to fetch jobs: {e}")
        return []
```

## Testing Guidelines

### Unit Testing (Vitest)

**Frontend Tests:**
```typescript
import { describe, it, expect } from 'vitest';
import { calculateMatchScore } from '@/lib/match-calculator';

describe('calculateMatchScore', () => {
  it('calculates correct match score', () => {
    const resume = createMockResume();
    const jd = createMockJobDescription();
    
    const result = calculateMatchScore(resume, jd);
    
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
```

### Integration Testing

**API Tests:**
```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_job_match(client: AsyncClient):
    response = await client.post(
        "/api/jobs/match",
        json={
            "resume_id": "test-resume-id",
            "jd_id": "test-jd-id"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "match_score" in data
```

### E2E Testing (Playwright)

**User Journey Tests:**
```typescript
import { test, expect } from '@playwright/test';

test('user can upload and analyze resume', async ({ page }) => {
  await page.goto('/upload');
  await page.setInputFiles('input[type="file"]', 'test-resume.pdf');
  await page.click('button[type="submit"]');
  
  await expect(page.locator('.analysis-results')).toBeVisible();
  await expect(page.locator('.skill-score')).toContainText(/\d+/);
});
```

## API Development

### RESTful Endpoint Design

**Resource-Based URLs:**
```
GET    /api/jobs              # List jobs
POST   /api/jobs              # Create job
GET    /api/jobs/{id}         # Get specific job
PUT    /api/jobs/{id}         # Update job
DELETE /api/jobs/{id}         # Delete job
```

**Request/Response Patterns:**
```python
# Request validation
class JobCreateRequest(BaseModel):
    title: str
    description: str
    requirements: List[str]
    
# Response structure
class JobResponse(BaseModel):
    id: str
    title: str
    description: str
    created_at: datetime
    updated_at: datetime
```

### Error Handling

**Standardized Error Responses:**
```python
from fastapi import HTTPException, status

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    )
```

## Frontend Development

### Component Guidelines

**Component Structure:**
```
components/
├── ui/                    # Base UI components (shadcn/ui)
│   ├── button.tsx
│   ├── input.tsx
│   └── card.tsx
├── features/              # Feature-specific components
│   ├── resume-upload.tsx
│   ├── job-card.tsx
│   └── match-results.tsx
└── layouts/               # Layout components
    ├── header.tsx
    ├── footer.tsx
    └── sidebar.tsx
```

**State Management:**
```typescript
// Zustand store example
import { create } from 'zustand';

interface JobStore {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  fetchJobs: () => Promise<void>;
  addJob: (job: Job) => void;
}

export const useJobStore = create<JobStore>((set) => ({
  jobs: [],
  loading: false,
  error: null,
  
  fetchJobs: async () => {
    set({ loading: true, error: null });
    try {
      const jobs = await api.jobs.list();
      set({ jobs, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  
  addJob: (job) => set((state) => ({ 
    jobs: [...state.jobs, job] 
  })),
}));
```

### Performance Optimization

**Code Splitting:**
```typescript
// Dynamic imports for heavy components
const JobAnalyzer = dynamic(() => import('@/components/job-analyzer'), {
  loading: () => <Spinner />,
  ssr: false
});
```

**Data Fetching:**
```typescript
// React Query for efficient data fetching
const { data: jobs, isLoading } = useQuery({
  queryKey: ['jobs'],
  queryFn: () => api.jobs.list(),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

## MCP Server Development

### Server Structure

```
mcp-server-name/
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── types.ts           # TypeScript definitions
│   ├── processor.ts       # Core processing logic
│   └── utils.ts           # Helper functions
├── build/                 # Compiled JavaScript
├── tests/
│   ├── unit.test.ts
│   └── integration.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

### MCP Tool Implementation

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server({
  name: 'mcp-server-name',
  version: '1.0.0'
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'your_tool_name') {
    try {
      const result = await processTool(args);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result)
        }]
      };
    } catch (error) {
      throw new Error(`Tool execution failed: ${error.message}`);
    }
  }
  
  throw new Error(`Unknown tool: ${name}`);
});
```

## Database Development

### Migration Management

**Create Migration:**
```bash
cd api
alembic revision --autogenerate -m "Add job_matches table"
alembic upgrade head
```

**Migration File:**
```python
"""add job_matches table

Revision ID: 001
Revises: 
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    op.create_table(
        'job_matches',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('resume_id', sa.String(), nullable=False),
        sa.Column('jd_id', sa.String(), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('gaps', postgresql.JSONB(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('job_matches')
```

### Query Optimization

**Index Usage:**
```python
# Efficient query with index
async def get_user_recent_jobs(user_id: str, limit: int = 10):
    return await Job.filter(
        user_id=user_id
    ).order_by(
        Job.created_at.desc()
    ).limit(limit).all()
```

**N+1 Prevention:**
```python
# Use select_related and prefetch_related
async def get_jobs_with_companies():
    return await Job.all().select_related('company').prefetch_related('skills')
```

## Deployment

### Build Process

```bash
# Build all workspaces
npm run build

# Build specific workspace
npm run build --workspace=frontend

# Validate backend package imports
cd api
python -m pytest tests/test_api.py::TestHealthEndpoints -v --tb=short
```

### Docker Deployment

```bash
# Build containers
docker-compose build

# Start production environment
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f
```

### Environment Variables

**Required for Production:**
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379

# Security
JWT_SECRET=your-production-secret
CORS_ORIGINS=https://synchire.com

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Performance Optimization

### Frontend Performance

**Key Metrics:**
- First Contentful Paint (FCP) < 1.8s
- Largest Contentful Paint (LCP) < 2.5s
- Total Blocking Time (TBT) < 200ms
- Cumulative Layout Shift (CLS) < 0.1

**Optimization Techniques:**
```typescript
// 1. Code splitting
const Dashboard = lazy(() => import('@/app/dashboard'));

// 2. Image optimization
import Image from 'next/image';
<Image src="/logo.png" width={200} height={100} loading="lazy" />

// 3. Memoization
const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  return <div>{/* expensive rendering */}</div>;
});
```

### Backend Performance

**Database Optimization:**
```python
# Connection pooling
database = Database(DATABASE_URL, min_size=5, max_size=20)

# Query optimization
async def get_jobs_paginated(page: int, size: int):
    offset = (page - 1) * size
    return await Job.all().limit(size).offset(offset)
```

**Caching Strategy:**
```python
# Redis caching
async def get_job_analytics(job_id: str):
    cache_key = f"job:analytics:{job_id}"
    cached = await redis.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    analytics = await calculate_analytics(job_id)
    await redis.setex(cache_key, 3600, json.dumps(analytics))
    return analytics
```

## Security Best Practices

### Input Validation

```python
from pydantic import BaseModel, validator

class JobCreate(BaseModel):
    title: str
    description: str
    
    @validator('title')
    def title_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Title cannot be empty')
        return v.strip()
    
    @validator('description')
    def sanitize_description(cls, v):
        return sanitize_html(v)  # DOMPurify equivalent
```

### Authentication & Authorization

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    token = credentials.credentials
    user = await verify_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    return user
```

### Data Protection

**GDPR Compliance:**
- Implement right to data export
- Implement right to data deletion
- Obtain explicit consent for data processing
- Maintain data processing records

**Rate Limiting:**
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/jobs")
@limiter.limit("10/minute")
async def create_job(request: Request, job: JobCreate):
    return await job_service.create(job)
```

---

**Additional Resources:**
- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
