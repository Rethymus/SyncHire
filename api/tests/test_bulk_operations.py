"""
Test suite for bulk operations on applications API

Tests cover:
- Bulk status updates
- Bulk tagging operations
- Partial failure handling
- Input validation
- Database transactions
"""

import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient

from app.models.application import Application
from app.models.user import User


@pytest.mark.asyncio
class TestBulkStatusUpdates:
    """Test bulk status update operations"""

    async def test_bulk_status_update_success(
        self,
        async_client: AsyncClient,
        test_user: User,
        test_applications: list[Application],
    ):
        """Test successful bulk status update"""
        application_ids = [app.id for app in test_applications[:3]]

        response = await async_client.post(
            "/api/applications/bulk-status-update",
            json={
                "ids": [str(app_id) for app_id in application_ids],
                "status": "interview",
                "notes": "Bulk status update test",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success_count"] == 3
        assert data["failed_count"] == 0
        assert len(data["errors"]) == 0

    async def test_bulk_status_update_partial_failure(
        self,
        async_client: AsyncClient,
        test_user: User,
        test_applications: list[Application],
    ):
        """Test bulk status update with some invalid IDs"""
        valid_ids = [app.id for app in test_applications[:2]]
        invalid_id = uuid.uuid4()

        response = await async_client.post(
            "/api/applications/bulk-status-update",
            json={
                "ids": [str(app_id) for app_id in valid_ids] + [str(invalid_id)],
                "status": "applied",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success_count"] == 2
        assert data["failed_count"] == 1
        assert len(data["errors"]) == 1
        assert str(invalid_id) in data["errors"][0]["id"]

    async def test_bulk_status_update_invalid_status(
        self,
        async_client: AsyncClient,
        test_user: User,
        test_applications: list[Application],
    ):
        """Test bulk status update with invalid status value"""
        application_ids = [app.id for app in test_applications[:1]]

        response = await async_client.post(
            "/api/applications/bulk-status-update",
            json={
                "ids": [str(app_id) for app_id in application_ids],
                "status": "invalid_status",
            },
        )

        assert response.status_code == 422  # Validation error

    async def test_bulk_status_update_exceeds_limit(
        self, async_client: AsyncClient, test_user: User
    ):
        """Test bulk status update exceeds maximum limit"""
        too_many_ids = [str(uuid.uuid4()) for _ in range(101)]

        response = await async_client.post(
            "/api/applications/bulk-status-update",
            json={
                "ids": too_many_ids,
                "status": "applied",
            },
        )

        assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
class TestBulkTagging:
    """Test bulk tagging operations"""

    async def test_bulk_tag_add_operation(
        self,
        async_client: AsyncClient,
        test_user: User,
        test_applications: list[Application],
    ):
        """Test bulk tag add operation"""
        application_ids = [app.id for app in test_applications[:3]]

        response = await async_client.post(
            "/api/applications/bulk-tag",
            json={
                "ids": [str(app_id) for app_id in application_ids],
                "tags": ["high-priority", "remote"],
                "operation": "add",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success_count"] == 3
        assert data["failed_count"] == 0
        assert len(data["errors"]) == 0

    async def test_bulk_tag_remove_operation(
        self,
        async_client: AsyncClient,
        test_user: User,
        test_applications: list[Application],
    ):
        """Test bulk tag remove operation"""
        application_ids = [app.id for app in test_applications[:2]]

        # First add tags
        await async_client.post(
            "/api/applications/bulk-tag",
            json={
                "ids": [str(app_id) for app_id in application_ids],
                "tags": ["test-tag", "another-tag"],
                "operation": "add",
            },
        )

        # Then remove one tag
        response = await async_client.post(
            "/api/applications/bulk-tag",
            json={
                "ids": [str(app_id) for app_id in application_ids],
                "tags": ["test-tag"],
                "operation": "remove",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success_count"] == 2

    async def test_bulk_tag_replace_operation(
        self,
        async_client: AsyncClient,
        test_user: User,
        test_applications: list[Application],
    ):
        """Test bulk tag replace operation"""
        application_ids = [app.id for app in test_applications[:2]]

        # First add initial tags
        await async_client.post(
            "/api/applications/bulk-tag",
            json={
                "ids": [str(app_id) for app_id in application_ids],
                "tags": ["old-tag-1", "old-tag-2"],
                "operation": "add",
            },
        )

        # Replace with new tags
        response = await async_client.post(
            "/api/applications/bulk-tag",
            json={
                "ids": [str(app_id) for app_id in application_ids],
                "tags": ["new-tag-1", "new-tag-2"],
                "operation": "replace",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success_count"] == 2

    async def test_bulk_tag_no_duplicates(
        self,
        async_client: AsyncClient,
        test_user: User,
        test_applications: list[Application],
    ):
        """Test that adding duplicate tags doesn't create duplicates"""
        application_ids = [app.id for app in test_applications[:1]]

        # Add same tags twice
        await async_client.post(
            "/api/applications/bulk-tag",
            json={
                "ids": [str(app_id) for app_id in application_ids],
                "tags": ["test-tag"],
                "operation": "add",
            },
        )

        response = await async_client.post(
            "/api/applications/bulk-tag",
            json={
                "ids": [str(app_id) for app_id in application_ids],
                "tags": ["test-tag", "another-tag"],
                "operation": "add",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success_count"] == 1

        # Verify no duplicates in final result
        app_response = await async_client.get(f"/api/applications/{application_ids[0]}")
        app_data = app_response.json()
        tag_count = len([tag for tag in app_data["tags"] if tag == "test-tag"])
        assert tag_count == 1, "Duplicate tags should not exist"

    async def test_bulk_tag_invalid_operation(
        self,
        async_client: AsyncClient,
        test_user: User,
        test_applications: list[Application],
    ):
        """Test bulk tag with invalid operation type"""
        application_ids = [app.id for app in test_applications[:1]]

        response = await async_client.post(
            "/api/applications/bulk-tag",
            json={
                "ids": [str(app_id) for app_id in application_ids],
                "tags": ["test-tag"],
                "operation": "invalid_operation",
            },
        )

        assert response.status_code == 422  # Validation error

    async def test_bulk_tag_empty_tags(
        self,
        async_client: AsyncClient,
        test_user: User,
        test_applications: list[Application],
    ):
        """Test bulk tag with empty tags list"""
        application_ids = [app.id for app in test_applications[:1]]

        response = await async_client.post(
            "/api/applications/bulk-tag",
            json={
                "ids": [str(app_id) for app_id in application_ids],
                "tags": [],
                "operation": "add",
            },
        )

        assert response.status_code == 422  # Validation error

    async def test_bulk_tag_sanitization(
        self,
        async_client: AsyncClient,
        test_user: User,
        test_applications: list[Application],
    ):
        """Test that tags are properly sanitized"""
        application_ids = [app.id for app in test_applications[:1]]

        response = await async_client.post(
            "/api/applications/bulk-tag",
            json={
                "ids": [str(app_id) for app_id in application_ids],
                "tags": [
                    "  test-tag  ",
                    "another-tag  ",
                    "",
                    "  ",
                ],  # Include whitespace and empty tags
                "operation": "add",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success_count"] == 1

    async def test_bulk_tag_too_long(
        self,
        async_client: AsyncClient,
        test_user: User,
        test_applications: list[Application],
    ):
        """Test bulk tag with tag exceeding maximum length"""
        application_ids = [app.id for app in test_applications[:1]]
        too_long_tag = "a" * 51  # Exceeds 50 character limit

        response = await async_client.post(
            "/api/applications/bulk-tag",
            json={
                "ids": [str(app_id) for app_id in application_ids],
                "tags": [too_long_tag],
                "operation": "add",
            },
        )

        assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
class TestBulkOperationIntegration:
    """Integration tests for bulk operations"""

    async def test_bulk_status_and_tag_combined(
        self,
        async_client: AsyncClient,
        test_user: User,
        test_applications: list[Application],
    ):
        """Test combining bulk status update with bulk tagging"""
        application_ids = [app.id for app in test_applications[:3]]

        # Update status
        status_response = await async_client.post(
            "/api/applications/bulk-status-update",
            json={
                "ids": [str(app_id) for app_id in application_ids],
                "status": "interview",
            },
        )
        assert status_response.status_code == 200

        # Add tags
        tag_response = await async_client.post(
            "/api/applications/bulk-tag",
            json={
                "ids": [str(app_id) for app_id in application_ids],
                "tags": ["interview-stage", "high-priority"],
                "operation": "add",
            },
        )
        assert tag_response.status_code == 200

        # Verify both operations succeeded
        for app_id in application_ids:
            app_response = await async_client.get(f"/api/applications/{app_id}")
            app_data = app_response.json()
            assert app_data["status"] == "interview"
            assert "interview-stage" in app_data["tags"]
            assert "high-priority" in app_data["tags"]

    async def test_bulk_operations_transaction_rollback(
        self,
        async_client: AsyncClient,
        test_user: User,
        test_applications: list[Application],
    ):
        """Test that partial failures don't affect successful operations"""
        application_ids = [app.id for app in test_applications[:2]]
        invalid_id = uuid.uuid4()

        # Perform operation with mixed valid/invalid IDs
        response = await async_client.post(
            "/api/applications/bulk-tag",
            json={
                "ids": [str(app_id) for app_id in application_ids] + [str(invalid_id)],
                "tags": ["test-tag"],
                "operation": "add",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success_count"] == 2
        assert data["failed_count"] == 1

        # Verify successful operations were committed
        for app_id in application_ids:
            app_response = await async_client.get(f"/api/applications/{app_id}")
            app_data = app_response.json()
            assert "test-tag" in app_data["tags"]


# Pytest fixtures for test data
@pytest.fixture
async def test_applications(
    db: AsyncSession, test_user: User, test_resume: uuid.UUID, test_jd: uuid.UUID
) -> list[Application]:
    """Create test applications for bulk operations"""
    applications = []
    for i in range(5):
        application = Application(
            user_id=test_user.id,
            resume_id=test_resume,
            jd_id=test_jd,
            status="pending",
            notes=f"Test application {i}",
        )
        db.add(application)
        applications.append(application)

    await db.commit()
    for app in applications:
        await db.refresh(app)

    return applications


@pytest.fixture
def test_resume(test_user: User) -> uuid.UUID:
    """Return a test resume ID"""
    return uuid.uuid4()


@pytest.fixture
def test_jd(test_user: User) -> uuid.UUID:
    """Return a test JD ID"""
    return uuid.uuid4()
