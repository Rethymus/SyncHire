"""
Pytest configuration and fixtures for 2026 best practices

This file demonstrates:
- Async fixtures with pytest-asyncio
- Testcontainers for PostgreSQL
- Mock configurations for external services
- Test data factories with Faker
"""

import pytest
import asyncio
from typing import AsyncGenerator, Generator
from testcontainers.postgres import PostgresContainer
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from httpx import AsyncClient
from faker import Faker
from unittest.mock import AsyncMock

from app.main import app
from app.core.database import get_db, Base
from app.models.user import User
from app.models.jd import JD


# Testcontainers setup
@pytest.fixture(scope="session")
async def postgres_container() -> AsyncGenerator[str, None]:
    """Spin up PostgreSQL container for tests"""
    with PostgresContainer("pgvector/pgvector:pg16") as postgres:
        connection_url = postgres.get_connection_url()
        yield connection_url


@pytest.fixture(scope="function")
async def test_db(postgres_container: str) -> AsyncGenerator:
    """Create test database and tables"""
    engine = create_async_engine(postgres_container, echo=False)

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session maker
    async_session_maker = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    yield async_session_maker

    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture
async def db_session(test_db) -> AsyncGenerator[AsyncSession, None]:
    """Create a database session for tests"""
    async with test_db() as session:
        yield session


@pytest.fixture
async def client(test_db) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with database override"""

    async def override_get_db():
        async with test_db() as session:
            yield session

    # Override database dependency
    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

    # Clean up override
    app.dependency_overrides.clear()


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
        "title": fake.job_title(),
        "company": fake.company(),
        "content": fake.paragraph(nb_sentences=5),
        "location": fake.city(),
        "salary_range": f"${fake.random_int(50000, 150000)} - ${fake.random_int(150000, 250000)}",
    }


@pytest.fixture
async def authenticated_user(client: AsyncClient, sample_user: dict) -> dict:
    """Create an authenticated user for tests"""
    # Register user
    await client.post("/api/auth/register", json=sample_user)

    # Login to get token
    response = await client.post(
        "/api/auth/login",
        json={"username": sample_user["username"], "password": sample_user["password"]},
    )

    token_data = response.json()
    return {"user": sample_user, "token": token_data["access_token"]}


@pytest.fixture
def auth_headers(authenticated_user: dict) -> dict:
    """Generate authentication headers"""
    return {"Authorization": f"Bearer {authenticated_user['token']}"}


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


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "unit: Unit tests (fast, no external dependencies)"
    )
    config.addinivalue_line("markers", "integration: Integration tests (with database)")
    config.addinivalue_line("markers", "e2e: End-to-end tests (slow, full stack)")
    config.addinivalue_line("markers", "slow: Slow running tests")
