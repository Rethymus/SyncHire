"""
Pytest configuration and fixtures for 2026 best practices

This file demonstrates:
- Async fixtures with pytest-asyncio
- Mock configurations for external services
- Test data factories with Faker
"""

import pytest
from faker import Faker
from unittest.mock import AsyncMock


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
