"""
Comprehensive Error Handling Tests for SyncHire API
"""

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError, OperationalError
from unittest.mock import Mock
from app.core.errors import (
    AuthenticationError,
    ValidationError,
    NotFoundError,
    DatabaseError,
    handle_database_error,
)


class TestCustomErrors:
    """Test custom exception classes"""

    def test_authentication_error(self):
        """Test AuthenticationError exception"""
        error = AuthenticationError(
            message="Invalid credentials", details={"user_id": "test123"}
        )

        assert error.message == "Invalid credentials"
        assert error.status_code == status.HTTP_401_UNAUTHORIZED
        assert error.error_code == "AUTHENTICATION_FAILED"
        assert error.details["user_id"] == "test123"
        assert error.error_id is not None

    def test_validation_error(self):
        """Test ValidationError exception"""
        error = ValidationError(message="Email is required", field="email")

        assert error.message == "Email is required"
        assert error.status_code == status.HTTP_400_BAD_REQUEST
        assert error.error_code == "VALIDATION_ERROR"
        assert error.details["field"] == "email"

    def test_not_found_error(self):
        """Test NotFoundError exception"""
        error = NotFoundError(resource="User", details={"user_id": "nonexistent"})

        assert error.message == "User not found"
        assert error.status_code == status.HTTP_404_NOT_FOUND
        assert error.error_code == "NOT_FOUND"

    def test_database_error(self):
        """Test DatabaseError exception"""
        error = DatabaseError(message="Connection failed", details={"retry_after": 5})

        assert error.message == "Connection failed"
        assert error.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert error.error_code == "DATABASE_ERROR"


class TestErrorHandlers:
    """Test error handler responses"""

    def test_sync_hire_error_handler(self, client: TestClient):
        """Test SyncHireError handler response format"""
        # This would be tested via an endpoint that raises SyncHireError
        # For now, we test the error structure directly
        error = AuthenticationError(message="Test error")

        response_data = {
            "error": {
                "code": error.error_code,
                "message": error.message,
                "error_id": error.error_id,
            }
        }

        assert "error" in response_data
        assert response_data["error"]["code"] == "AUTHENTICATION_FAILED"
        assert response_data["error"]["message"] == "Test error"
        assert "error_id" in response_data["error"]

    def test_validation_error_response(self, client: TestClient):
        """Test validation error response"""
        response = client.post(
            "/api/auth/register",
            json={"email": "", "password": "test"},  # Invalid email
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "VALIDATION_ERROR"

    def test_not_found_error_response(self, client: TestClient):
        """Test not found error response"""
        response = client.get("/api/users/nonexistent-id")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert "error" in data


class TestDatabaseErrorHandling:
    """Test database error handling"""

    def test_handle_integrity_error(self):
        """Test handling of database integrity errors"""
        mock_error = Mock(spec=IntegrityError)
        mock_error.args = ["Duplicate entry"]

        with pytest.raises(ValidationError) as exc_info:
            handle_database_error(mock_error, "user creation")

        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert exc_info.value.error_code == "VALIDATION_ERROR"

    def test_handle_operational_error(self):
        """Test handling of database operational errors"""
        mock_error = Mock(spec=OperationalError)
        mock_error.args = ["Connection lost"]

        with pytest.raises(DatabaseError) as exc_info:
            handle_database_error(mock_error, "database query")

        assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert exc_info.value.error_code == "DATABASE_ERROR"

    def test_handle_generic_database_error(self):
        """Test handling of generic database errors"""
        mock_error = Exception("Unknown database error")

        with pytest.raises(DatabaseError) as exc_info:
            handle_database_error(mock_error, "operation")

        assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


class TestAPIErrorScenarios:
    """Test real-world API error scenarios"""

    def test_invalid_credentials(self, client: TestClient):
        """Test login with invalid credentials"""
        response = client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "wrongpassword"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert "error" in data
        # Should not reveal whether user exists for security
        assert "email" not in data["error"]["message"].lower()

    def test_duplicate_registration(self, client: TestClient):
        """Test registration with duplicate email"""
        # First registration
        client.post(
            "/api/auth/register",
            json={
                "email": "test@example.com",
                "password": "password123",
                "full_name": "Test User",
            },
        )

        # Duplicate registration
        response = client.post(
            "/api/auth/register",
            json={
                "email": "test@example.com",
                "password": "password123",
                "full_name": "Test User",
            },
        )

        assert response.status_code == status.HTTP_409_CONFLICT
        data = response.json()
        assert "error" in data

    def test_missing_required_fields(self, client: TestClient):
        """Test request with missing required fields"""
        response = client.post(
            "/api/auth/register",
            json={
                "email": "test@example.com"
                # Missing password
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "error" in data

    def test_malformed_json(self, client: TestClient):
        """Test request with malformed JSON"""
        response = client.post(
            "/api/auth/login",
            data="invalid json",
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_unauthorized_resource_access(self, client: TestClient):
        """Test accessing protected resource without auth"""
        response = client.get("/api/auth/me")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_rate_limiting(self, client: TestClient):
        """Test rate limiting behavior"""
        # Make multiple rapid requests
        responses = []
        for _ in range(10):
            response = client.post(
                "/api/auth/login",
                json={"email": "test@example.com", "password": "wrongpassword"},
            )
            responses.append(response)

        # At least one should be rate limited
        rate_limited = any(
            r.status_code == status.HTTP_429_TOO_MANY_REQUESTS for r in responses
        )
        assert rate_limited


class TestErrorRecovery:
    """Test error recovery mechanisms"""

    def test_transient_database_error_recovery(self, client: TestClient):
        """Test recovery from transient database errors"""
        # This would test retry logic for transient failures
        # Implementation depends on your retry mechanism
        pass

    def test_circuit_breaker_activation(self):
        """Test circuit breaker activation on repeated failures"""
        # This would test circuit breaker behavior
        # Implementation depends on your circuit breaker setup
        pass


class TestErrorLogging:
    """Test error logging and tracking"""

    def test_request_id_in_error_response(self, client: TestClient):
        """Test that request IDs are included in error responses"""
        response = client.get("/api/users/nonexistent-id")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert "error" in data
        # Check if request_id is in response or headers
        assert "X-Request-ID" in response.headers or "error_id" in data.get("error", {})

    def test_error_context_logging(self, client: TestClient, caplog):
        """Test that errors are logged with proper context"""
        with caplog.at_level("ERROR"):
            client.post(
                "/api/auth/login",
                json={"email": "test@example.com", "password": "wrongpassword"},
            )

            # Check that error was logged
            assert any("Authentication" in record.message for record in caplog.records)


class TestErrorMessageSecurity:
    """Test that error messages don't leak sensitive information"""

    def test_no_stack_traces_in_client_errors(self, client: TestClient):
        """Test that stack traces aren't exposed in client errors"""
        response = client.post(
            "/api/auth/register",
            json={"email": "invalid-email"},  # Missing required fields
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "error" in data
        # Should not contain stack traces or internal details
        assert "Traceback" not in str(data)
        assert "stack" not in str(data).lower()

    def test_no_database_errors_exposed(self, client: TestClient):
        """Test that database errors aren't directly exposed"""
        response = client.get("/api/users/nonexistent-id")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert "error" in data
        # Should not contain database-specific information
        assert "database" not in str(data).lower()
        assert "sql" not in str(data).lower()

    def test_generic_error_messages(self, client: TestClient):
        """Test that generic error messages are used for security"""
        response = client.post(
            "/api/auth/login",
            json={"email": "nonexistent@example.com", "password": "password123"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert "error" in data
        # Should use generic message to prevent email enumeration
        assert "invalid" in data["error"]["message"].lower()


class TestErrorHeaders:
    """Test error response headers"""

    def test_content_type_header(self, client: TestClient):
        """Test that error responses have correct content type"""
        response = client.get("/api/users/nonexistent-id")

        assert response.headers["content-type"] == "application/json"

    def test_request_id_header(self, client: TestClient):
        """Test that request ID header is present"""
        response = client.get("/api/users/nonexistent-id")

        assert "X-Request-ID" in response.headers

    def test_processing_time_header(self, client: TestClient):
        """Test that processing time header is present"""
        response = client.get("/api/users/nonexistent-id")

        assert "X-Processing-Time" in response.headers
        # Should be a valid number
        processing_time = float(response.headers["X-Processing-Time"])
        assert processing_time >= 0


@pytest.mark.integration
class TestErrorHandlingIntegration:
    """Integration tests for error handling"""

    def test_full_error_flow(self, client: TestClient):
        """Test complete error flow from request to response"""
        # Make a request that will fail
        response = client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "wrongpassword"},
        )

        # Verify response structure
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()

        # Check error structure
        assert "error" in data
        assert "code" in data["error"]
        assert "message" in data["error"]
        assert "error_id" in data["error"]

        # Check headers
        assert "X-Request-ID" in response.headers
        assert "X-Processing-Time" in response.headers

    def test_error_recovery_after_fix(self, client: TestClient):
        """Test that operations work after fixing the error"""
        # First, make a failing request
        response = client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "wrongpassword"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

        # Then make a successful request
        response = client.post(
            "/api/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "password123",
                "full_name": "New User",
            },
        )
        assert response.status_code == status.HTTP_201_CREATED
