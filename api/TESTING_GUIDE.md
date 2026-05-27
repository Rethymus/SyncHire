# SyncHire Backend Testing Guide

## Overview

Comprehensive testing infrastructure for SyncHire backend services following 2026 best practices with >80% code coverage requirement.

## Test Structure

```
api/tests/
├── conftest.py                    # Enhanced pytest configuration
├── test_application_service.py    # Application service tests
├── test_jd_service.py            # JD service tests
├── test_resume_service.py        # Resume service tests
├── test_search_service.py        # Search service tests
├── test_analytics_service.py     # Analytics service tests
├── test_api.py                   # API endpoint tests
├── test_mcp_integration.py       # MCP server integration tests
└── run_tests.py                  # Test execution script
```

## Test Categories

### Unit Tests (`@pytest.mark.unit`)
- Fast execution (< 1 second per test)
- No external dependencies (mocked)
- Test individual methods and functions
- Cover edge cases and error scenarios

### Integration Tests (`@pytest.mark.integration`)
- Test database interactions
- Test service integrations
- Use real database (in-memory SQLite)
- Slower execution but comprehensive coverage

### Performance Tests (`@pytest.mark.performance`)
- Benchmark critical operations
- Test query performance
- Validate response times
- Memory usage profiling

## Running Tests

### Run All Tests
```bash
# From project root
cd api
python -m pytest tests/

# Or using the test runner
python tests/run_tests.py all

# With coverage
python tests/run_tests.py all --coverage

# Parallel execution
python tests/run_tests.py all --parallel
```

### Run Specific Test Types
```bash
# Unit tests only
python tests/run_tests.py unit

# Service tests only
python tests/run_tests.py service

# Integration tests only
python tests/run_tests.py integration

# Performance tests
python tests/run_tests.py performance
```

### Run Specific Test Files
```bash
# Test specific service
python -m pytest tests/test_application_service.py -v

# Test specific class
python -m pytest tests/test_application_service.py::TestApplicationServiceCreate -v

# Test specific method
python -m pytest tests/test_application_service.py::TestApplicationServiceCreate::test_create_application_success -v
```

### Run Tests by Pattern
```bash
# Run all tests matching pattern
python tests/run_tests.py all -k "create"

# Run tests with specific markers
python tests/run_tests.py all -m "unit"

# Combine markers
python tests/run_tests.py all -m "unit and not slow"
```

## Coverage Requirements

### Target Coverage
- **Overall**: >80%
- **Services**: >85%
- **Critical Paths**: >95%

### Generate Coverage Report
```bash
# HTML report
python -m pytest --cov=app --cov-report=html

# Terminal report
python -m pytest --cov=app --cov-report=term-missing

# JSON report
python -m pytest --cov=app --cov-report=json

# Combined report
python tests/run_tests.py all --coverage
```

### View Coverage Report
```bash
# Open HTML report
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
start htmlcov/index.html  # Windows
```

## Test Fixtures

### Database Fixtures
```python
# In-memory SQLite database
@pytest.fixture
async def db_session():
    # Creates isolated database session
    # Rolls back changes after each test
    pass

# Test user
@pytest.fixture
async def test_user(db_session):
    # Creates test user with default data
    pass

# Test resume
@pytest.fixture
async def test_resume(db_session, test_user):
    # Creates test resume
    pass
```

### Mock Fixtures
```python
# Mock AI service
@pytest.fixture
def mock_ai_service():
    # Mocks all AI operations
    pass

# Mock storage service
@pytest.fixture
def mock_storage_service():
    # Mocks file storage operations
    pass

# Mock MCP client
@pytest.fixture
def mock_mcp_client():
    # Mocks MCP server calls
    pass
```

### Factory Fixtures
```python
# Resume factory
def test_resume_with_factory(resume_factory):
    resume = resume_factory(title="Custom Title")

# JD factory
def test_jd_with_factory(jd_factory):
    jd = jd_factory(company="Custom Company")

# Application factory
def test_application_with_factory(application_factory):
    app = application_factory(status="interview")
```

## Writing Tests

### Basic Test Structure
```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.unit
class TestMyService:
    """Test my service with comprehensive coverage"""

    @pytest.mark.asyncio
    async def test_success_case(self, db_session):
        """Test successful operation"""
        # Arrange
        user_id = uuid.uuid4()
        test_data = {"key": "value"}

        # Act
        result = await my_service.method(user_id, test_data)

        # Assert
        assert result.success is True
        assert result.data == test_data

    @pytest.mark.asyncio
    async def test_error_case(self, db_session):
        """Test error handling"""
        # Arrange
        user_id = uuid.uuid4()

        # Act & Assert
        with pytest.raises(ValidationError) as exc:
            await my_service.method(user_id, invalid_data)

        assert "validation error" in str(exc.value)
```

### Testing with Mocks
```python
@pytest.mark.asyncio
async def test_with_mocks(self, db_session):
    """Test with mocked dependencies"""
    with patch('app.services.my_service.external_api') as mock_api:
        # Setup mock
        mock_api.call.return_value = {"status": "success"}

        # Execute
        result = await my_service.method()

        # Verify
        assert result["status"] == "success"
        mock_api.call.assert_called_once()
```

### Testing Database Operations
```python
@pytest.mark.asyncio
async def test_database_operation(self, db_session):
    """Test database CRUD operations"""
    # Create
    entity = MyModel(name="Test")
    db_session.add(entity)
    await db_session.commit()

    # Read
    result = await db_session.execute(
        select(MyModel).where(MyModel.id == entity.id)
    )
    found = result.scalar_one_or_none()
    assert found is not None
    assert found.name == "Test"

    # Update
    found.name = "Updated"
    await db_session.commit()

    # Delete
    await db_session.delete(found)
    await db_session.commit()
```

### Testing Bulk Operations
```python
@pytest.mark.asyncio
async def test_bulk_operation(self, db_session):
    """Test bulk operations with partial failures"""
    # Create test data
    items = [create_test_item(i) for i in range(10)]

    # Execute bulk operation
    result = await my_service.bulk_operation(items)

    # Verify results
    assert result.success_count >= 8
    assert result.failed_count <= 2
    assert len(result.errors) == result.failed_count
```

### Testing Async Operations
```python
@pytest.mark.asyncio
async def test_async_processing(self, db_session):
    """Test async task processing"""
    with patch('app.services.my_service.TaskService') as mock_task:
        # Setup mock
        mock_task.submit_task.return_value = MagicMock(
            id=uuid.uuid4(),
            status="pending"
        )

        # Execute with async processing
        result = await my_service.process_async(
            data=test_data,
            async_processing=True
        )

        # Verify
        assert "task_id" in result
        mock_task.submit_task.assert_called_once()
```

## Best Practices

### 1. Test Naming
- Use descriptive names: `test_create_application_success`
- Include scenario: `test_delete_application_not_found`
- Include expected outcome: `test_update_application_validation_error`

### 2. Test Organization
- Group related tests in classes
- Use markers for categorization
- Follow AAA pattern (Arrange, Act, Assert)

### 3. Mock Usage
- Mock external dependencies only
- Use AsyncMock for async operations
- Verify mock calls when relevant

### 4. Database Tests
- Use fixtures for test data
- Clean up after each test
- Test rollback behavior

### 5. Error Testing
- Test all error paths
- Validate error messages
- Test error recovery

### 6. Performance Testing
- Use pytest-benchmark for critical paths
- Set performance thresholds
- Test with realistic data volumes

## CI/CD Integration

### GitHub Actions
```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd api
          pip install -r requirements.txt
      - name: Run tests
        run: |
          cd api
          python tests/run_tests.py all --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./api/coverage.json
```

### Pre-commit Hooks
```bash
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: pytest
        name: Run unit tests
        entry: python tests/run_tests.py unit
        language: system
        pass_filenames: false
```

## Troubleshooting

### Common Issues

1. **Async Test Timeouts**
   ```bash
   # Increase timeout
   pytest --timeout=10
   ```

2. **Database Lock Issues**
   ```python
   # Use separate sessions
   @pytest.fixture
   async def db_session():
       async with async_session() as session:
           yield session
   ```

3. **Import Errors**
   ```bash
   # Set PYTHONPATH
   export PYTHONPATH=/path/to/api
   python -m pytest tests/
   ```

4. **Coverage Not Generated**
   ```bash
   # Install pytest-cov
   pip install pytest-cov

   # Run with coverage
   pytest --cov=app tests/
   ```

## Performance Benchmarks

### Expected Performance
- Unit tests: < 1 second per test
- Integration tests: < 5 seconds per test
- Service tests: < 2 seconds per test
- Total suite: < 5 minutes

### Optimization Tips
1. Use pytest-xdist for parallel execution
2. Mock expensive operations
3. Use in-memory database for tests
4. Cache test fixtures where appropriate

## Coverage Goals by Service

| Service | Target | Current |
|---------|--------|---------|
| ApplicationService | 85% | TBD |
| JDService | 85% | TBD |
| ResumeService | 85% | TBD |
| SearchService | 80% | TBD |
| AnalyticsService | 80% | TBD |

## Additional Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Pytest Asyncio](https://pytest-asyncio.readthedocs.io/)
- [Pytest Mock](https://pytest-mock.readthedocs.io/)
- [Factory Boy](https://factoryboy.readthedocs.io/)
- [FreezeGun](https://github.com/spulec/freezegun)

## Contributing

When adding new features:
1. Write tests first (TDD)
2. Aim for >80% coverage
3. Test both success and failure cases
4. Update this guide with new patterns
5. Ensure CI/CD passes before merging
