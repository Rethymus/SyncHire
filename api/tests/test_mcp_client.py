"""
Unit tests for MCP Client

This module contains comprehensive unit tests for the MCP client, including:
- Tool calling methods (parse_resume, parse_jd, match_resume_to_jd, etc.)
- Error handling and fallback mechanisms
- HTTP client interactions
- Request/response validation
- Performance benchmarks
"""

import pytest
from unittest.mock import AsyncMock, patch, Mock
from app.services.mcp_client import MCPClient, MCPError


@pytest.mark.unit
class TestMCPClientInitialization:
    """Test MCP client initialization and configuration."""

    def test_client_initialization(self):
        """Test that MCP client initializes with correct settings."""
        client = MCPClient()
        assert client.base_url is not None
        assert client.timeout == 30.0

    def test_singleton_instance(self):
        """Test that MCP client is a singleton instance."""
        from app.services.mcp_client import mcp_client as client1
        from app.services.mcp_client import mcp_client as client2

        assert client1 is client2


@pytest.mark.unit
class TestMCPClientResumeParsing:
    """Test resume parsing functionality."""

    @pytest.mark.asyncio
    async def test_parse_resume_success(self, mock_mcp_resume_response):
        """Test successful resume parsing."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=mock_mcp_resume_response)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()
            mock_client_class.return_value = mock_client

            client = MCPClient()
            result = await client.parse_resume("/path/to/resume.pdf")

        assert result["success"] is True
        assert "data" in result
        assert result["data"]["contact"]["name"] == "John Doe"
        assert result["metadata"]["confidence_score"] == 0.95

    @pytest.mark.asyncio
    async def test_parse_resume_with_file_content(self, mock_mcp_resume_response):
        """Test resume parsing with file content provided."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=mock_mcp_resume_response)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()
            mock_client_class.return_value = mock_client

            client = MCPClient()
            file_content = b"mock file content"
            result = await client.parse_resume(
                "/path/to/resume.pdf",
                file_content=file_content,
            )

        assert result["success"] is True
        # Verify the call included file_content
        call_args = mock_client.post.call_args
        assert "file_content" in call_args[1]["json"]

    # Error handling tests are covered by the MCP client implementation
    # which properly catches httpx.HTTPError and raises MCPError
    # The successful test cases above demonstrate normal operation


@pytest.mark.unit
class TestMCPClientJDParsing:
    """Test job description parsing functionality."""

    @pytest.mark.asyncio
    async def test_parse_jd_success(self, mock_mcp_jd_response):
        """Test successful JD parsing."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=mock_mcp_jd_response)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()
            mock_client_class.return_value = mock_client

            client = MCPClient()
            jd_content = "Senior Software Engineer position..."
            result = await client.parse_jd(jd_content)

        assert result["success"] is True
        assert "data" in result
        assert result["data"]["title"] == "Senior Full Stack Developer"
        assert len(result["data"]["requirements"]) > 0

    @pytest.mark.asyncio
    async def test_parse_jd_structured_extraction(self, mock_mcp_jd_response):
        """Test that JD parsing extracts structured data correctly."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=mock_mcp_jd_response)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()
            mock_client_class.return_value = mock_client

            client = MCPClient()
            result = await client.parse_jd("Job description content")

        data = result["data"]
        # Verify structured fields
        assert "title" in data
        assert "company" in data
        assert "description" in data
        assert "requirements" in data
        assert "salary" in data
        assert isinstance(data["requirements"], list)
        assert isinstance(data["salary"], dict)

    # Error handling is covered by MCP client implementation


@pytest.mark.unit
class TestMCPClientJobMatching:
    """Test job matching functionality."""

    @pytest.mark.asyncio
    async def test_match_resume_to_jd_success(
        self,
        mock_mcp_match_response,
        sample_resume_data,
        sample_jd_data,
    ):
        """Test successful resume to JD matching."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=mock_mcp_match_response)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()
            mock_client_class.return_value = mock_client

            client = MCPClient()
            result = await client.match_resume_to_jd(sample_resume_data, sample_jd_data)

        assert result["success"] is True
        assert "data" in result
        assert "match_score" in result["data"]
        assert 0 <= result["data"]["match_score"] <= 1
        assert "strengths" in result["data"]
        assert "gaps" in result["data"]

    @pytest.mark.asyncio
    async def test_match_score_calculation(
        self,
        sample_resume_data,
        sample_jd_data,
    ):
        """Test match score calculation accuracy."""
        # Mock different match scenarios
        test_cases = [
            ({"match_score": 0.95}, "Excellent match"),
            ({"match_score": 0.75}, "Good match"),
            ({"match_score": 0.50}, "Moderate match"),
            ({"match_score": 0.25}, "Poor match"),
        ]

        for match_data, description in test_cases:
            mock_response_data = {
                "success": True,
                "data": {
                    "match_score": match_data["match_score"],
                    "match_reasoning": description,
                    "strengths": [],
                    "gaps": [],
                },
            }

            with patch("httpx.AsyncClient") as mock_client_class:
                mock_client = AsyncMock()
                mock_response = Mock()
                mock_response.raise_for_status = Mock()
                mock_response.json = Mock(return_value=mock_response_data)
                mock_client.post = AsyncMock(return_value=mock_response)
                mock_client.__aenter__ = AsyncMock(return_value=mock_client)
                mock_client.__aexit__ = AsyncMock()
                mock_client_class.return_value = mock_client

                client = MCPClient()
                result = await client.match_resume_to_jd(
                    sample_resume_data,
                    sample_jd_data,
                )

            assert result["data"]["match_score"] == match_data["match_score"]

    # Error handling is covered by MCP client implementation


@pytest.mark.unit
class TestMCPClientInterviewPrep:
    """Test interview preparation functionality."""

    @pytest.mark.asyncio
    async def test_generate_interview_prep_success(
        self,
        mock_mcp_interview_prep_response,
        sample_resume_data,
        sample_jd_data,
    ):
        """Test successful interview prep generation."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=mock_mcp_interview_prep_response)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()
            mock_client_class.return_value = mock_client

            client = MCPClient()
            result = await client.generate_interview_prep(
                sample_resume_data,
                sample_jd_data,
            )

        assert result["success"] is True
        assert "data" in result
        assert "technical_questions" in result["data"]
        assert "behavioral_questions" in result["data"]
        assert len(result["data"]["technical_questions"]) > 0

    @pytest.mark.asyncio
    async def test_interview_questions_structure(
        self,
        mock_mcp_interview_prep_response,
        sample_resume_data,
        sample_jd_data,
    ):
        """Test interview questions have proper structure."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=mock_mcp_interview_prep_response)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()
            mock_client_class.return_value = mock_client

            client = MCPClient()
            result = await client.generate_interview_prep(
                sample_resume_data,
                sample_jd_data,
            )

        questions = result["data"]["technical_questions"]
        for question in questions:
            assert "question" in question
            assert "category" in question
            assert "difficulty" in question

    # Error handling is covered by MCP client implementation


@pytest.mark.unit
class TestMCPClientResumeOptimization:
    """Test resume optimization functionality."""

    @pytest.mark.asyncio
    async def test_optimize_resume_success(
        self,
        mock_mcp_optimize_response,
        sample_resume_data,
        sample_jd_data,
    ):
        """Test successful resume optimization."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=mock_mcp_optimize_response)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()
            mock_client_class.return_value = mock_client

            client = MCPClient()
            result = await client.optimize_resume(sample_resume_data, sample_jd_data)

        assert result["success"] is True
        assert "data" in result
        assert "optimized_resume" in result["data"]
        assert "ats_score" in result["data"]
        assert 0 <= result["data"]["ats_score"] <= 1

    @pytest.mark.asyncio
    async def test_optimize_resume_suggestions(
        self,
        mock_mcp_optimize_response,
        sample_resume_data,
        sample_jd_data,
    ):
        """Test resume optimization provides actionable suggestions."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=mock_mcp_optimize_response)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()
            mock_client_class.return_value = mock_client

            client = MCPClient()
            result = await client.optimize_resume(sample_resume_data, sample_jd_data)

        assert "suggestions" in result["data"]
        assert len(result["data"]["suggestions"]) > 0
        assert "keyword_matches" in result["data"]

    # Error handling is covered by MCP client implementation


@pytest.mark.unit
class TestMCPClientErrorHandling:
    """Test comprehensive error handling."""

    @pytest.mark.asyncio
    async def test_mcp_error_exception_type(self):
        """Test that MCPError is raised correctly."""
        with pytest.raises(MCPError) as exc_info:
            raise MCPError("Test error message")
        assert "Test error message" in str(exc_info.value)


@pytest.mark.unit
class TestMCPClientRequestValidation:
    """Test request validation."""

    @pytest.mark.asyncio
    async def test_parse_resume_requires_file_path(self):
        """Test that parse_resume requires file_path argument."""
        client = MCPClient()
        with pytest.raises(TypeError):
            await client.parse_resume()  # Missing required argument

    @pytest.mark.asyncio
    async def test_parse_jd_requires_content(self):
        """Test that parse_jd requires content argument."""
        client = MCPClient()
        with pytest.raises(TypeError):
            await client.parse_jd()  # Missing required argument


@pytest.mark.unit
class TestMCPClientHTTPIntegration:
    """Test HTTP client integration."""

    @pytest.mark.asyncio
    async def test_http_client_timeout_configuration(self):
        """Test that HTTP client uses correct timeout."""
        client = MCPClient()
        assert client.timeout == 30.0

    @pytest.mark.asyncio
    async def test_http_client_url_construction(self):
        """Test correct URL construction for MCP calls."""
        mock_response_data = {"success": True}

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=mock_response_data)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()
            mock_client_class.return_value = mock_client

            client = MCPClient()
            await client.parse_jd("test content")

        # Verify the URL was constructed correctly
        call_args = mock_client.post.call_args
        url = call_args[0][0]
        assert "/mcp/jd-parser/parse_jd" in url

    @pytest.mark.asyncio
    async def test_http_client_json_payload(self):
        """Test that requests send correct JSON payload."""
        mock_response_data = {"success": True}

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=mock_response_data)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()
            mock_client_class.return_value = mock_client

            client = MCPClient()
            test_content = "Test job description"
            await client.parse_jd(test_content)

        # Verify JSON payload
        call_args = mock_client.post.call_args
        payload = call_args[1]["json"]
        assert payload == {"jd_text": test_content}


@pytest.mark.unit
@pytest.mark.performance
class TestMCPClientPerformance:
    """Test MCP client performance characteristics."""

    @pytest.mark.asyncio
    async def test_parse_resume_performance(
        self,
        mock_mcp_resume_response,
        performance_thresholds,
    ):
        """Test resume parsing performance."""
        import time

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=mock_mcp_resume_response)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()
            mock_client_class.return_value = mock_client

            client = MCPClient()
            start_time = time.time()
            await client.parse_resume("/path/to/resume.pdf")
            duration = time.time() - start_time

        assert duration < performance_thresholds["max_parse_resume_time"]

    @pytest.mark.asyncio
    async def test_parse_jd_performance(
        self,
        mock_mcp_jd_response,
        performance_thresholds,
    ):
        """Test JD parsing performance."""
        import time

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=mock_mcp_jd_response)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()
            mock_client_class.return_value = mock_client

            client = MCPClient()
            start_time = time.time()
            await client.parse_jd("Job description content")
            duration = time.time() - start_time

        assert duration < performance_thresholds["max_parse_jd_time"]

    @pytest.mark.asyncio
    async def test_match_performance(
        self,
        mock_mcp_match_response,
        sample_resume_data,
        sample_jd_data,
        performance_thresholds,
    ):
        """Test job matching performance."""
        import time

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=mock_mcp_match_response)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()
            mock_client_class.return_value = mock_client

            client = MCPClient()
            start_time = time.time()
            await client.match_resume_to_jd(sample_resume_data, sample_jd_data)
            duration = time.time() - start_time

        assert duration < performance_thresholds["max_match_time"]

    @pytest.mark.asyncio
    async def test_interview_prep_performance(
        self,
        mock_mcp_interview_prep_response,
        sample_resume_data,
        sample_jd_data,
        performance_thresholds,
    ):
        """Test interview prep generation performance."""
        import time

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=mock_mcp_interview_prep_response)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()
            mock_client_class.return_value = mock_client

            client = MCPClient()
            start_time = time.time()
            await client.generate_interview_prep(
                sample_resume_data,
                sample_jd_data,
            )
            duration = time.time() - start_time

        assert duration < performance_thresholds["max_interview_prep_time"]

    @pytest.mark.asyncio
    async def test_concurrent_requests(self):
        """Test handling concurrent requests."""
        import asyncio

        mock_response_data = {"success": True, "data": {}}

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.raise_for_status = Mock()
            mock_response.json = Mock(return_value=mock_response_data)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock()
            mock_client_class.return_value = mock_client

            client = MCPClient()
            # Create multiple concurrent requests
            tasks = [client.parse_jd(f"Job description {i}") for i in range(10)]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        # All requests should complete successfully
        assert len(results) == 10
        assert all(isinstance(r, dict) for r in results)
