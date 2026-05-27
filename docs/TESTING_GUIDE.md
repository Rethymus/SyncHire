# Testing Guide - SyncHire Platform

## Overview

This guide provides comprehensive information about testing the SyncHire platform, including test infrastructure, best practices, and coverage goals.

## Table of Contents

1. [Test Infrastructure](#test-infrastructure)
2. [Frontend Testing](#frontend-testing)
3. [Backend Testing](#backend-testing)
4. [Testing Best Practices](#testing-best-practices)
5. [Running Tests](#running-tests)
6. [Coverage Goals](#coverage-goals)
7. [CI/CD Integration](#cicd-integration)

## Test Infrastructure

### Architecture

```
SyncHire/
├── frontend/
│   ├── src/
│   │   ├── test/
│   │   │   ├── setup.tsx           # Test setup and mocks
│   │   │   └── utils/
│   │   │       ├── test-renderers.tsx    # Custom render utilities
│   │   │       ├── test-data-factories.ts # Test data factories
│   │   │       ├── mock-api-handlers.ts   # API mocking
│   │   │       └── test-helpers.ts        # Helper functions
│   │   ├── __tests__/              # Integration tests
│   │   ├── lib/__tests__/          # Unit tests
│   │   └── components/__tests__/   # Component tests
│   └── vitest.config.ts            # Vitest configuration
└── api/
    ├── tests/
    │   ├── conftest.py             # Pytest fixtures
    │   ├── test_api_helpers.py     # API test utilities
    │   ├── test_critical_paths.py  # Critical path tests
    │   └── test_*.py               # Other test files
    └── pyproject.toml              # Pytest configuration
```

### Key Components

#### Frontend Test Infrastructure

1. **Test Renderers** (`test-renderers.tsx`)
   - Custom render functions with providers
   - Authentication context mocking
   - Router mocking
   - Query client configuration

2. **Test Data Factories** (`test-data-factories.ts`)
   - User, Resume, JD, Application factories
   - Error response factories
   - Form data factories
   - Mock session data

3. **Mock API Handlers** (`mock-api-handlers.ts`)
   - MSW handlers for all API endpoints
   - Consistent mocking across tests
   - Error scenario simulation

4. **Test Helpers** (`test-helpers.ts`)
   - Common test utilities
   - Accessibility assertions
   - Form validation helpers
   - Performance measurement

#### Backend Test Infrastructure

1. **Pytest Fixtures** (`conftest.py`)
   - Database fixtures (in-memory SQLite)
   - Test data generation
   - Authentication helpers
   - MCP server mocking

2. **API Test Helpers** (`test_api_helpers.py`)
   - Reusable test functions
   - Assertion helpers
   - Performance measurement
   - Bulk operations

3. **Critical Path Tests** (`test_critical_paths.py`)
   - Authentication flow
   - File upload flow
   - Application management
   - Search functionality

## Frontend Testing

### Test Setup

```typescript
// src/test/setup.tsx
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    // ...
  }),
}))

// Mock other dependencies
```

### Component Testing

```typescript
// Example component test
import { render, screen } from '@/test/utils/test-renderers'
import { createMockUser } from '@/test/utils/test-data-factories'

describe('UserProfile', () => {
  it('should display user information', () => {
    const mockUser = createMockUser()
    render(<UserProfile user={mockUser} />)

    expect(screen.getByText(mockUser.full_name)).toBeInTheDocument()
    expect(screen.getByText(mockUser.email)).toBeInTheDocument()
  })
})
```

### Integration Testing

```typescript
// Example integration test
import { renderWithAuth, screen, waitFor } from '@/test/utils/test-renderers'
import userEvent from '@testing-library/user-event'

describe('Login Flow', () => {
  it('should successfully login user', async () => {
    renderWithAuth(<LoginPage />)

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument()
    })
  })
})
```

### Accessibility Testing

```typescript
import { assertAccessibility } from '@/test/utils/test-helpers'

describe('Accessibility', () => {
  it('should be accessible', () => {
    const { container } = render(<MyComponent />)
    assertAccessibility(container)
  })
})
```

## Backend Testing

### Pytest Fixtures

```python
# Example fixture usage
@pytest.mark.asyncio
async def test_create_resume(client: AsyncClient, test_user: User, auth_headers):
    response = await client.post(
        "/resumes",
        headers=auth_headers,
        json={"title": "Software Engineer", "content": "Experience"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
```

### API Testing

```python
# Example API test
@pytest.mark.asyncio
async def test_list_resumes(client: AsyncClient, test_user: User, auth_headers):
    response = await client.get("/resumes", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "items" in data["data"]
```

### Performance Testing

```python
# Example performance test
@pytest.mark.asyncio
async def test_search_performance(client: AsyncClient, auth_headers, performance_thresholds):
    import time

    start_time = time.time()
    await client.get("/search/resumes?q=software", headers=auth_headers)
    response_time = time.time() - start_time

    assert response_time <= performance_thresholds["max_response_time"]
```

## Testing Best Practices

### Arrange-Act-Assert Pattern

```typescript
it('should update user profile', async () => {
  // Arrange
  const mockUser = createMockUser()
  const updatedData = { full_name: 'Updated Name' }

  // Act
  const result = await updateUserProfile(mockUser.id, updatedData)

  // Assert
  expect(result.full_name).toBe('Updated Name')
})
```

### Descriptive Test Names

```typescript
// Good
it('should redirect to login page when not authenticated')

// Bad
it('should redirect')
```

### Independent Tests

```typescript
// Each test should be independent
describe('Feature', () => {
  beforeEach(() => {
    // Clean up before each test
    cleanup()
  })

  it('test 1', () => {
    // No dependencies on other tests
  })
})
```

### Mock External Dependencies

```typescript
// Mock external APIs
vi.mock('@/lib/api', () => ({
  getUser: vi.fn(() => Promise.resolve(mockUser))
}))
```

### Test Edge Cases

```typescript
it('should handle empty input', () => {
  expect(() => validateInput('')).toThrow('Input is required')
})

it('should handle special characters', () => {
  expect(validateInput('<script>alert("xss")</script>')).toBe(false)
})
```

### Test Error Scenarios

```typescript
it('should show error message on API failure', async () => {
  server.use(
    http.post('/api/login', () => {
      return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    })
  )

  // Test error handling
})
```

## Running Tests

### Frontend Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test src/lib/__tests__/validation.test.ts

# Run tests matching pattern
npm run test -- --grep "authentication"
```

### Backend Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_critical_paths.py

# Run tests matching pattern
pytest -k "authentication"

# Run only fast tests
pytest -m "not slow"

# Run only integration tests
pytest -m integration
```

### Parallel Testing

```bash
# Frontend (Vitest runs in parallel by default)
npm run test

# Backend (use pytest-xdist)
pytest -n auto
```

## Coverage Goals

### Frontend Coverage Targets

- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

### Backend Coverage Targets

- **Statements**: 85%
- **Branches**: 80%
- **Functions**: 85%
- **Lines**: 85%

### Critical Path Coverage

- Authentication flow: 100%
- File upload flow: 100%
- Application management: 95%
- Search functionality: 90%

### Coverage Reports

```bash
# Frontend
npm run test:coverage
open coverage/index.html

# Backend
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: pytest --cov=app --cov-report=xml
      - uses: codecov/codecov-action@v3
```

### Pre-commit Hooks

```bash
# .husky/pre-commit
#!/bin/sh
npm run test
pytest
```

## Test Categories

### Unit Tests

- Fast execution (< 100ms per test)
- No external dependencies
- Test individual functions/components

### Integration Tests

- Test interaction between components
- Use test database
- Mock external APIs

### E2E Tests

- Test complete user flows
- Use real browser (Playwright)
- Slow execution

### Performance Tests

- Measure response times
- Check performance thresholds
- Identify bottlenecks

## Common Testing Scenarios

### Authentication

- Login with valid credentials
- Login with invalid credentials
- Signup new user
- Password reset flow
- 2FA setup and verification
- OAuth integration

### File Upload

- Upload PDF resume
- Upload Word document
- File size validation
- File type validation
- Upload progress tracking
- Error handling

### Application Management

- Create application
- Update status
- Filter applications
- Search applications
- Bulk operations

### Search

- Text search
- Filtered search
- Sorted results
- Pagination
- Performance

## Debugging Tests

### Frontend

```bash
# Run tests in debug mode
npm run test -- --inspect-brk

# Run specific test with logging
npm run test -- --grep "test name" --logHeapUsage
```

### Backend

```bash
# Run with pdb
pytest --pdb

# Run with verbose output
pytest -v -s

# Run with debugging
pytest --pdb-trace
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Pytest Documentation](https://docs.pytest.org/)
- [MSW Documentation](https://mswjs.io/)
- [Playwright Documentation](https://playwright.dev/)
