# Testing Quick Reference Guide

## Frontend Testing

### Import Test Utilities

```typescript
// Custom render with providers
import { renderWithProviders, renderWithAuth, renderWithRouter } from '@/test/utils/test-renderers'

// Test data factories
import {
  createMockUser,
  createMockResume,
  createMockJD,
  createMockApplication,
  createMockLoginForm,
} from '@/test/utils/test-data-factories'

// Mock API handlers
import { allHandlers } from '@/test/utils/mock-api-handlers'

// Test helpers
import {
  waitForLoadingToFinish,
  fillForm,
  submitForm,
  assertErrorMessage,
  assertSuccessMessage,
} from '@/test/utils/test-helpers'
```

### Common Test Patterns

#### Component Test

```typescript
import { render, screen } from '@/test/utils/test-renderers'
import { createMockUser } from '@/test/utils/test-data-factories'

describe('UserProfile', () => {
  it('should display user information', () => {
    const mockUser = createMockUser()
    render(<UserProfile user={mockUser} />)

    expect(screen.getByText(mockUser.full_name)).toBeInTheDocument()
  })
})
```

#### Form Test

```typescript
import { render, screen, waitFor } from '@/test/utils/test-renderers'
import userEvent from '@testing-library/user-event'

describe('LoginForm', () => {
  it('should submit form with valid data', async () => {
    render(<LoginForm />)

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument()
    })
  })
})
```

#### API Integration Test

```typescript
import { render, screen, waitFor } from '@/test/utils/test-renderers'
import { allHandlers } from '@/test/utils/mock-api-handlers'
import { setupServer } from 'msw/node'

const server = setupServer(...allHandlers)

describe('UserDashboard', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('should load user data', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Applications')).toBeInTheDocument()
    })
  })
})
```

## Backend Testing

### Import Test Utilities

```python
# Fixtures are automatically available
from tests.conftest import *

# API test helpers
from tests.test_api_helpers import APITestHelpers

# Use api_helpers fixture
async def test_something(client, db, api_helpers):
    user = await api_helpers.create_test_user()
    headers = await api_helpers.get_auth_headers(user)
    # ...
```

### Common Test Patterns

#### API Endpoint Test

```python
@pytest.mark.asyncio
async def test_create_resume(client: AsyncClient, test_user: User, auth_headers):
    response = await client.post(
        "/resumes",
        headers=auth_headers,
        json={
            "title": "Software Engineer",
            "content": "Experienced developer"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["title"] == "Software Engineer"
```

#### Authentication Test

```python
@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user: User):
    response = await client.post(
        "/auth/login",
        json={
            "email": "test@example.com",
            "password": "testpass123"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]["session"]
```

#### Database Test

```python
@pytest.mark.asyncio
async def test_application_creation(db: AsyncSession, test_user: User):
    import uuid
    from app.models.application import Application

    application = Application(
        id=uuid.uuid4(),
        user_id=test_user.id,
        resume_id=uuid.uuid4(),
        jd_id=uuid.uuid4(),
        status="applied"
    )

    db.add(application)
    await db.commit()
    await db.refresh(application)

    assert application.status == "applied"
```

## Test Data Factories

### Frontend

```typescript
// Create mock user
const user = createMockUser({
  email: 'custom@example.com',
  username: 'customuser'
})

// Create mock resume
const resume = createMockResume({
  title: 'Custom Title',
  ats_score: 90
})

// Create mock application
const application = createMockApplication({
  status: 'interview_scheduled',
  match_score: 0.92
})
```

### Backend

```python
# Create test user
user = await api_helpers.create_test_user(
    email="custom@example.com",
    username="customuser"
)

# Create test resume
resume = await api_helpers.create_test_resume(
    user,
    title="Custom Title",
    ats_score=90
)

# Create test application
application = await api_helpers.create_test_application(
    user,
    resume,
    jd,
    status="interview_scheduled"
)
```

## Running Tests

### Frontend

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run E2E with UI
npm run test:e2e:ui
```

### Backend

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_critical_paths.py

# Run only fast tests
pytest -m "not slow"

# Run only integration tests
pytest -m integration
```

## Test Markers

### Pytest Markers

```python
@pytest.mark.unit           # Unit tests (fast)
@pytest.mark.integration    # Integration tests (with database)
@pytest.mark.e2e           # End-to-end tests (slow)
@pytest.mark.slow          # Slow running tests
@pytest.mark.mcp           # MCP server tests
@pytest.mark.performance   # Performance tests
@pytest.mark.auth          # Authentication tests
```

### Vitest Markers

```typescript
describe('Feature', () => {
  it.skip('skipped test', () => {
    // This test will be skipped
  })

  it.only('focused test', () => {
    // Only this test will run
  })

  it.todo('test to be implemented', () => {
    // Placeholder for future test
  })
})
```

## Common Assertions

### Frontend

```typescript
// Element exists
expect(screen.getByText('Hello')).toBeInTheDocument()

// Element not exists
expect(screen.queryByText('Hello')).not.toBeInTheDocument()

// Element visible
expect(element).toBeVisible()

// Element has class
expect(element).toHaveClass('active')

// Element has attribute
expect(element).toHaveAttribute('href', '/home')

// Element has text
expect(element).toHaveTextContent('Hello World')

// Async assertion
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument()
})
```

### Backend

```python
# Status code
assert response.status_code == 200

# Response structure
data = response.json()
assert data["success"] is True

# Response data
assert data["data"]["title"] == "Expected Title"

# Error response
assert data["error"]["code"] == "VALIDATION_ERROR"

# Database state
result = await db.execute(select(User).where(User.id == user_id))
user = result.scalar_one()
assert user.email == "test@example.com"
```

## Debugging Tests

### Frontend

```bash
# Run with debug output
npm run test -- --reporter=verbose

# Run specific test
npm run test -- --grep "should login"

# Run tests in UI mode
npm run test:ui
```

### Backend

```bash
# Run with verbose output
pytest -v -s

# Run with debugger
pytest --pdb

# Run with traceback
pytest --tb=long

# Run specific test
pytest -k "test_login"
```

## Best Practices

### Test Structure

1. **Arrange-Act-Assert**
   ```typescript
   it('should update user', async () => {
     // Arrange
     const user = createMockUser()
     const updates = { name: 'Updated' }

     // Act
     const result = await updateUser(user.id, updates)

     // Assert
     expect(result.name).toBe('Updated')
   })
   ```

2. **Descriptive Names**
   ```typescript
   // Good
   it('should redirect to login when not authenticated')

   // Bad
   it('should redirect')
   ```

3. **Independent Tests**
   ```typescript
   beforeEach(() => {
     cleanup() // Clean up before each test
   })
   ```

### Coverage Targets

- **Critical paths**: 100%
- **Authentication**: 90%+
- **File operations**: 85%+
- **API endpoints**: 80%+
- **Utilities**: 85%+

## Resources

- [Testing Guide](./TESTING_GUIDE.md)
- [Coverage Report](./TEST_COVERAGE_REPORT.md)
- [Vitest Docs](https://vitest.dev/)
- [Pytest Docs](https://docs.pytest.org/)
- [Playwright Docs](https://playwright.dev/)
