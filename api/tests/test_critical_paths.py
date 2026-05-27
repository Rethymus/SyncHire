"""
Critical path tests for backend API
Tests authentication, file upload, application management, and search
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.resume import Resume
from app.models.jd import JD
from app.models.application import Application
from datetime import datetime, timedelta
from tests.test_api_helpers import APITestHelpers


@pytest.mark.auth
class TestAuthenticationFlow:
    """Test authentication flow"""

    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, test_user: User):
        """Test successful login"""
        response = await client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "testpass123"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["user"]["email"] == "test@example.com"
        assert "access_token" in data["data"]["session"]

    @pytest.mark.asyncio
    async def test_login_invalid_credentials(self, client: AsyncClient):
        """Test login with invalid credentials"""
        response = await client.post(
            "/auth/login",
            json={"email": "nonexistent@example.com", "password": "wrongpass"}
        )

        assert response.status_code == 401
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "INVALID_CREDENTIALS"

    @pytest.mark.asyncio
    async def test_signup_success(self, client: AsyncClient):
        """Test successful signup"""
        response = await client.post(
            "/auth/signup",
            json={
                "email": "newuser@example.com",
                "username": "newuser",
                "password": "securepass123",
                "full_name": "New User"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["user"]["email"] == "newuser@example.com"

    @pytest.mark.asyncio
    async def test_signup_duplicate_email(self, client: AsyncClient, test_user: User):
        """Test signup with duplicate email"""
        response = await client.post(
            "/auth/signup",
            json={
                "email": "test@example.com",
                "username": "different",
                "password": "securepass123",
                "full_name": "Different User"
            }
        )

        assert response.status_code == 409
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "USER_EXISTS"

    @pytest.mark.asyncio
    async def test_password_reset_flow(self, client: AsyncClient, test_user: User):
        """Test password reset flow"""
        # Request reset
        response = await client.post(
            "/auth/forgot-password",
            json={"email": "test@example.com"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_2fa_setup(self, client: AsyncClient, test_user: User, auth_headers):
        """Test 2FA setup"""
        response = await client.post(
            "/auth/2fa/setup",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "qr_code" in data["data"]
        assert "backup_codes" in data["data"]

    @pytest.mark.asyncio
    async def test_2fa_verification(self, client: AsyncClient, test_user_with_2fa: User):
        """Test 2FA verification"""
        # First login without 2FA code should fail
        response = await client.post(
            "/auth/login",
            json={"email": "2fa@example.com", "password": "testpass123"}
        )

        assert response.status_code == 401
        data = response.json()
        assert data["error"]["code"] == "REQUIRES_2FA"

        # Login with 2FA code should succeed
        response = await client.post(
            "/auth/login",
            json={
                "email": "2fa@example.com",
                "password": "testpass123",
                "two_factor_code": "123456"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


@pytest.mark.integration
class TestFileUploadFlow:
    """Test file upload flow"""

    @pytest.mark.asyncio
    async def test_upload_resume_pdf(self, client: AsyncClient, test_user: User, auth_headers, temp_file):
        """Test uploading resume PDF"""
        with open(temp_file, 'rb') as f:
            response = await client.post(
                "/resumes/upload",
                headers=auth_headers,
                files={"file": ("resume.pdf", f, "application/pdf")}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["file_name"] == "resume.pdf"

    @pytest.mark.asyncio
    async def test_upload_resume_invalid_format(self, client: AsyncClient, test_user: User, auth_headers):
        """Test uploading invalid file format"""
        response = await client.post(
            "/resumes/upload",
            headers=auth_headers,
            files={"file": ("resume.exe", b"malicious content", "application/octet-stream")}
        )

        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "INVALID_FILE_TYPE"

    @pytest.mark.asyncio
    async def test_upload_resume_too_large(self, client: AsyncClient, test_user: User, auth_headers):
        """Test uploading file that's too large"""
        large_content = b"x" * (6 * 1024 * 1024)  # 6MB
        response = await client.post(
            "/resumes/upload",
            headers=auth_headers,
            files={"file": ("large.pdf", large_content, "application/pdf")}
        )

        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "FILE_TOO_LARGE"

    @pytest.mark.asyncio
    async def test_parse_resume(self, client: AsyncClient, test_resume: Resume, auth_headers):
        """Test resume parsing"""
        response = await client.post(
            f"/resumes/{test_resume.id}/parse",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "parsed_data" in data["data"]
        assert "ats_score" in data["data"]


@pytest.mark.integration
class TestApplicationManagement:
    """Test application management flow"""

    @pytest.mark.asyncio
    async def test_create_application(self, client: AsyncClient, test_user: User, test_resume: Resume, test_jd: JD, auth_headers):
        """Test creating application"""
        response = await client.post(
            "/applications",
            headers=auth_headers,
            json={
                "resume_id": str(test_resume.id),
                "jd_id": str(test_jd.id)
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["resume_id"] == str(test_resume.id)
        assert data["data"]["jd_id"] == str(test_jd.id)
        assert "match_score" in data["data"]

    @pytest.mark.asyncio
    async def test_update_application_status(self, client: AsyncClient, test_application: Application, auth_headers):
        """Test updating application status"""
        response = await client.patch(
            f"/applications/{test_application.id}/status",
            headers=auth_headers,
            json={"status": "under_review"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "under_review"

    @pytest.mark.asyncio
    async def test_invalid_status_transition(self, client: AsyncClient, test_application: Application, auth_headers):
        """Test invalid status transition"""
        response = await client.patch(
            f"/applications/{test_application.id}/status",
            headers=auth_headers,
            json={"status": "offer_received"}  # Can't go from applied to offer
        )

        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "INVALID_STATUS_TRANSITION"

    @pytest.mark.asyncio
    async def test_list_applications(self, client: AsyncClient, test_user: User, test_application: Application, auth_headers):
        """Test listing applications"""
        response = await client.get(
            "/applications",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]["items"]) >= 1

    @pytest.mark.asyncio
    async def test_filter_applications_by_status(self, client: AsyncClient, test_application: Application, auth_headers):
        """Test filtering applications by status"""
        response = await client.get(
            "/applications?status=applied",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert all(app["status"] == "applied" for app in data["data"]["items"])


@pytest.mark.integration
class TestSearchFunctionality:
    """Test search functionality"""

    @pytest.mark.asyncio
    async def test_search_resumes(self, client: AsyncClient, test_user: User, test_resume: Resume, auth_headers):
        """Test searching resumes"""
        response = await client.get(
            "/search/resumes?q=software",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]["results"]) >= 1

    @pytest.mark.asyncio
    async def test_search_jds(self, client: AsyncClient, test_user: User, test_jd: JD, auth_headers):
        """Test searching job descriptions"""
        response = await client.get(
            "/search/jds?q=senior",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]["results"]) >= 1

    @pytest.mark.asyncio
    async def test_search_applications(self, client: AsyncClient, test_application: Application, auth_headers):
        """Test searching applications"""
        response = await client.get(
            "/search/applications?q=applied",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "results" in data["data"]

    @pytest.mark.asyncio
    async def test_search_with_filters(self, client: AsyncClient, test_user: User, auth_headers):
        """Test search with filters"""
        response = await client.get(
            "/search/resumes?q=software&min_ats_score=80",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


@pytest.mark.integration
class TestInterviewManagement:
    """Test interview management"""

    @pytest.mark.asyncio
    async def test_schedule_interview(self, client: AsyncClient, test_application: Application, auth_headers):
        """Test scheduling interview"""
        scheduled_at = (datetime.now() + timedelta(days=7)).isoformat()

        response = await client.post(
            f"/applications/{test_application.id}/interviews",
            headers=auth_headers,
            json={
                "scheduled_at": scheduled_at,
                "interview_type": "technical",
                "notes": "Technical interview"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["interview_type"] == "technical"

    @pytest.mark.asyncio
    async def test_update_interview(self, client: AsyncClient, test_interview, auth_headers):
        """Test updating interview"""
        new_time = (datetime.now() + timedelta(days=14)).isoformat()

        response = await client.put(
            f"/interviews/{test_interview.id}",
            headers=auth_headers,
            json={
                "scheduled_at": new_time,
                "status": "rescheduled"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_cancel_interview(self, client: AsyncClient, test_interview, auth_headers):
        """Test cancelling interview"""
        response = await client.put(
            f"/interviews/{test_interview.id}",
            headers=auth_headers,
            json={"status": "cancelled"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "cancelled"


@pytest.mark.performance
class TestPerformanceCriticalPaths:
    """Test performance of critical paths"""

    @pytest.mark.asyncio
    async def test_login_performance(self, client: AsyncClient, test_user: User, performance_thresholds):
        """Test login response time"""
        import time

        start_time = time.time()
        await client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "testpass123"}
        )
        response_time = time.time() - start_time

        assert response_time <= performance_thresholds["max_response_time"]

    @pytest.mark.asyncio
    async def test_file_upload_performance(self, client: AsyncClient, test_user: User, auth_headers, temp_file, performance_thresholds):
        """Test file upload response time"""
        import time

        with open(temp_file, 'rb') as f:
            start_time = time.time()
            await client.post(
                "/resumes/upload",
                headers=auth_headers,
                files={"file": ("resume.pdf", f, "application/pdf")}
            )
            response_time = time.time() - start_time

        assert response_time <= performance_thresholds["max_response_time"] * 5  # Allow 5x for uploads

    @pytest.mark.asyncio
    async def test_search_performance(self, client: AsyncClient, test_user: User, auth_headers, performance_thresholds):
        """Test search response time"""
        import time

        start_time = time.time()
        await client.get(
            "/search/resumes?q=software",
            headers=auth_headers
        )
        response_time = time.time() - start_time

        assert response_time <= performance_thresholds["max_response_time"]
