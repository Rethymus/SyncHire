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

- **Frontend:** Next.js 16.2.6 (App Router + Turbopack), TypeScript 5, TailwindCSS 4, shadcn/ui
- **Backend:** FastAPI (Python 3.11+), async/await
- **Database:** PostgreSQL 16 + PGVector for embeddings
- **Cache/Queue:** Redis 7
- **Storage:** Minio (S3-compatible) for resume/JD files
- **AI:** OpenAI GPT-4, Anthropic Claude 3
- **Authentication:** JWT, OAuth2 (Google, GitHub)
- **Linting:** ESLint 9 with flat config, typescript-eslint
- **State Management:** Zustand 5, React Query (TanStack Query)
- **Testing:** Vitest, Playwright, Testing Library

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
- **Commits:** Conventional commits (feat:, fix:, docs:, refactor:, test:, chore:)
- **Branches:** feature/, fix/, hotfix/ prefixes
- **Language:** All commit messages and code comments MUST be in English only

## Vibe Coding Development Workflow (2026 Best Practices)

### Core Development Principles

Based on the latest vibe coding research and Next.js 16 + ESLint 9 best practices:

1. **Anchor on a Stack**: Pick one language + framework + database combo and stick to it
   - Frontend: Next.js 16 + TypeScript 5 + TailwindCSS 4
   - Backend: FastAPI + Python 3.11+ + PostgreSQL 16

2. **Clean Guardrails**: Use automated tools to maintain code quality
   - ESLint 9 flat config with type-checked rules
   - TypeScript strict mode for compile-time safety
   - Pre-commit hooks for formatting and linting

3. **Progressive Enhancement**: Start simple, add complexity incrementally
   - Begin with recommended configs, gradually add stricter rules
   - Build core features first, optimize later based on metrics

4. **Code Review Discipline**: All changes must pass local CI/CD before pushing
   - No exceptions to quality gates
   - Automated checks override manual processes

### Local CI/CD Validation Pipeline

**MANDATORY**: Every commit must pass ALL local validation before pushing:

```bash
# 1. TypeScript compilation (must have 0 errors)
npm run type-check

# 2. Production build (must succeed)
npm run build

# 3. ESLint (target: 0 errors, acceptable warnings)
npm run lint
```

**Acceptance Criteria**:
- TypeScript: 0 errors
- Build: Success with no fatal errors
- ESLint: 0 errors, warnings are acceptable if justified

### Git Workflow & Standards

**Repository**: https://github.com/Rethymus/synchire (Private)
**Branch Strategy**: Main branch protection with CI gates

**Commit Message Format** (Conventional Commits):
```
<type>: <description>

[optional body]

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

**Types**: feat, fix, docs, style, refactor, test, chore, perf, ci, build

**Examples**:
```bash
feat: add user authentication with JWT tokens
fix: resolve memory leak in resume parser
refactor: optimize database query performance
test: add unit tests for job matching algorithm
ci: upgrade GitHub Actions to use Node.js 22
```

**STRICT RULE**: NO CHINESE in commits, comments, or code documentation.

### ESLint 9 + Next.js 16 Configuration

**Key Changes from Previous Versions**:
- `next lint` command removed in Next.js 16
- ESLint 9 only supports flat config format
- Use `eslint.config.mjs` instead of `.eslintrc.*` files

**Current Configuration** (`eslint.config.mjs`):
```javascript
import { defineConfig, globalIgnores } from 'eslint/config'
import nextPlugin from 'eslint-config-next'

export default defineConfig([
  globalIgnores(['.next/**', 'node_modules/**', 'next-env.d.ts']),
  ...nextPlugin, // Includes core-web-vitals and TypeScript rules
  {
    name: 'project/tests',
    files: ['**/__tests__/**/*.{ts,tsx,js}', '**/*.test.{ts,tsx,js}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
])
```

**Package.json Scripts** (Next.js 16 Standard):
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "npm run lint && npm run type-check && next build",
    "start": "next start",
    "lint": "eslint --cache --cache-location .next/cache/eslint/",
    "lint:fix": "eslint --fix",
    "type-check": "tsc --noEmit"
  }
}
```

### Code Quality Standards

**TypeScript Rules**:
- No `any` types (use proper interfaces or `unknown` for truly dynamic data)
- Strict null checks enabled
- All function parameters and return types explicitly typed
- Use `readonly` for immutable arrays/objects

**React Best Practices**:
- Use React.memo() for expensive components
- Implement useCallback/useMemo to prevent unnecessary re-renders
- Avoid calling setState synchronously in useEffect
- Never call React hooks conditionally
- Use `useId()` unconditionally, then apply conditionally to the result

**Security Standards**:
- Sanitize all user input with DOMPurify before rendering HTML
- Use CSRF tokens for state-changing operations
- Validate all data on both client and server
- Never expose sensitive data in client-side code
- Implement rate limiting on all public endpoints

**Accessibility (WCAG 2.1 AA)**:
- All interactive elements must have accessible names
- Keyboard navigation must work for all features
- Color contrast ratio ≥ 4.5:1 for normal text
- Use semantic HTML (button, a, input) instead of div/span
- All forms must have proper labels and error associations

### Performance Optimization Guidelines

**Frontend Performance**:
- Lazy load routes and heavy components
- Implement code splitting for large bundles
- Use React Query for efficient data fetching and caching
- Optimize images (WebP format, lazy loading, proper sizing)
- Minimize client-side JavaScript with Server Components

**Database Performance**:
- Use indexes on frequently queried columns
- Implement connection pooling
- Cache expensive queries with Redis
- Use prepared statements for all queries
- Monitor query performance with EXPLAIN ANALYZE

### Testing Strategy

**Unit Tests** (Vitest):
- Test business logic in isolation
- Mock external dependencies
- Aim for >80% coverage of critical paths

**Integration Tests**:
- Test API endpoints with real database
- Validate data flow between components
- Test authentication and authorization flows

**E2E Tests** (Playwright):
- Test critical user journeys
- Validate cross-browser compatibility
- Test mobile responsiveness

### MCP Server Development

**Each MCP server must**:
1. Export tool functions with proper TypeScript types
2. Include comprehensive error handling
3. Validate all inputs before processing
4. Log all operations for debugging
5. Include integration tests with mock data

### Deployment Pipeline

**Pre-deployment Checklist**:
- [ ] All tests pass locally
- [ ] TypeScript compilation succeeds
- [ ] Production build completes without errors
- [ ] ESLint shows 0 errors
- [ ] Security scan passes
- [ ] Performance metrics meet targets
- [ ] Documentation is updated

**GitHub Actions CI** runs on:
- Push to main branch
- Pull requests to main branch
- Manual workflow dispatch

**Deployment Environments**:
- `development`: Auto-deploy on push to develop branch
- `staging`: Auto-deploy after PR approval
- `production`: Manual deployment with release tags

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

### Completed (Latest)
- [x] Monorepo structure created
- [x] Docker Compose with PostgreSQL, Redis, PGVector
- [x] Database schema with migrations
- [x] Next.js 16.2.6 frontend with App Router
- [x] ESLint 9 flat config configuration
- [x] TypeScript 5 strict mode implementation
- [x] React Query for efficient data fetching
- [x] DOMPurify integration for XSS protection
- [x] WCAG 2.1 AA accessibility compliance
- [x] React performance optimizations (memo, useCallback, useMemo)
- [x] CSRF protection implementation
- [x] Zustand state management setup
- [x] Secure markdown rendering with marked + DOMPurify
- [x] GitHub Actions CI/CD pipeline
- [x] Local CI/CD validation workflow
- [x] Vibe coding development standards established

### In Progress
- [ ] MCP servers implementation
- [ ] Authentication flow (frontend UI complete, backend API pending)
- [ ] File upload handling

### Pending
- [ ] API endpoints implementation
- [ ] Resume analysis algorithms
- [ ] Job description parsing
- [ ] AI-powered job matching
- [ ] Interview preparation features

## Important Notes

- Never commit `.env` files
- All sensitive data must use environment variables
- Use prepared statements to prevent SQL injection
- Sanitize all user-generated content before AI processing
- Implement rate limiting on all public endpoints

## Vibe Coding Trends & Best Practices (2026)

### Current Technology Landscape

**Next.js 16 Breaking Changes**:
- Removed `next lint` command (use ESLint directly)
- Removed automatic linting during `next build`
- ESLint plugin defaults to flat config format
- `eslint` option in `next.config.mjs` no longer supported

**ESLint 9 Migration**:
- Legacy `.eslintrc.*` files deprecated (removed in ESLint v10)
- Flat config is now the default and only supported format
- Use `defineConfig` helper for better TypeScript support
- `typescript-eslint` v8 provides unified parser + plugin package

**Vibe Coding Philosophy**:
- **Flow State**: Automate repetitive tasks, focus on creative problem-solving
- **Guardrails**: Let tools enforce standards, not manual code reviews
- **Progressive Enhancement**: Start simple, add complexity based on metrics
- **Continuous Validation**: Run checks locally before pushing

### Modern Development Stack (2026)

**Recommended Tooling**:
- **Linting**: ESLint 9 + typescript-eslint v8 + @eslint/js
- **Formatting**: Prettier or @stylistic/eslint-plugin (for ESLint-only setup)
- **Type Checking**: TypeScript 5 with strict mode + type-checked lint rules
- **Package Management**: npm workspaces or pnpm workspaces
- **Git Hooks**: husky + lint-staged for pre-commit validation
- **CI/CD**: GitHub Actions with caching for faster builds

**Performance Tools**:
- **Profiling**: Chrome DevTools Performance tab
- **Bundle Analysis**: @next/bundle-analyzer
- **Monitoring**: Vercel Analytics or Sentry
- **Testing**: Vitest (fast) + Playwright (E2E)

### Anti-Patterns to Avoid

1. **Over-engineering**: Don't add abstractions "just in case"
2. **Premature optimization**: Measure first, optimize based on data
3. **Ignoring TypeScript errors**: Fix the root cause, don't use `// @ts-ignore`
4. **Skipping tests**: Tests prevent regressions, write them for critical paths
5. **Committing without validation**: Always run local CI/CD before pushing

### Resources for Continuous Learning

**Official Documentation**:
- Next.js: https://nextjs.org/docs (check version-specific guides)
- ESLint 9: https://eslint.org/latest/docs/
- TypeScript: https://www.typescriptlang.org/docs/
- React: https://react.dev/ (new React documentation)

**Community Resources**:
- GitHub Discussions: r/vibecoding subreddit
- ESLint Config Inspector: `npm run lint:inspect`
- Next.js Discord: Active community support
- Stack Overflow: Tag questions with next.js16, eslint9

**Learning Path**:
1. Master the fundamentals (TypeScript, React, Next.js)
2. Learn the tooling (ESLint, Prettier, Git)
3. Understand performance optimization techniques
4. Study security best practices (OWASP Top 10)
5. Practice accessibility (WCAG guidelines)
6. Stay updated with official blogs and release notes

## MCP (Model Context Protocol) Server Architecture

### Server Design Principles

Each MCP server follows a consistent architecture:

1. **Tool Functions**: Export named functions with clear purposes
2. **Input Validation**: Use Pydantic models for all inputs
3. **Error Handling**: Catch and log all exceptions, return user-friendly messages
4. **Type Safety**: Use TypeScript definitions for tool schemas
5. **Testing**: Include unit tests and integration tests

### Server Development Workflow

```python
# MCP Server Structure
mcp-servers/
├── server-name/
│   ├── src/
│   │   ├── main.py          # MCP server setup
│   │   ├── tools.py         # Tool functions
│   │   ├── models.py        # Pydantic models
│   │   └── utils.py         # Helper functions
│   ├── tests/
│   │   ├── test_tools.py    # Unit tests
│   │   └── test_integration.py
│   ├── pyproject.toml       # Dependencies
│   └── README.md            # Documentation
```

### AI Integration Guidelines

**When using AI services**:
1. Validate all user input before sending to AI
2. Sanitize AI responses before displaying to users
3. Implement rate limiting for AI API calls
4. Cache responses when appropriate
5. Log AI interactions for debugging
6. Handle AI service failures gracefully
7. Never expose API keys in client-side code

**Prompt Engineering Best Practices**:
- Use few-shot examples in system prompts
- Be specific about expected output format
- Include constraints to prevent harmful content
- Test prompts with edge cases
- Version control prompt templates

### Known AI Limitations

**Current Challenges**:
- AI may hallucinate facts or skills
- Context window limits for large documents
- Rate limiting and cost considerations
- Language bias in trained models
- Difficulty with very recent information

**Mitigation Strategies**:
- Validate AI claims against trusted sources
- Break large documents into chunks
- Implement caching to reduce API calls
- Use multiple AI models for cross-validation
- Provide source attribution for AI-generated content
