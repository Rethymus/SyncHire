"""
Test suite for FastAPI endpoints

These tests demonstrate 2026 best practices for FastAPI testing:
- Using TestClient for API testing
- Async testing with pytest-asyncio
- Mocking external dependencies
- Testing without real API keys
"""

import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

# Import the app directly
from main import app


@pytest.mark.unit
class TestHealthEndpoints:
    """Test health check endpoints"""

    @pytest.mark.asyncio
    async def test_health_check_no_db(self):
        """Test the health check endpoint without database dependencies"""
        # Create a client without database overrides for simple health check
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_root_endpoint(self):
        """Test the root endpoint"""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/")
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "SyncHire API"
            assert data["version"] == "1.0.0"


@pytest.mark.unit
class TestJDEndpoints:
    """Test Job Description endpoints with mocked AI services"""

    @pytest.mark.asyncio
    async def test_create_jd_with_mocked_ai(
        self, client: AsyncClient, mock_ai_response
    ):
        """Test JD creation with mocked AI analysis"""
        jd_data = {
            "title": "Software Engineer",
            "company": "Tech Corp",
            "content": "We are looking for a skilled software engineer...",
        }

        # Mock the AI service
        with patch("app.services.ai_service.AIService.analyze_jd") as mock_analyze:
            mock_analyze.return_value = {
                "hard_skills": ["Python", "FastAPI", "PostgreSQL"],
                "soft_skills": ["Communication", "Teamwork"],
                "experience_level": "Senior",
            }

            response = await client.post("/api/jds/", json=jd_data)

            assert response.status_code == 201
            data = response.json()
            assert data["title"] == "Software Engineer"
            assert mock_analyze.assert_called_once()

    @pytest.mark.asyncio
    async def test_parse_jd_with_mocked_llm(self, client: AsyncClient):
        """Test JD parsing with mocked LLM"""
        jd_content = "Job Title: Senior Developer\nRequirements: Python, FastAPI"

        with patch("app.services.jd_service.JDService.parse_jd") as mock_parse:
            mock_parse.return_value = {
                "job_title": "Senior Developer",
                "hard_skills": ["Python", "FastAPI"],
                "soft_skills": [],
            }

            response = await client.post("/api/jds/parse", json={"content": jd_content})

            assert response.status_code == 200
            data = response.json()
            assert "parsed_data" in data


@pytest.mark.integration
class TestDatabaseIntegration:
    """Test database integration with test containers"""

    @pytest.mark.asyncio
    async def test_create_and_retrieve_jd(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test creating and retrieving a JD from the database"""
        jd_data = {
            "title": "Backend Developer",
            "company": "Startup Inc",
            "content": "Looking for an experienced backend developer",
        }

        # Create JD
        create_response = await client.post("/api/jds/", json=jd_data)
        assert create_response.status_code == 201
        jd_id = create_response.json()["id"]

        # Retrieve JD
        get_response = await client.get(f"/api/jds/{jd_id}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["title"] == "Backend Developer"


@pytest.mark.unit
class TestMockingStrategies:
    """Demonstrate various mocking strategies for external services"""

    @pytest.mark.asyncio
    async def test_mock_openai_api(self, client: AsyncClient):
        """Test with mocked OpenAI API"""
        with patch("openai.ChatCompletion.acreate") as mock_openai:
            mock_openai.return_value = {
                "choices": [{"message": {"content": "Mocked resume optimization"}}]
            }

            response = await client.post(
                "/api/resumes/optimize",
                json={
                    "resume_content": "Experienced developer...",
                    "jd_id": "some-uuid",
                },
            )

            assert response.status_code == 200
            assert "optimization" in response.json()

    @pytest.mark.asyncio
    async def test_mock_anthropic_api(self, client: AsyncClient):
        """Test with mocked Anthropic API"""
        with patch("anthropic.AsyncAnthropic.messages.create") as mock_claude:
            mock_claude.return_value = {"content": [{"text": "Mocked Claude response"}]}

            response = await client.post("/api/ai/chat", json={"message": "Hello"})

            assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_mock_database_query(self, client: AsyncClient):
        """Test with mocked database"""
        with patch("app.core.database.get_db") as mock_db:
            # Create mock session
            mock_session = AsyncMock()
            mock_db.return_value = mock_session

            response = await client.get("/api/jds/")

            assert response.status_code == 200
            mock_session.assert_called_once()


# Pytest fixtures
@pytest.fixture
def mock_ai_response():
    """Mock AI service response"""
    return {
        "hard_skills": ["Python", "FastAPI", "PostgreSQL"],
        "soft_skills": ["Communication"],
        "experience_level": "Senior",
    }
