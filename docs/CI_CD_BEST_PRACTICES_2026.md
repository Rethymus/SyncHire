# 2026 CI/CD Best Practices Implementation Guide

## Overview

This document outlines the 2026 CI/CD best practices implemented for the SyncHire project, based on comprehensive research of top projects and industry standards.

## Key Learnings from Research

### Frontend Testing (Next.js 16 + Vitest)

**Best Practices Discovered:**
- Vitest has become the preferred testing framework for Next.js 16 (replacing Jest)
- React Testing Library remains the standard for component testing
- Coverage thresholds should be set at 70% minimum, 80% for critical paths
- Mock Next.js modules (next/navigation, next/headers) for isolated testing
- Use MSW (Mock Service Worker) for API mocking

**Implementation:**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      thresholds: {
        global: { branches: 70, functions: 70, lines: 70, statements: 70 }
      }
    }
  }
})
```

### Backend Testing (FastAPI + pytest)

**Best Practices Discovered:**
- Use testcontainers for PostgreSQL in CI (no external dependencies)
- pytest-asyncio for async endpoint testing
- Mock external AI services (OpenAI, Anthropic) to avoid API key requirements
- Security scanning with Bandit + Safety + Semgrep
- Code quality tools: Black + Ruff + MyPy

**Implementation:**
```python
# tests/conftest.py
@pytest.fixture(scope="session")
async def postgres_container():
    with PostgresContainer("pgvector/pgvector:pg16") as postgres:
        yield postgres.get_connection_url()
```

### Monorepo CI/CD Strategies

**Best Practices Discovered:**
- Use Turborepo for monorepo management (preferred over Nx in 2026)
- Implement smart caching strategies for dependencies and builds
- Parallel job execution with proper dependency management
- Matrix testing across multiple Node.js and Python versions
- Quality gates to enforce standards before merge

**Implementation:**
```yaml
jobs:
  frontend-test:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
```

## CI/CD Pipeline Structure

### Current Implementation

Our CI/CD pipeline now includes:

1. **Setup Job**: Caches dependencies and determines versions
2. **Frontend Jobs**:
   - Lint (ESLint + TypeScript)
   - Test (Vitest with coverage)
   - Build (Production Next.js build)

3. **Backend Jobs**:
   - Security Scan (Bandit + Safety)
   - Lint (Black + Ruff + MyPy)
   - Test (pytest with PostgreSQL and Redis containers)

4. **Integration Tests**: End-to-end testing of full stack

5. **Quality Gate**: Final verification before merge

### Key Features

- ✅ **No external API dependencies**: All tests use mocks
- ✅ **Fast execution**: Parallel jobs and smart caching
- ✅ **Security scanning**: Automated vulnerability detection
- ✅ **Coverage reporting**: Integrated with Codecov
- ✅ **Type safety**: TypeScript and MyPy checks

## Testing Without API Keys

### Frontend Mocking Strategy

```typescript
// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  })
}))

// Mock AI services
vi.mock('@/lib/ai', () => ({
  generateResumeOptimization: vi.fn(),
  analyzeJobDescription: vi.fn()
}))
```

### Backend Mocking Strategy

```python
# Mock OpenAI API
@patch('openai.ChatCompletion.create')
def test_with_mocked_openai(mock_create):
    mock_create.return_value = {
        "choices": [{"message": {"content": "Mocked response"}}]
    }
    # Test code here
```

## Quality Gates

### Code Coverage Thresholds

- **Global**: 70% minimum
- **Critical components**: 80% minimum
- **Security-sensitive code**: 90% minimum

### Security Scanning

- **Bandit**: Python security issues
- **Safety**: Dependency vulnerabilities
- **ESLint**: Security rules for JavaScript

### Type Safety

- **TypeScript strict mode**: Enabled
- **MyPy strict mode**: Enabled
- **No `any` types**: Enforced in linting

## Common Challenges and Solutions

### Challenge 1: Slow CI/CD Pipeline

**Solution**: Implement smart caching and parallelization
```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: package-lock.json
```

### Challenge 2: Flaky Tests

**Solution**: Use testcontainers and proper async handling
```python
@pytest.mark.asyncio
async def test_async_endpoint(client):
    response = await client.get("/async-endpoint")
    assert response.status_code == 200
```

### Challenge 3: External API Dependencies

**Solution**: Comprehensive mocking strategy
- Use `pytest-mock` for Python
- Use `vi.mock` for Vitest
- Create realistic mock responses
- Test error handling with mock failures

## Tools and Versions (2026)

### Frontend
- **Vitest**: 2.1.8 (latest)
- **React Testing Library**: 16.1.0
- **jsdom**: 25.0.1
- **TypeScript**: 5.x strict mode

### Backend
- **pytest**: 8.3.4
- **pytest-asyncio**: 0.24.0
- **testcontainers**: 4.9.0
- **Black**: 25.1.0
- **Ruff**: 0.9.2
- **Mypy**: 1.14.1

### CI/CD
- **GitHub Actions**: Latest
- **Node.js**: 22.x LTS
- **Python**: 3.11.x

## Migration from Previous Setup

### Removed
- ❌ Jest (replaced by Vitest)
- ❌ External API key dependencies
- ❌ Slow sequential test execution
- ❌ Manual quality checks

### Added
- ✅ Vitest with coverage
- ✅ Testcontainers for database testing
- ✅ Automated security scanning
- ✅ Parallel job execution
- ✅ Pre-commit hooks

## Future Enhancements

### Planned
- [ ] E2E testing with Playwright
- [ ] Performance regression testing
- [ ] Accessibility testing in CI
- [ ] Visual regression testing
- [ ] Load testing with k6

### Under Consideration
- [ ] Turborepo integration for monorepo
- [ ] Nx for advanced dependency management
- [ ] Distributed caching with Remote Cache
- [ ] Canary deployments

## Best Practices Summary

### DO ✅
- Use testcontainers for database testing
- Mock all external API calls
- Set coverage thresholds
- Run tests in parallel
- Cache dependencies aggressively
- Scan for security vulnerabilities
- Use type checking (TypeScript + MyPy)
- Implement pre-commit hooks

### DON'T ❌
- Use real API keys in tests
- Run tests sequentially
- Skip security scanning
- Ignore coverage thresholds
- Use `any` types
- Commit without passing tests
- Mix concerns in tests

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [FastAPI Testing Guide](https://fastapi.tiangolo.com/tutorial/testing/)
- [Testcontainers Python](https://testcontainers-python.readthedocs.io/)
- [GitHub Actions Best Practices](https://docs.github.com/en/actions)
- [Next.js 16 Documentation](https://nextjs.org/docs)

---

**Last Updated**: 2026-05-24
**Maintained By**: SyncHire Development Team
