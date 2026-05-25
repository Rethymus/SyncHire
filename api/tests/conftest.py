"""
Pytest configuration and fixtures for 2026 best practices

This file demonstrates:
- Async fixtures with pytest-asyncio
- Mock configurations for external services
- Test data factories with Faker
- MCP server mocking fixtures
"""

import pytest
from faker import Faker
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any
import httpx


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


# MCP Server fixtures
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
def mock_mcp_resume_response() -> Dict[str, Any]:
    """Mock MCP resume analyzer response"""
    return {
        "success": True,
        "data": {
            "contact": {
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "+1-555-0123",
                "location": "San Francisco, CA",
            },
            "experience": [
                {
                    "title": "Senior Software Engineer",
                    "company": "Tech Corp",
                    "duration": "3 years",
                    "description": "Led development of cloud infrastructure",
                }
            ],
            "education": [
                {
                    "degree": "B.S. Computer Science",
                    "school": "Stanford University",
                    "year": "2020",
                }
            ],
            "skills": ["Python", "JavaScript", "React", "AWS", "Docker"],
        },
        "metadata": {
            "parsed_at": "2026-05-25T12:00:00Z",
            "confidence_score": 0.95,
        },
    }


@pytest.fixture
def mock_mcp_jd_response() -> Dict[str, Any]:
    """Mock MCP JD parser response"""
    return {
        "success": True,
        "data": {
            "title": "Senior Full Stack Developer",
            "company": "Innovation Inc",
            "description": "We are looking for a senior developer...",
            "requirements": [
                "5+ years of experience",
                "Proficiency in Python and JavaScript",
                "Experience with cloud platforms",
            ],
            "nice_to_have": [
                "Experience with machine learning",
                "Contributions to open source",
            ],
            "location": "Remote",
            "salary": {"min": 120000, "max": 160000, "currency": "USD"},
        },
        "metadata": {
            "parsed_at": "2026-05-25T12:00:00Z",
            "confidence_score": 0.92,
        },
    }


@pytest.fixture
def mock_mcp_match_response() -> Dict[str, Any]:
    """Mock MCP job matcher response"""
    return {
        "success": True,
        "data": {
            "match_score": 0.85,
            "match_reasoning": "Strong alignment in required skills and experience",
            "strengths": [
                "Meets all technical requirements",
                "Relevant industry experience",
                "Strong educational background",
            ],
            "gaps": [
                "Missing some nice-to-have skills",
                "Limited experience with specific tools",
            ],
            "recommendations": [
                "Highlight cloud infrastructure experience",
                "Emphasize leadership roles",
            ],
        },
        "metadata": {
            "matched_at": "2026-05-25T12:00:00Z",
            "model_version": "v1.0",
        },
    }


@pytest.fixture
def mock_mcp_interview_prep_response() -> Dict[str, Any]:
    """Mock MCP interview prep response"""
    return {
        "success": True,
        "data": {
            "technical_questions": [
                {
                    "question": "Explain how you would design a scalable microservices architecture",
                    "category": "System Design",
                    "difficulty": "Advanced",
                    "suggested_answer": "I would start by...",
                }
            ],
            "behavioral_questions": [
                {
                    "question": "Tell me about a time you led a team through a challenging project",
                    "category": "Leadership",
                    "star_method_hint": "Situation:...",
                }
            ],
            "company_research": [
                "Innovation Inc focuses on AI-driven solutions",
                "Recently launched a new product line",
            ],
            "preparation_tips": [
                "Review their tech stack thoroughly",
                "Prepare examples of past projects",
            ],
        },
        "metadata": {
            "generated_at": "2026-05-25T12:00:00Z",
            "question_count": 10,
        },
    }


@pytest.fixture
def mock_mcp_optimize_response() -> Dict[str, Any]:
    """Mock MCP resume optimizer response"""
    return {
        "success": True,
        "data": {
            "optimized_resume": {
                "summary": "Enhanced resume with targeted keywords",
                "changes": [
                    "Added cloud computing keywords",
                    "Restructured experience section",
                    "Emphasized leadership experience",
                ],
            },
            "ats_score": 0.92,
            "keyword_matches": ["Python", "AWS", "microservices", "agile"],
            "suggestions": [
                "Quantify achievements more",
                "Add specific project outcomes",
            ],
        },
        "metadata": {
            "optimized_at": "2026-05-25T12:00:00Z",
            "improvement_score": 0.15,
        },
    }


@pytest.fixture
def mock_httpx_client():
    """Mock httpx.AsyncClient for MCP calls"""
    mock_client = MagicMock(spec=httpx.AsyncClient)
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json = MagicMock()
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock()
    return mock_client


@pytest.fixture
def mock_mcp_error_response():
    """Mock MCP error response"""
    return {
        "success": False,
        "error": {
            "code": "MCP_SERVER_ERROR",
            "message": "Failed to process request",
            "details": "Internal server error in MCP server",
        }
    }


@pytest.fixture
def performance_thresholds():
    """Performance thresholds for MCP client tests"""
    return {
        "max_parse_resume_time": 5.0,  # seconds
        "max_parse_jd_time": 3.0,
        "max_match_time": 5.0,
        "max_interview_prep_time": 5.0,
        "max_optimize_time": 5.0,
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
    config.addinivalue_line("markers", "mcp: MCP server integration tests")
    config.addinivalue_line("markers", "performance: Performance tests")
