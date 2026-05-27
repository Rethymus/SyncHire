"""
GDPR Compliance API Tests

Tests for GDPR compliance features including:
- Account deletion requests
- Data export functionality
- Data backup and restore
- User rights implementation
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.user import User
from app.models.resume import Resume
from app.models.jd import JD
from app.models.application import Application


client = TestClient(app)


class TestAccountDeletion:
    """Test account deletion functionality."""

    @pytest.fixture
    async def test_user_with_data(self, db: AsyncSession):
        """Create a test user with sample data."""
        # Create user
        user = User(
            email="test_deletion@example.com",
            hashed_password="hashed_password",
            full_name="Test User",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        # Create sample data
        resume = Resume(
            user_id=user.id,
            title="Test Resume",
            file_path="/test/resume.pdf",
            content="Resume content",
        )
        db.add(resume)

        jd = JD(
            user_id=user.id,
            title="Software Engineer",
            company="Tech Company",
            content="Job description content",
        )
        db.add(jd)

        application = Application(
            user_id=user.id,
            resume_id=resume.id,
            jd_id=jd.id,
            status="pending",
        )
        db.add(application)

        await db.commit()
        return user

    def test_account_deletion_request_requires_confirmation(self, auth_headers):
        """Test that account deletion requires explicit confirmation."""
        response = client.post(
            "/api/gdpr/account/deletion-request",
            json={"confirm": False, "reason": "Testing"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "confirm" in response.json()["detail"].lower()

    def test_account_deletion_request_success(self, auth_headers):
        """Test successful account deletion request."""
        response = client.post(
            "/api/gdpr/account/deletion-request",
            json={"confirm": True, "reason": "No longer needed"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "scheduled_for" in data
        assert "grace_period_days" in data
        assert data["grace_period_days"] == 30
        assert "deletion_token" in data

    def test_account_deletion_cancel(self, auth_headers):
        """Test cancelling account deletion request."""
        # First request deletion
        delete_response = client.post(
            "/api/gdpr/account/deletion-request",
            json={"confirm": True, "reason": "Testing"},
            headers=auth_headers,
        )
        deletion_token = delete_response.json()["deletion_token"]

        # Cancel deletion
        cancel_response = client.post(
            f"/api/gdpr/account/deletion-cancel/{deletion_token}",
            headers=auth_headers,
        )

        assert cancel_response.status_code == 200
        data = cancel_response.json()
        assert data["account_status"] == "active"


class TestDataExport:
    """Test data export functionality."""

    def test_export_full_user_data(self, auth_headers):
        """Test exporting complete user data as ZIP."""
        response = client.get(
            "/api/gdpr/data/export-full",
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/zip"
        assert "attachment" in response.headers["content-disposition"]

    def test_export_applications_csv(self, auth_headers):
        """Test exporting applications as CSV."""
        response = client.get(
            "/api/export/applications/csv",
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv"
        assert "applications_export" in response.headers["content-disposition"]

        # Verify CSV content
        content = response.content.decode("utf-8")
        assert "ID" in content
        assert "Company" in content
        assert "Position" in content
        assert "Status" in content

    def test_export_resumes_csv(self, auth_headers):
        """Test exporting resumes as CSV."""
        response = client.get(
            "/api/export/resumes/csv",
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv"
        assert "resumes_export" in response.headers["content-disposition"]

        # Verify CSV content
        content = response.content.decode("utf-8")
        assert "ID" in content
        assert "Title" in content
        assert "Created Date" in content

    def test_export_jds_csv(self, auth_headers):
        """Test exporting job descriptions as CSV."""
        response = client.get(
            "/api/export/jds/csv",
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv"
        assert "jds_export" in response.headers["content-disposition"]

        # Verify CSV content
        content = response.content.decode("utf-8")
        assert "ID" in content
        assert "Title" in content
        assert "Company" in content


class TestDataBackup:
    """Test data backup and restore functionality."""

    def test_create_backup_without_confirmation(self, auth_headers):
        """Test that backup creation requires confirmation for restore."""
        response = client.post(
            "/api/gdpr/data/restore",
            json={"backup_id": "test_backup", "confirm": False},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "confirm" in response.json()["detail"].lower()

    def test_create_data_backup(self, auth_headers):
        """Test creating a data backup."""
        response = client.post(
            "/api/gdpr/data/backup",
            json={
                "include_files": True,
                "format": "json",
            },
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "backup_id" in data
        assert "created_at" in data
        assert "expires_at" in data
        assert data["format"] == "json"

    def test_list_user_backups(self, auth_headers):
        """Test listing user backups."""
        response = client.get(
            "/api/gdpr/data/backups",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "backups" in data
        assert isinstance(data["backups"], list)

    def test_restore_data_backup(self, auth_headers):
        """Test restoring data from backup."""
        response = client.post(
            "/api/gdpr/data/restore",
            json={
                "backup_id": "test_backup_id",
                "confirm": True,
            },
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "backup_id" in data
        assert "status" in data
        assert data["status"] == "processing"


class TestGDPRCompliance:
    """Test GDPR compliance features."""

    def test_gdpr_compliance_summary(self, auth_headers):
        """Test getting GDPR compliance summary."""
        response = client.get(
            "/api/gdpr/compliance/summary",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        # Verify data inventory
        assert "data_inventory" in data
        assert "resumes" in data["data_inventory"]
        assert "job_descriptions" in data["data_inventory"]
        assert "applications" in data["data_inventory"]

        # Verify retention periods
        assert "data_retention" in data
        assert "user_data" in data["data_retention"]
        assert "application_data" in data["data_retention"]

        # Verify processing purposes
        assert "processing_purposes" in data

        # Verify user rights
        assert "user_rights" in data
        assert "right_to_access" in data["user_rights"]
        assert "right_to_erasure" in data["user_rights"]
        assert "right_to_portability" in data["user_rights"]


class TestDataClearance:
    """Test data clearance functionality."""

    def test_clear_all_data_requires_confirmation(self, auth_headers):
        """Test that data clearance requires explicit confirmation."""
        response = client.delete(
            "/api/gdpr/data/clear?confirm=false",
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "confirm" in response.json()["detail"].lower()

    def test_clear_all_user_data(self, auth_headers):
        """Test immediate data clearance."""
        response = client.delete(
            "/api/gdpr/data/clear?confirm=true",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "deleted_at" in data
        assert "data_cleared" in data
        assert isinstance(data["data_cleared"], list)


class TestDataPortability:
    """Test GDPR right to data portability."""

    def test_data_export_format_compliance(self, auth_headers):
        """Test that exported data is in machine-readable format."""
        response = client.get(
            "/api/gdpr/data/export-full",
            headers=auth_headers,
        )

        assert response.status_code == 200

        # Verify ZIP format (structured, commonly used format)
        assert response.headers["content-type"] == "application/zip"

    def test_csv_export_structure(self, auth_headers):
        """Test CSV exports have proper structure."""
        endpoints = [
            "/api/export/applications/csv",
            "/api/export/resumes/csv",
            "/api/export/jds/csv",
        ]

        for endpoint in endpoints:
            response = client.get(endpoint, headers=auth_headers)
            assert response.status_code == 200

            content = response.content.decode("utf-8")
            lines = content.split("\n")

            # Verify header row exists
            assert len(lines) > 0
            assert "," in lines[0]  # CSV format

    def test_export_contains_all_required_fields(self, auth_headers):
        """Test that exports contain all required GDPR fields."""
        response = client.get(
            "/api/gdpr/compliance/summary",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        # Verify all data categories are present
        assert "data_inventory" in data
        required_categories = [
            "resumes",
            "job_descriptions",
            "applications",
            "search_history",
        ]

        for category in required_categories:
            assert category in data["data_inventory"]


class TestRateLimiting:
    """Test rate limiting on GDPR endpoints."""

    def test_deletion_request_rate_limiting(self, auth_headers):
        """Test that deletion requests are rate-limited."""
        # Make multiple requests
        responses = []
        for _ in range(5):
            response = client.post(
                "/api/gdpr/account/deletion-request",
                json={"confirm": True, "reason": "Testing"},
                headers=auth_headers,
            )
            responses.append(response)

        # At least some should be rate-limited
        rate_limited = any(r.status_code == 429 for r in responses)
        assert rate_limited, "Expected rate limiting on deletion requests"

    def test_export_rate_limiting(self, auth_headers):
        """Test that export endpoints are rate-limited."""
        responses = []
        for _ in range(10):
            response = client.get(
                "/api/export/applications/csv",
                headers=auth_headers,
            )
            responses.append(response)

        # Should have rate limiting
        rate_limited = any(r.status_code == 429 for r in responses)
        assert rate_limited, "Expected rate limiting on export requests"


@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers for test user."""
    # In a real implementation, this would create valid JWT tokens
    return {"Authorization": "Bearer test_token"}
