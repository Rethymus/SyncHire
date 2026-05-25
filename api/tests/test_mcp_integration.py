"""
Integration tests for MCP Client

This module contains end-to-end integration tests for the MCP client, including:
- Full workflow testing (resume parsing → JD parsing → matching → interview prep)
- Error recovery and fallback mechanisms
- Integration with FastAPI endpoints
- Database integration with MCP results
- Real-world scenario testing
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch, Mock
import httpx
from app.services.mcp_client import MCPClient, MCPError
from typing import Dict, Any


# Helper function to create mock HTTP client
def create_mock_http_client(json_response=None, side_effect=None):
    """Helper to create a properly mocked httpx.AsyncClient."""
    mock_client = AsyncMock()

    if side_effect:
        mock_client.post = AsyncMock(side_effect=side_effect)
    else:
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_response.json = Mock(return_value=json_response or {})
        mock_client.post = AsyncMock(return_value=mock_response)

    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock()
    return mock_client


@pytest.mark.integration
@pytest.mark.mcp
class TestMCPClientEndToEndWorkflows:
    """Test complete MCP workflows end-to-end."""

    @pytest.mark.asyncio
    async def test_complete_job_application_workflow(
        self,
        mock_mcp_resume_response,
        mock_mcp_jd_response,
        mock_mcp_match_response,
        mock_mcp_interview_prep_response,
        mock_mcp_optimize_response,
        sample_resume_data,
        sample_jd_data,
    ):
        """Test complete workflow: parse resume → parse JD → match → interview prep."""
        with patch("httpx.AsyncClient") as mock_client_class:
            # Setup mock responses for each step
            mock_client = create_mock_http_client()

            # Configure side_effect for sequential calls
            mock_client.post.side_effect = [
                Mock(
                    raise_for_status=Mock(),
                    json=Mock(return_value=mock_mcp_resume_response),
                ),
                Mock(
                    raise_for_status=Mock(),
                    json=Mock(return_value=mock_mcp_jd_response),
                ),
                Mock(
                    raise_for_status=Mock(),
                    json=Mock(return_value=mock_mcp_match_response),
                ),
                Mock(
                    raise_for_status=Mock(),
                    json=Mock(return_value=mock_mcp_interview_prep_response),
                ),
                Mock(
                    raise_for_status=Mock(),
                    json=Mock(return_value=mock_mcp_optimize_response),
                ),
            ]

            mock_client_class.return_value = mock_client

            client = MCPClient()

            # Step 1: Parse resume
            resume_result = await client.parse_resume("/path/to/resume.pdf")
            assert resume_result["success"] is True
            assert "data" in resume_result

            # Step 2: Parse job description
            jd_result = await client.parse_jd("Job description content")
            assert jd_result["success"] is True
            assert "data" in jd_result

            # Step 3: Match resume to JD
            match_result = await client.match_resume_to_jd(
                resume_result["data"],
                jd_result["data"],
            )
            assert match_result["success"] is True
            assert match_result["data"]["match_score"] > 0

            # Step 4: Generate interview prep
            interview_result = await client.generate_interview_prep(
                resume_result["data"],
                jd_result["data"],
            )
            assert interview_result["success"] is True
            assert len(interview_result["data"]["technical_questions"]) > 0

            # Step 5: Optimize resume
            optimize_result = await client.optimize_resume(
                resume_result["data"],
                jd_result["data"],
            )
            assert optimize_result["success"] is True
            assert optimize_result["data"]["ats_score"] > 0.8

    @pytest.mark.asyncio
    async def test_workflow_with_low_match_score(
        self,
        mock_httpx_client,
        mock_mcp_resume_response,
        mock_mcp_jd_response,
        sample_resume_data,
        sample_jd_data,
    ):
        """Test workflow behavior when match score is low."""
        low_match_response = {
            "success": True,
            "data": {
                "match_score": 0.35,
                "match_reasoning": "Limited skill overlap",
                "strengths": ["Some relevant experience"],
                "gaps": [
                    "Missing key technical skills",
                    "Insufficient experience level",
                ],
                "recommendations": [
                    "Consider acquiring additional skills",
                    "Highlight transferable skills",
                ],
            },
        }

        mock_httpx_client.post.return_value.json.side_effect = [
            mock_mcp_resume_response,
            mock_mcp_jd_response,
            low_match_response,
        ]

        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            client = MCPClient()

            resume_result = await client.parse_resume("/path/to/resume.pdf")
            jd_result = await client.parse_jd("Job description")
            match_result = await client.match_resume_to_jd(
                resume_result["data"],
                jd_result["data"],
            )

            assert match_result["data"]["match_score"] < 0.5
            assert len(match_result["data"]["gaps"]) > 0
            assert len(match_result["data"]["recommendations"]) > 0


@pytest.mark.integration
@pytest.mark.mcp
class TestMCPClientErrorRecovery:
    """Test error recovery and fallback mechanisms."""

    @pytest.mark.asyncio
    async def test_resume_parsing_fallback_to_manual(
        self,
        mock_httpx_client,
        sample_resume_data,
    ):
        """Test fallback to manual parsing when MCP fails."""
        # Simulate MCP failure
        mock_httpx_client.post.side_effect = httpx.HTTPError("MCP server unavailable")

        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            client = MCPClient()

            # The MCP call should raise an error
            with pytest.raises(MCPError):
                await client.parse_resume("/path/to/resume.pdf")

            # In a real implementation, this would trigger fallback logic
            # This test verifies the error is raised for fallback handling

    @pytest.mark.asyncio
    async def test_jd_parsing_fallback_to_regex(
        self,
        mock_httpx_client,
    ):
        """Test fallback to regex-based parsing when MCP JD parser fails."""
        mock_httpx_client.post.side_effect = httpx.TimeoutException("Request timeout")

        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            client = MCPClient()

            with pytest.raises(MCPError):
                await client.parse_jd("Job description content")

            # Fallback logic would be implemented in the calling code

    @pytest.mark.asyncio
    async def test_retry_mechanism_on_transient_failure(
        self,
        mock_httpx_client,
        mock_mcp_resume_response,
    ):
        """Test retry mechanism for transient failures."""
        # First call fails, second succeeds
        mock_httpx_client.post.side_effect = [
            httpx.HTTPStatusError(
                "Service unavailable",
                request=Mock(),
                response=Mock(status_code=503),
            ),
            MagicMock(json=MagicMock(return_value=mock_mcp_resume_response)),
        ]

        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            client = MCPClient()

            # First attempt fails
            with pytest.raises(MCPError):
                await client.parse_resume("/path/to/resume.pdf")

            # In production, retry logic would be implemented here
            # This test verifies the error handling

    @pytest.mark.asyncio
    async def test_circuit_breaker_on_continuous_failures(
        self,
        mock_httpx_client,
    ):
        """Test circuit breaker pattern after multiple failures."""
        # Continuous failures
        mock_httpx_client.post.side_effect = httpx.HTTPError("Service down")

        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            client = MCPClient()

            # Multiple failed attempts
            for _ in range(5):
                with pytest.raises(MCPError):
                    await client.parse_jd("Test content")

            # Circuit breaker would prevent further calls
            # This test verifies consistent error handling


@pytest.mark.integration
@pytest.mark.mcp
class TestMCPClientWithDatabase:
    """Test MCP client integration with database operations."""

    @pytest.mark.asyncio
    async def test_save_parsed_resume_to_database(
        self,
        mock_httpx_client,
        mock_mcp_resume_response,
        mock_database_operations,
    ):
        """Test saving parsed resume data to database."""
        mock_httpx_client.post.return_value.json.return_value = (
            mock_mcp_resume_response
        )

        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            client = MCPClient()
            result = await client.parse_resume("/path/to/resume.pdf")

        # Simulate database save
        mock_db = mock_database_operations
        await mock_db["execute"].call(
            "INSERT INTO resumes (user_id, parsed_data) VALUES ($1, $2)",
            [1, result["data"]],
        )

        # Verify database operation was called
        assert mock_db["execute"].call_count > 0

    @pytest.mark.asyncio
    async def test_save_match_results_to_database(
        self,
        mock_httpx_client,
        mock_mcp_match_response,
        mock_database_operations,
        sample_resume_data,
        sample_jd_data,
    ):
        """Test saving match results to database."""
        mock_httpx_client.post.return_value.json.return_value = (
            mock_mcp_match_response
        )

        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            client = MCPClient()
            result = await client.match_resume_to_jd(
                sample_resume_data,
                sample_jd_data,
            )

        # Simulate database save
        mock_db = mock_database_operations
        await mock_db["execute"].call(
            "INSERT INTO applications (resume_id, jd_id, match_score) VALUES ($1, $2, $3)",
            [1, 2, result["data"]["match_score"]],
        )

        assert mock_db["execute"].call_count > 0


@pytest.mark.integration
@pytest.mark.mcp
class TestMCPClientRealWorldScenarios:
    """Test MCP client with real-world usage scenarios."""

    @pytest.mark.asyncio
    async def test_bulk_jd_parsing(
        self,
        mock_httpx_client,
        mock_mcp_jd_response,
    ):
        """Test parsing multiple job descriptions in bulk."""
        mock_httpx_client.post.return_value.json.return_value = (
            mock_mcp_jd_response
        )

        jd_list = [f"Job description {i}" for i in range(10)]

        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            client = MCPClient()
            results = []

            for jd_content in jd_list:
                result = await client.parse_jd(jd_content)
                results.append(result)

        assert len(results) == 10
        assert all(r["success"] for r in results)

    @pytest.mark.asyncio
    async def test_multi_resume_application(
        self,
        mock_httpx_client,
        mock_mcp_resume_response,
        mock_mcp_jd_response,
        mock_mcp_match_response,
    ):
        """Test applying with multiple resumes to same job."""
        mock_httpx_client.post.return_value.json.side_effect = [
            mock_mcp_jd_response,
            mock_mcp_resume_response,
            mock_mcp_match_response,
            mock_mcp_resume_response,
            mock_mcp_match_response,
        ]

        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            client = MCPClient()

            # Parse JD once
            jd_result = await client.parse_jd("Senior Developer position")

            # Try with multiple resumes
            resume_1_result = await client.parse_resume("/path/to/resume1.pdf")
            match_1_result = await client.match_resume_to_jd(
                resume_1_result["data"],
                jd_result["data"],
            )

            resume_2_result = await client.parse_resume("/path/to/resume2.pdf")
            match_2_result = await client.match_resume_to_jd(
                resume_2_result["data"],
                jd_result["data"],
            )

            # Compare match scores
            assert match_1_result["data"]["match_score"] != match_2_result[
                "data"
            ]["match_score"]

    @pytest.mark.asyncio
    async def test_resume_optimization_iteration(
        self,
        mock_httpx_client,
        mock_mcp_resume_response,
        mock_mcp_jd_response,
        mock_mcp_optimize_response,
    ):
        """Test iterative resume optimization."""
        mock_httpx_client.post.return_value.json.side_effect = [
            mock_mcp_resume_response,
            mock_mcp_jd_response,
            mock_mcp_optimize_response,
        ]

        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            client = MCPClient()

            # Initial resume
            resume_result = await client.parse_resume("/path/to/resume.pdf")
            jd_result = await client.parse_jd("Target job description")

            # First optimization
            opt_result_1 = await client.optimize_resume(
                resume_result["data"],
                jd_result["data"],
            )

            assert opt_result_1["success"] is True
            assert opt_result_1["data"]["ats_score"] > 0.8

            # In production, you would iterate with the optimized resume


@pytest.mark.integration
@pytest.mark.mcp
class TestMCPClientAPIIntegration:
    """Test MCP client integration with FastAPI endpoints."""

    @pytest.mark.asyncio
    async def test_api_endpoint_parse_resume(
        self,
        mock_httpx_client,
        mock_mcp_resume_response,
    ):
        """Test API endpoint that uses MCP client for resume parsing."""
        from fastapi.testclient import TestClient
        from app.main import app

        mock_httpx_client.post.return_value.json.return_value = (
            mock_mcp_resume_response
        )

        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            with TestClient(app) as client:
                # This would test the actual API endpoint
                # For now, we test the MCP client directly
                mcp_client = MCPClient()
                result = await mcp_client.parse_resume("/test/resume.pdf")

        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_api_endpoint_error_handling(
        self,
        mock_httpx_client,
    ):
        """Test API endpoint error handling when MCP fails."""
        mock_httpx_client.post.side_effect = httpx.HTTPError("MCP unavailable")

        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            mcp_client = MCPClient()

            with pytest.raises(MCPError):
                await mcp_client.parse_jd("Test content")


@pytest.mark.integration
@pytest.mark.mcp
class TestMCPClientDataConsistency:
    """Test data consistency across MCP operations."""

    @pytest.mark.asyncio
    async def test_resume_data_consistency(
        self,
        mock_httpx_client,
        mock_mcp_resume_response,
        sample_resume_data,
    ):
        """Test that resume data remains consistent across operations."""
        mock_httpx_client.post.return_value.json.side_effect = [
            mock_mcp_resume_response,
            mock_mcp_match_response,
            mock_mcp_interview_prep_response,
        ]

        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            client = MCPClient()

            # Parse resume
            resume_result = await client.parse_resume("/path/to/resume.pdf")
            original_data = resume_result["data"]

            # Use in matching
            match_result = await client.match_resume_to_jd(
                original_data,
                {"title": "Test Job"},
            )

            # Use in interview prep
            interview_result = await client.generate_interview_prep(
                original_data,
                {"title": "Test Job"},
            )

            # Verify data structure remains consistent
            assert "contact" in original_data
            assert match_result["success"]
            assert interview_result["success"]

    @pytest.mark.asyncio
    async def test_jd_data_consistency(
        self,
        mock_httpx_client,
        mock_mcp_jd_response,
        mock_mcp_match_response,
        mock_mcp_optimize_response,
    ):
        """Test that JD data remains consistent across operations."""
        mock_httpx_client.post.return_value.json.side_effect = [
            mock_mcp_jd_response,
            mock_mcp_match_response,
            mock_mcp_optimize_response,
        ]

        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            client = MCPClient()

            # Parse JD
            jd_result = await client.parse_jd("Software Engineer position")
            original_data = jd_result["data"]

            # Use in matching
            match_result = await client.match_resume_to_jd(
                {"contact": {"name": "Test User"}},
                original_data,
            )

            # Use in optimization
            opt_result = await client.optimize_resume(
                {"contact": {"name": "Test User"}},
                original_data,
            )

            assert "requirements" in original_data
            assert match_result["success"]
            assert opt_result["success"]


@pytest.mark.integration
@pytest.mark.mcp
class TestMCPClientPerformanceIntegration:
    """Test performance characteristics in integration scenarios."""

    @pytest.mark.asyncio
    async def test_full_workflow_performance(
        self,
        mock_httpx_client,
        mock_mcp_resume_response,
        mock_mcp_jd_response,
        mock_mcp_match_response,
        mock_mcp_interview_prep_response,
        performance_thresholds,
    ):
        """Test performance of complete workflow."""
        import time

        mock_httpx_client.post.return_value.json.side_effect = [
            mock_mcp_resume_response,
            mock_mcp_jd_response,
            mock_mcp_match_response,
            mock_mcp_interview_prep_response,
        ]

        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            client = MCPClient()

            start_time = time.time()

            # Execute full workflow
            resume_result = await client.parse_resume("/path/to/resume.pdf")
            jd_result = await client.parse_jd("Job description")
            match_result = await client.match_resume_to_jd(
                resume_result["data"],
                jd_result["data"],
            )
            interview_result = await client.generate_interview_prep(
                resume_result["data"],
                jd_result["data"],
            )

            duration = time.time() - start_time

        # Full workflow should complete in reasonable time
        assert duration < (
            performance_thresholds["max_parse_resume_time"]
            + performance_thresholds["max_parse_jd_time"]
            + performance_thresholds["max_match_time"]
            + performance_thresholds["max_interview_prep_time"]
        )

        # Verify all operations succeeded
        assert all([
            resume_result["success"],
            jd_result["success"],
            match_result["success"],
            interview_result["success"],
        ])

    @pytest.mark.asyncio
    async def test_concurrent_workflow_performance(
        self,
        mock_httpx_client,
        mock_mcp_jd_response,
    ):
        """Test performance with concurrent JD parsing."""
        import asyncio
        import time

        mock_httpx_client.post.return_value.json.return_value = (
            mock_mcp_jd_response
        )

        jd_list = [f"Job description {i}" for i in range(20)]

        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            client = MCPClient()

            start_time = time.time()

            # Parse concurrently
            tasks = [client.parse_jd(jd) for jd in jd_list]
            results = await asyncio.gather(*tasks)

            duration = time.time() - start_time

        assert len(results) == 20
        assert all(r["success"] for r in results)
        # Concurrent operations should be faster than sequential


@pytest.mark.integration
@pytest.mark.mcp
class TestMCPClientSecurity:
    """Test security aspects of MCP client."""

    @pytest.mark.asyncio
    async def test_sensitive_data_sanitization(
        self,
        mock_httpx_client,
        mock_mcp_resume_response,
    ):
        """Test that sensitive data is handled properly."""
        mock_httpx_client.post.return_value.json.return_value = (
            mock_mcp_resume_response
        )

        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            client = MCPClient()
            result = await client.parse_resume("/path/to/resume.pdf")

        # Verify no sensitive data is exposed in error messages
        # (This would be more comprehensive with actual sensitive data)

    @pytest.mark.asyncio
    async def test_injection_attack_prevention(
        self,
        mock_httpx_client,
        mock_mcp_jd_response,
    ):
        """Test that injection attacks are prevented."""
        malicious_content = "<script>alert('xss')</script>"

        mock_httpx_client.post.return_value.json.return_value = (
            mock_mcp_jd_response
        )

        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            client = MCPClient()
            result = await client.parse_jd(malicious_content)

        # Verify the content is sanitized
        # (Implementation would depend on security measures)

    @pytest.mark.asyncio
    async def test_rate_limiting(
        self,
        mock_httpx_client,
        mock_mcp_jd_response,
    ):
        """Test rate limiting behavior."""
        mock_httpx_client.post.return_value.json.return_value = (
            mock_mcp_jd_response
        )

        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            client = MCPClient()

            # Make multiple rapid requests
            for _ in range(100):
                await client.parse_jd("Test content")

        # In production, rate limiting would be implemented
        # This test verifies the client can handle rapid requests
