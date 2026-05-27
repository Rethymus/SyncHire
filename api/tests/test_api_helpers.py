"""
API test helper utilities
Provides reusable functions for API testing
"""

import asyncio
from typing import Dict, Any, Optional, List
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.resume import Resume
from app.models.jd import JD
from app.models.application import Application
from datetime import datetime, timedelta
import json


class APITestHelpers:
    """Helper class for API testing"""

    def __init__(self, client: AsyncClient, db: AsyncSession):
        self.client = client
        self.db = db

    async def create_test_user(
        self,
        email: str = "test@example.com",
        username: str = "testuser",
        password: str = "testpass123",
        **kwargs,
    ) -> User:
        """Create a test user"""
        import uuid
        from app.core.security import get_password_hash

        user = User(
            id=uuid.uuid4(),
            email=email,
            username=username,
            full_name=kwargs.get("full_name", "Test User"),
            hashed_password=get_password_hash(password),
            **kwargs,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def login_user(self, email: str, password: str) -> Dict[str, Any]:
        """Login user and return response"""
        response = await self.client.post(
            "/auth/login", json={"email": email, "password": password}
        )
        return response.json()

    async def get_auth_headers(self, user: User) -> Dict[str, str]:
        """Get authentication headers for user"""
        import jwt

        token = jwt.encode(
            {"sub": str(user.id), "exp": datetime.utcnow() + timedelta(hours=1)},
            "test_secret_key",
            algorithm="HS256",
        )
        return {"Authorization": f"Bearer {token}"}

    async def create_test_resume(self, user: User, **kwargs) -> Resume:
        """Create a test resume"""
        import uuid

        resume = Resume(
            id=uuid.uuid4(),
            user_id=user.id,
            title=kwargs.get("title", "Software Engineer Resume"),
            content=kwargs.get("content", "Experienced software engineer"),
            file_url=kwargs.get("file_url", "https://example.com/resume.pdf"),
            **kwargs,
        )
        self.db.add(resume)
        await self.db.commit()
        await self.db.refresh(resume)
        return resume

    async def create_test_jd(self, user: User, **kwargs) -> JD:
        """Create a test job description"""
        import uuid

        jd = JD(
            id=uuid.uuid4(),
            user_id=user.id,
            title=kwargs.get("title", "Senior Software Engineer"),
            company_name=kwargs.get("company_name", "Tech Corp"),
            content=kwargs.get("content", "We are looking for a senior engineer"),
            location=kwargs.get("location", "San Francisco, CA"),
            **kwargs,
        )
        self.db.add(jd)
        await self.db.commit()
        await self.db.refresh(jd)
        return jd

    async def create_test_application(
        self, user: User, resume: Resume, jd: JD, **kwargs
    ) -> Application:
        """Create a test application"""
        import uuid

        application = Application(
            id=uuid.uuid4(),
            user_id=user.id,
            resume_id=resume.id,
            jd_id=jd.id,
            status=kwargs.get("status", "applied"),
            match_score=kwargs.get("match_score", 0.85),
            **kwargs,
        )
        self.db.add(application)
        await self.db.commit()
        await self.db.refresh(application)
        return application

    async def assert_success_response(
        self, response: Dict[str, Any], expected_data: Optional[Dict[str, Any]] = None
    ):
        """Assert API response is successful"""
        assert response["success"] is True
        if expected_data:
            assert response["data"] == expected_data

    async def assert_error_response(
        self, response: Dict[str, Any], expected_error_code: str, expected_status: int
    ):
        """Assert API response is an error"""
        assert response["success"] is False
        assert response["error"]["code"] == expected_error_code

    async def assert_validation_error(
        self, response: Dict[str, Any], field: str, message: str
    ):
        """Assert validation error in response"""
        assert response["success"] is False
        assert response["error"]["code"] == "VALIDATION_ERROR"
        assert field in response["error"]["details"]
        assert message in response["error"]["details"][field]

    async def assert_not_found(self, response: Dict[str, Any], resource: str):
        """Assert not found error in response"""
        assert response["success"] is False
        assert response["error"]["code"] == "NOT_FOUND"
        assert resource.lower() in response["error"]["message"].lower()

    async def assert_unauthorized(self, response: Dict[str, Any]):
        """Assert unauthorized error in response"""
        assert response["success"] is False
        assert response["error"]["code"] in ["UNAUTHORIZED", "AUTHENTICATION_REQUIRED"]

    async def assert_forbidden(self, response: Dict[str, Any]):
        """Assert forbidden error in response"""
        assert response["success"] is False
        assert response["error"]["code"] == "FORBIDDEN"

    async def assert_rate_limited(self, response: Dict[str, Any]):
        """Assert rate limited error in response"""
        assert response["success"] is False
        assert response["error"]["code"] == "RATE_LIMIT_EXCEEDED"

    async def wait_for_condition(
        self, condition, timeout: float = 5.0, interval: float = 0.1
    ):
        """Wait for a condition to be true"""
        start_time = asyncio.get_event_loop().time()

        while asyncio.get_event_loop().time() - start_time < timeout:
            if await condition():
                return
            await asyncio.sleep(interval)

        raise TimeoutError(f"Condition not met within {timeout} seconds")

    async def measure_response_time(
        self, endpoint: str, method: str = "GET", **kwargs
    ) -> float:
        """Measure API response time"""
        import time

        start_time = time.time()

        if method == "GET":
            await self.client.get(endpoint, **kwargs)
        elif method == "POST":
            await self.client.post(endpoint, **kwargs)
        elif method == "PUT":
            await self.client.put(endpoint, **kwargs)
        elif method == "DELETE":
            await self.client.delete(endpoint, **kwargs)
        elif method == "PATCH":
            await self.client.patch(endpoint, **kwargs)

        return time.time() - start_time

    async def assert_performance_threshold(
        self, endpoint: str, max_time: float, method: str = "GET", **kwargs
    ):
        """Assert API response time is within threshold"""
        response_time = await self.measure_response_time(endpoint, method, **kwargs)
        assert (
            response_time <= max_time
        ), f"Response time {response_time}s exceeded threshold {max_time}s"

    async def bulk_create_resources(
        self, resource_type: str, count: int, user: User, **kwargs
    ) -> List:
        """Bulk create test resources"""
        resources = []

        for i in range(count):
            if resource_type == "resume":
                resource = await self.create_test_resume(
                    user, title=f"Resume {i+1}", **kwargs
                )
            elif resource_type == "jd":
                resource = await self.create_test_jd(
                    user, title=f"Job Description {i+1}", **kwargs
                )
            elif resource_type == "application":
                resume = await self.create_test_resume(user)
                jd = await self.create_test_jd(user)
                resource = await self.create_test_application(
                    user, resume, jd, **kwargs
                )
            else:
                raise ValueError(f"Unknown resource type: {resource_type}")

            resources.append(resource)

        return resources

    async def test_pagination(
        self,
        endpoint: str,
        total_items: int,
        per_page: int = 10,
        headers: Optional[Dict[str, str]] = None,
    ):
        """Test pagination functionality"""
        # Test first page
        params = {"page": 1, "per_page": per_page}
        response = await self.client.get(endpoint, params=params, headers=headers)
        data = response.json()

        assert data["success"] is True
        assert len(data["data"]["items"]) <= per_page
        assert data["data"]["page"] == 1
        assert data["data"]["total"] == total_items

        # Test next page
        if total_items > per_page:
            params["page"] = 2
            response = await self.client.get(endpoint, params=params, headers=headers)
            data = response.json()

            assert data["success"] is True
            assert data["data"]["page"] == 2
            assert data["data"]["has_prev"] is True

    async def test_filtering(
        self,
        endpoint: str,
        filter_param: str,
        filter_value: Any,
        expected_count: int,
        headers: Optional[Dict[str, str]] = None,
    ):
        """Test filtering functionality"""
        params = {filter_param: filter_value}
        response = await self.client.get(endpoint, params=params, headers=headers)
        data = response.json()

        assert data["success"] is True
        assert len(data["data"]["items"]) == expected_count

    async def test_sorting(
        self,
        endpoint: str,
        sort_param: str,
        sort_order: str,
        headers: Optional[Dict[str, str]] = None,
    ):
        """Test sorting functionality"""
        params = {"sort": sort_param, "order": sort_order}
        response = await self.client.get(endpoint, params=params, headers=headers)
        data = response.json()

        assert data["success"] is True

        # Verify sorting order
        items = data["data"]["items"]
        if sort_order == "asc":
            assert items[0][sort_param] <= items[-1][sort_param]
        else:
            assert items[0][sort_param] >= items[-1][sort_param]

    async def test_search(
        self,
        endpoint: str,
        search_query: str,
        expected_results: int,
        headers: Optional[Dict[str, str]] = None,
    ):
        """Test search functionality"""
        params = {"q": search_query}
        response = await self.client.get(endpoint, params=params, headers=headers)
        data = response.json()

        assert data["success"] is True
        assert len(data["data"]["items"]) >= expected_results

    async def cleanup_test_data(self, user: User):
        """Clean up test data for user"""
        # Delete applications
        await self.db.execute(f"DELETE FROM applications WHERE user_id = '{user.id}'")

        # Delete resumes
        await self.db.execute(f"DELETE FROM resumes WHERE user_id = '{user.id}'")

        # Delete JDs
        await self.db.execute(f"DELETE FROM jds WHERE user_id = '{user.id}'")

        # Delete user
        await self.db.execute(f"DELETE FROM users WHERE id = '{user.id}'")

        await self.db.commit()


@pytest.fixture
async def api_helpers(client: AsyncClient, db: AsyncSession):
    """Fixture providing API test helpers"""
    return APITestHelpers(client, db)
