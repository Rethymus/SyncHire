"""
Enhanced Pytest configuration and fixtures for 2026 best practices

This file provides:
- Async fixtures with pytest-asyncio
- Mock configurations for external services
- Test data factories with Faker
- MCP server mocking fixtures
- Performance testing utilities
- API test helpers
"""

import pytest
from faker import Faker
from unittest.mock import AsyncMock, MagicMock
from typing import Dict, Any, Generator, Optional
import httpx
import tempfile
import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.database import Base, get_db
from app.models.user import User
from app.models.resume import Resume
from app.models.jd import JD
from app.models.application import Application
from app.models.interview import Interview
import asyncio
from datetime import datetime, timedelta
import json


# Test database URL (use in-memory SQLite for faster tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


# Async database fixture with in-memory SQLite
@pytest.fixture
async def db_engine():
    """Create test database engine with in-memory SQLite"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def db_session(db_engine) -> AsyncSession:
    """Create test database session"""
    async_session = async_sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        yield session


# Fixture for tests that expect 'db' parameter
@pytest.fixture
def db(db_session) -> AsyncSession:
    """Alias for db_session for backward compatibility"""
    return db_session


# HTTP Client fixture
@pytest.fixture
async def client(db_session: AsyncSession):
    """Create test HTTP client"""
    import sys
    import os

    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    from httpx import AsyncClient, ASGITransport
    from main import app

    # Dependency override
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


# Test user fixtures
@pytest.fixture
async def test_user(db: AsyncSession) -> User:
    """Create basic test user"""
    import uuid

    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        username="testuser",
        full_name="Test User",
        hashed_password="hashed_password_here",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
async def test_user_with_2fa(db: AsyncSession) -> User:
    """Create test user with 2FA enabled"""
    import uuid

    user = User(
        id=uuid.uuid4(),
        email="2fa@example.com",
        username="2fauser",
        full_name="2FA User",
        hashed_password="hashed_password_here",
        two_factor_enabled=True,
        two_factor_secret="JBSWY3DPEHPK3PXP",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
async def test_admin_user(db: AsyncSession) -> User:
    """Create test admin user"""
    import uuid

    user = User(
        id=uuid.uuid4(),
        email="admin@example.com",
        username="admin",
        full_name="Admin User",
        hashed_password="hashed_password_here",
        is_admin=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# Test resume fixture
@pytest.fixture
async def test_resume(db: AsyncSession, test_user: User) -> Resume:
    """Create test resume"""
    import uuid

    resume = Resume(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Software Engineer Resume",
        content="Experienced software engineer with skills in Python, JavaScript, and React.",
        file_url="https://example.com/resume.pdf",
        ats_score=85,
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


# Test JD fixture
@pytest.fixture
async def test_jd(db: AsyncSession, test_user: User) -> JD:
    """Create test job description"""
    import uuid

    jd = JD(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Senior Software Engineer",
        company_name="Tech Corp",
        content="We are looking for a senior software engineer with experience in Python and JavaScript.",
        location="San Francisco, CA",
        salary_min=120000,
        salary_max=180000,
    )
    db.add(jd)
    await db.commit()
    await db.refresh(jd)
    return jd


# Test application fixture
@pytest.fixture
async def test_application(
    db: AsyncSession, test_user: User, test_resume: Resume, test_jd: JD
) -> Application:
    """Create test application"""
    import uuid

    application = Application(
        id=uuid.uuid4(),
        user_id=test_user.id,
        resume_id=test_resume.id,
        jd_id=test_jd.id,
        status="applied",
        match_score=0.85,
        notes="Applied through company website",
    )
    db.add(application)
    await db.commit()
    await db.refresh(application)
    return application


# Test interview fixture
@pytest.fixture
async def test_interview(db: AsyncSession, test_application: Application) -> Interview:
    """Create test interview"""
    import uuid

    interview = Interview(
        id=uuid.uuid4(),
        application_id=test_application.id,
        scheduled_at=datetime.now() + timedelta(days=7),
        interview_type="technical",
        status="scheduled",
        notes="Technical interview with engineering team",
    )
    db.add(interview)
    await db.commit()
    await db.refresh(interview)
    return interview


# Test data fixtures
@pytest.fixture
def fake() -> Faker:
    """Faker instance for generating test data"""
    return Faker()


@pytest.fixture
def sample_user(fake: Faker) -> dict:
    """Generate sample user data"""
    return {
        "email": fake.email(),
        "username": fake.user_name(),
        "password": fake.password(length=12),
        "full_name": fake.name(),
    }


@pytest.fixture
def sample_jd(fake: Faker) -> dict:
    """Generate sample job description data"""
    return {
        "title": fake.job(),
        "company": fake.company(),
        "content": fake.paragraph(nb_sentences=5),
        "location": fake.city(),
        "salary_range": f"${fake.random_int(50000, 150000)} - ${fake.random_int(150000, 250000)}",
    }


@pytest.fixture
def sample_resume(fake: Faker) -> dict:
    """Generate sample resume data"""
    return {
        "title": fake.job(),
        "content": fake.paragraph(nb_sentences=10),
        "skills": fake.words(nb=10),
        "experience_years": fake.random_int(1, 15),
    }


# Mock fixtures
@pytest.fixture
def mock_openai_response():
    """Mock OpenAI API response"""
    return {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "This is a mocked OpenAI response for testing purposes",
                }
            }
        ]
    }


@pytest.fixture
def mock_anthropic_response():
    """Mock Anthropic API response"""
    return {
        "content": [
            {"type": "text", "text": "This is a mocked Anthropic response for testing"}
        ]
    }


@pytest.fixture
def mock_embedding():
    """Mock embedding vector"""
    return [0.1] * 1536  # OpenAI embedding dimension


# Async mock fixtures
@pytest.fixture
def mock_llm_service():
    """Mock LLM service with AsyncMock"""
    return AsyncMock()


@pytest.fixture
def mock_database_operations():
    """Mock database operations"""
    return {
        "query": AsyncMock(),
        "execute": AsyncMock(),
        "commit": AsyncMock(),
        "rollback": AsyncMock(),
    }


# Performance testing fixtures
@pytest.fixture
def performance_thresholds():
    """Performance thresholds for API tests"""
    return {
        "max_response_time": 1.0,  # seconds
        "max_db_query_time": 0.5,
        "max_mcp_call_time": 5.0,
    }


@pytest.fixture
def measure_performance():
    """Context manager for measuring performance"""
    import time

    class PerformanceMeasure:
        def __init__(self):
            self.start_time = None
            self.end_time = None
            self.duration = None

        def __enter__(self):
            self.start_time = time.time()
            return self

        def __exit__(self, *args):
            self.end_time = time.time()
            self.duration = self.end_time - self.start_time

    return PerformanceMeasure


# File handling fixtures
@pytest.fixture
def temp_file():
    """Create temporary file for testing"""
    temp_file = tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".pdf")
    temp_file.write("Mock PDF content")
    temp_file.close()

    yield temp_file.name

    # Cleanup
    os.unlink(temp_file.name)


@pytest.fixture
def temp_image_file():
    """Create temporary image file for testing"""
    temp_file = tempfile.NamedTemporaryFile(mode="wb", delete=False, suffix=".png")
    temp_file.write(b"Mock image content")
    temp_file.close()

    yield temp_file.name

    # Cleanup
    os.unlink(temp_file.name)


# API test helpers
@pytest.fixture
def auth_headers(test_user: User) -> dict:
    """Generate authentication headers"""
    import jwt

    token = jwt.encode(
        {"sub": str(test_user.id), "exp": datetime.utcnow() + timedelta(hours=1)},
        "test_secret_key",
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def create_auth_headers():
    """Factory function to create auth headers for any user"""
    import jwt

    def _create_headers(user_id: str) -> dict:
        token = jwt.encode(
            {"sub": str(user_id), "exp": datetime.utcnow() + timedelta(hours=1)},
            "test_secret_key",
            algorithm="HS256",
        )
        return {"Authorization": f"Bearer {token}"}

    return _create_headers


# MCP Server fixtures (enhanced)
@pytest.fixture
def sample_resume_data(fake: Faker) -> Dict[str, Any]:
    """Generate sample resume data for MCP testing"""
    return {
        "contact": {
            "name": fake.name(),
            "email": fake.email(),
            "phone": fake.phone_number(),
            "location": fake.city(),
        },
        "experience": [
            {
                "title": fake.job(),
                "company": fake.company(),
                "duration": f"{fake.random_int(1, 5)} years",
                "description": fake.paragraph(nb_sentences=3),
            }
        ],
        "education": [
            {
                "degree": fake.sentence(),
                "school": fake.company(),
                "year": fake.year(),
            }
        ],
        "skills": fake.words(nb=10),
    }


@pytest.fixture
def sample_jd_data(fake: Faker) -> Dict[str, Any]:
    """Generate sample job description data for MCP testing"""
    return {
        "title": fake.job(),
        "company": fake.company(),
        "description": fake.paragraph(nb_sentences=10),
        "requirements": fake.words(nb=8),
        "nice_to_have": fake.words(nb=5),
        "location": fake.city(),
        "salary": {
            "min": fake.random_int(80000, 120000),
            "max": fake.random_int(120000, 180000),
        },
    }


@pytest.fixture
def mock_mcp_responses():
    """Mock MCP server responses"""
    return {
        "resume_analysis": {
            "success": True,
            "data": {
                "ats_score": 85,
                "skills": ["Python", "JavaScript", "React"],
                "experience_years": 5,
                "education_level": "Bachelor's",
            },
        },
        "jd_parsing": {
            "success": True,
            "data": {
                "requirements": ["Python", "JavaScript", "React"],
                "nice_to_have": ["AWS", "Docker"],
                "salary_range": "$120,000 - $180,000",
            },
        },
        "job_matching": {
            "success": True,
            "data": {
                "match_score": 0.85,
                "strengths": ["Strong technical skills", "Relevant experience"],
                "gaps": ["Missing some nice-to-have skills"],
            },
        },
        "interview_prep": {
            "success": True,
            "data": {
                "technical_questions": [
                    "Explain microservices architecture",
                    "Describe RESTful API design",
                ],
                "behavioral_questions": [
                    "Tell me about a challenging project",
                ],
            },
        },
    }


# Rate limiting fixtures
@pytest.fixture
async def rate_limit_client(db: AsyncSession):
    """Create client with rate limiting enabled"""
    import sys
    import os

    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    from httpx import AsyncClient, ASGITransport
    from main import app

    # Enable rate limiting for tests
    app.state.rate_limit_enabled = True

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.state.rate_limit_enabled = False


# Async test utilities
@pytest.fixture
def async_test():
    """Context manager for running async tests"""

    class AsyncTestRunner:
        async def run(self, coro):
            return await coro

    return AsyncTestRunner()


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "unit: Unit tests (fast, no external dependencies)"
    )
    config.addinivalue_line("markers", "integration: Integration tests (with database)")
    config.addinivalue_line("markers", "e2e: End-to-end tests (slow, full stack)")
    config.addinivalue_line("markers", "slow: Slow running tests")
    config.addinivalue_line("markers", "mcp: MCP server integration tests")
    config.addinivalue_line("markers", "performance: Performance tests")
    config.addinivalue_line("markers", "auth: Authentication tests")
    config.addinivalue_line("markers", "rate_limit: Rate limiting tests")
    config.addinivalue_line("markers", "analytics: Analytics and statistics tests")
    config.addinivalue_line("markers", "search: Search functionality tests")


# Additional mock fixtures for comprehensive testing
@pytest.fixture
def mock_storage_service():
    """Mock storage service for file operations"""
    from unittest.mock import AsyncMock, MagicMock

    storage = MagicMock()
    storage.upload_file = AsyncMock(return_value="s3://test/file.pdf")
    storage.download_file = AsyncMock(return_value=b"file content")
    storage.delete_file = AsyncMock(return_value=None)
    return storage


@pytest.fixture
def mock_file_parser_service():
    """Mock file parser service"""
    from unittest.mock import AsyncMock

    parser = AsyncMock()
    parser.parse_file = AsyncMock(return_value="Extracted text content")
    return parser


@pytest.fixture
def mock_ai_service():
    """Mock AI service for LLM operations"""
    from unittest.mock import AsyncMock

    ai = AsyncMock()
    ai.generate_embedding = AsyncMock(return_value=[0.1] * 1536)
    ai.parse_jd = AsyncMock(return_value={"requirements": ["Python", "FastAPI"]})
    ai.optimize_resume = AsyncMock(return_value={"optimized_content": "Optimized"})
    ai.match_resume = AsyncMock(return_value={"match_score": 0.85})
    ai.generate_interview_prep = AsyncMock(return_value={"questions": ["Question 1"]})
    return ai


@pytest.fixture
def mock_notification_service():
    """Mock notification service"""
    from unittest.mock import AsyncMock

    notification = AsyncMock()
    notification.notify_application_status_change = AsyncMock(return_value=None)
    return notification


@pytest.fixture
def mock_task_service():
    """Mock task service for async operations"""
    from unittest.mock import AsyncMock, MagicMock

    task = MagicMock()
    task.id = uuid.uuid4()
    task.status = "pending"

    service = AsyncMock()
    service.submit_task = AsyncMock(return_value=task)
    return service


# Test data factories for comprehensive testing
@pytest.fixture
def resume_factory(test_user):
    """Factory for creating test resumes"""
    from app.models.resume import Resume
    import uuid

    def _create_resume(**kwargs):
        defaults = {
            "id": uuid.uuid4(),
            "user_id": test_user.id,
            "title": "Software Engineer Resume",
            "content": "Experienced software engineer with Python and FastAPI skills.",
            "file_path": "s3://test/resume.pdf",
            "parsed_data": '{"skills": ["Python", "FastAPI"]}',
        }
        defaults.update(kwargs)
        return Resume(**defaults)

    return _create_resume


@pytest.fixture
def jd_factory(test_user):
    """Factory for creating test JDs"""
    from app.models.jd import JD
    import uuid

    def _create_jd(**kwargs):
        defaults = {
            "id": uuid.uuid4(),
            "user_id": test_user.id,
            "title": "Senior Software Engineer",
            "company": "Tech Corp",
            "content": "We are looking for a senior software engineer with Python experience.",
            "parsed_data": '{"requirements": ["Python", "FastAPI"]}',
        }
        defaults.update(kwargs)
        return JD(**defaults)

    return _create_jd


@pytest.fixture
def application_factory(test_user, resume_factory, jd_factory):
    """Factory for creating test applications"""
    from app.models.application import Application
    import uuid

    def _create_application(**kwargs):
        resume = resume_factory()
        jd = jd_factory()

        defaults = {
            "id": uuid.uuid4(),
            "user_id": test_user.id,
            "resume_id": resume.id,
            "jd_id": jd.id,
            "status": "applied",
            "match_score": 0.85,
        }
        defaults.update(kwargs)
        return Application(**defaults)

    return _create_application


# Performance testing utilities
@pytest.fixture
def benchmark_thresholds():
    """Performance benchmark thresholds for service tests"""
    return {
        "max_db_query_time": 0.1,  # 100ms
        "max_service_time": 0.5,  # 500ms
        "max_batch_operation_time": 2.0,  # 2 seconds
        "max_bulk_delete_time": 1.0,  # 1 second per 100 items
    }


# Database query counter for performance testing
@pytest.fixture
def query_counter(db_session):
    """Counter for tracking database queries"""
    from unittest.mock import wrap

    class QueryCounter:
        def __init__(self, session):
            self.session = session
            self.count = 0
            self.original_execute = session.execute

        async def count_execute(self, *args, **kwargs):
            self.count += 1
            return await self.original_execute(*args, **kwargs)

        def start(self):
            self.session.execute = self.count_execute

        def stop(self):
            self.session.execute = self.original_execute

        def reset(self):
            self.count = 0

    counter = QueryCounter(db_session)
    return counter


# Error simulation fixtures
@pytest.fixture
def error_scenarios():
    """Dictionary of error scenarios for testing"""
    return {
        "database_error": Exception("Database connection failed"),
        "network_error": Exception("Network timeout"),
        "validation_error": ValueError("Invalid input data"),
        "not_found_error": KeyError("Resource not found"),
        "permission_error": PermissionError("Access denied"),
        "timeout_error": TimeoutError("Operation timed out"),
    }


# Time-based testing utilities
@pytest.fixture
def time_travel():
    """Context manager for time-based testing"""
    from freezegun import freeze_time
    from datetime import datetime, timedelta

    class TimeTravel:
        def __init__(self):
            self.current_time = datetime.utcnow()

        def forward(self, days=0, hours=0, minutes=0):
            self.current_time += timedelta(days=days, hours=hours, minutes=minutes)
            return freeze_time(self.current_time)

        def backward(self, days=0, hours=0, minutes=0):
            self.current_time -= timedelta(days=days, hours=hours, minutes=minutes)
            return freeze_time(self.current_time)

        def to(self, target_time):
            self.current_time = target_time
            return freeze_time(self.current_time)

    return TimeTravel()


# Coverage tracking utilities
@pytest.fixture
def coverage_tracker():
    """Track test coverage for service methods"""

    class CoverageTracker:
        def __init__(self):
            self.covered_methods = set()
            self.all_methods = set()

        def mark_covered(self, method_name):
            self.covered_methods.add(method_name)

        def register_method(self, method_name):
            self.all_methods.add(method_name)

        def get_coverage(self):
            if not self.all_methods:
                return 0.0
            return len(self.covered_methods) / len(self.all_methods) * 100

        def get_missing_methods(self):
            return self.all_methods - self.covered_methods

    return CoverageTracker()


# Async test utilities
@pytest.fixture
def async_result_setter():
    """Utility for setting async results in tests"""

    class AsyncResultSetter:
        def __init__(self):
            self.results = {}
            self.exceptions = {}

        def set_result(self, key, value):
            self.results[key] = value

        def set_exception(self, key, exception):
            self.exceptions[key] = exception

        async def get_result(self, key):
            if key in self.exceptions:
                raise self.exceptions[key]
            return self.results.get(key)

    return AsyncResultSetter()


# Batch operation testing utilities
@pytest.fixture
def batch_operation_tester():
    """Utility for testing batch operations"""

    class BatchOperationTester:
        def __init__(self):
            self.results = []
            self.errors = []

        async def test_operation(self, operation, items, batch_size=10):
            """Test a batch operation with given items"""
            success_count = 0
            failed_count = 0

            for i in range(0, len(items), batch_size):
                batch = items[i : i + batch_size]
                try:
                    result = await operation(batch)
                    success_count += len(batch)
                    self.results.extend(
                        result if isinstance(result, list) else [result]
                    )
                except Exception as e:
                    failed_count += len(batch)
                    self.errors.append({"batch": i // batch_size, "error": str(e)})

            return {
                "success_count": success_count,
                "failed_count": failed_count,
                "errors": self.errors,
            }

    return BatchOperationTester()


# Mock response builders
@pytest.fixture
def mock_response_builder():
    """Builder for creating mock API responses"""

    class MockResponseBuilder:
        def __init__(self):
            self.data = {}

        def with_success(self, data=None):
            self.data["success"] = True
            if data is not None:
                self.data["data"] = data
            return self

        def with_error(self, message, code=500):
            self.data["success"] = False
            self.data["error"] = {"message": message, "code": code}
            return self

        def with_pagination(self, page, page_size, total):
            self.data["pagination"] = {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size,
            }
            return self

        def build(self):
            return self.data

        def reset(self):
            self.data = {}
            return self

    return MockResponseBuilder()
