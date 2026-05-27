"""
Comprehensive unit tests for ApplicationService

These tests follow 2026 best practices:
- Async testing with pytest-asyncio
- Comprehensive mocking of external dependencies
- Edge case and error case coverage
- Transaction rollback testing
- Database session isolation
"""

import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.services.application_service import ApplicationService
from app.services.resume_service import ResumeService
from app.services.jd_service import JDService
from app.models.application import Application
from app.schemas.application import (
    ApplicationCreate,
    ApplicationStatusUpdate,
    BulkTagRequest,
)
from app.core.errors import ValidationError, NotFoundError, DatabaseError


@pytest.mark.unit
class TestApplicationServiceCreate:
    """Test application creation with comprehensive error handling"""

    @pytest.mark.asyncio
    async def test_create_application_success(self, db_session: AsyncSession):
        """Test successful application creation"""
        # Create test user
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        app_data = ApplicationCreate(
            resume_id=resume_id,
            jd_id=jd_id,
        )

        # Mock the dependent services
        with patch.object(
            ResumeService, "get_resume", new=AsyncMock()
        ) as mock_get_resume, patch.object(
            JDService, "get_jd", new=AsyncMock()
        ) as mock_get_jd:

            # Setup mock returns
            from app.models.resume import Resume
            from app.models.jd import JD

            mock_resume = Resume(
                id=resume_id,
                user_id=user_id,
                title="Test Resume",
                content="Resume content",
            )
            mock_jd = JD(
                id=jd_id,
                user_id=user_id,
                title="Test JD",
                company="Test Company",
                content="JD content",
            )

            mock_get_resume.return_value = mock_resume
            mock_get_jd.return_value = mock_jd

            # Execute
            result = await ApplicationService.create_application(
                db=db_session, user_id=user_id, app_data=app_data
            )

            # Assert
            assert result.resume_id == resume_id
            assert result.jd_id == jd_id
            assert result.user_id == user_id
            mock_get_resume.assert_called_once_with(db_session, resume_id, user_id)
            mock_get_jd.assert_called_once_with(db_session, jd_id, user_id)

    @pytest.mark.asyncio
    async def test_create_application_validation_error_missing_ids(
        self, db_session: AsyncSession
    ):
        """Test application creation with missing resume_id and jd_id"""
        user_id = uuid.uuid4()

        app_data = ApplicationCreate(
            resume_id=None,
            jd_id=None,
        )

        with pytest.raises(ValidationError) as exc_info:
            await ApplicationService.create_application(
                db=db_session, user_id=user_id, app_data=app_data
            )

        assert "Resume ID and JD ID are required" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_create_application_resume_not_found(self, db_session: AsyncSession):
        """Test application creation with non-existent resume"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        app_data = ApplicationCreate(
            resume_id=resume_id,
            jd_id=jd_id,
        )

        with patch.object(
            ResumeService, "get_resume", new=AsyncMock()
        ) as mock_get_resume:
            mock_get_resume.side_effect = NotFoundError(
                resource="Resume", details={"resume_id": str(resume_id)}
            )

            with pytest.raises(NotFoundError) as exc_info:
                await ApplicationService.create_application(
                    db=db_session, user_id=user_id, app_data=app_data
                )

            assert "Resume" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_create_application_jd_not_found(self, db_session: AsyncSession):
        """Test application creation with non-existent JD"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        app_data = ApplicationCreate(
            resume_id=resume_id,
            jd_id=jd_id,
        )

        with patch.object(
            ResumeService, "get_resume", new=AsyncMock()
        ) as mock_get_resume, patch.object(
            JDService, "get_jd", new=AsyncMock()
        ) as mock_get_jd:

            from app.models.resume import Resume

            mock_resume = Resume(
                id=resume_id, user_id=user_id, title="Test Resume", content="Content"
            )
            mock_get_resume.return_value = mock_resume
            mock_get_jd.side_effect = NotFoundError(
                resource="Job Description", details={"jd_id": str(jd_id)}
            )

            with pytest.raises(NotFoundError) as exc_info:
                await ApplicationService.create_application(
                    db=db_session, user_id=user_id, app_data=app_data
                )

            assert "Job Description" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_create_application_database_error(self, db_session: AsyncSession):
        """Test application creation with database error"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        app_data = ApplicationCreate(
            resume_id=resume_id,
            jd_id=jd_id,
        )

        with patch.object(
            ResumeService, "get_resume", new=AsyncMock()
        ) as mock_get_resume, patch.object(
            JDService, "get_jd", new=AsyncMock()
        ) as mock_get_jd:

            from app.models.resume import Resume
            from app.models.jd import JD

            mock_resume = Resume(
                id=resume_id, user_id=user_id, title="Test Resume", content="Content"
            )
            mock_jd = JD(
                id=jd_id,
                user_id=user_id,
                title="Test JD",
                company="Test Company",
                content="Content",
            )

            mock_get_resume.return_value = mock_resume
            mock_get_jd.return_value = mock_jd

            # Mock database add to raise exception
            with patch.object(db_session, "add", side_effect=Exception("DB Error")):
                with pytest.raises(DatabaseError):
                    await ApplicationService.create_application(
                        db=db_session, user_id=user_id, app_data=app_data
                    )


@pytest.mark.unit
class TestApplicationServiceGet:
    """Test application retrieval methods"""

    @pytest.mark.asyncio
    async def test_get_applications_empty(self, db_session: AsyncSession):
        """Test getting applications when none exist"""
        user_id = uuid.uuid4()

        result = await ApplicationService.get_applications(
            db=db_session, user_id=user_id
        )

        assert result == []

    @pytest.mark.asyncio
    async def test_get_applications_with_data(self, db_session: AsyncSession):
        """Test getting applications with existing data"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        # Create test applications
        application1 = Application(
            id=uuid.uuid4(), user_id=user_id, resume_id=resume_id, jd_id=jd_id
        )
        application2 = Application(
            id=uuid.uuid4(), user_id=user_id, resume_id=resume_id, jd_id=jd_id
        )

        db_session.add(application1)
        db_session.add(application2)
        await db_session.commit()

        result = await ApplicationService.get_applications(
            db=db_session, user_id=user_id
        )

        assert len(result) == 2
        assert all(app.user_id == user_id for app in result)

    @pytest.mark.asyncio
    async def test_get_applications_paginated(self, db_session: AsyncSession):
        """Test paginated application retrieval"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        # Create 25 test applications
        for _ in range(25):
            application = Application(
                id=uuid.uuid4(), user_id=user_id, resume_id=resume_id, jd_id=jd_id
            )
            db_session.add(application)

        await db_session.commit()

        # Test first page
        result, total = await ApplicationService.get_applications_paginated(
            db=db_session, user_id=user_id, page=1, page_size=10
        )

        assert len(result) == 10
        assert total == 25

        # Test second page
        result, total = await ApplicationService.get_applications_paginated(
            db=db_session, user_id=user_id, page=2, page_size=10
        )

        assert len(result) == 10
        assert total == 25

    @pytest.mark.asyncio
    async def test_get_application_success(self, db_session: AsyncSession):
        """Test getting a specific application"""
        user_id = uuid.uuid4()
        application_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        application = Application(
            id=application_id,
            user_id=user_id,
            resume_id=resume_id,
            jd_id=jd_id,
            status="applied",
        )

        db_session.add(application)
        await db_session.commit()

        result = await ApplicationService.get_application(
            db=db_session, application_id=application_id, user_id=user_id
        )

        assert result.id == application_id
        assert result.status == "applied"

    @pytest.mark.asyncio
    async def test_get_application_not_found(self, db_session: AsyncSession):
        """Test getting a non-existent application"""
        user_id = uuid.uuid4()
        application_id = uuid.uuid4()

        with pytest.raises(HTTPException) as exc_info:
            await ApplicationService.get_application(
                db=db_session, application_id=application_id, user_id=user_id
            )

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "Application not found" in exc_info.value.detail


@pytest.mark.unit
class TestApplicationServiceUpdate:
    """Test application update methods"""

    @pytest.mark.asyncio
    async def test_update_application_status_success(self, db_session: AsyncSession):
        """Test successful application status update"""
        user_id = uuid.uuid4()
        application_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        application = Application(
            id=application_id,
            user_id=user_id,
            resume_id=resume_id,
            jd_id=jd_id,
            status="applied",
        )

        db_session.add(application)
        await db_session.commit()

        with patch(
            "app.services.application_service.notification_service"
        ) as mock_notification:
            status_update = ApplicationStatusUpdate(
                status="interview", notes="Phone screen scheduled"
            )

            result = await ApplicationService.update_application_status(
                db=db_session,
                application_id=application_id,
                user_id=user_id,
                status_update=status_update,
            )

            assert result.status == "interview"
            assert result.notes == "Phone screen scheduled"
            assert len(result.status_history) == 1

    @pytest.mark.asyncio
    async def test_update_application_status_invalid(self, db_session: AsyncSession):
        """Test application update with invalid status"""
        user_id = uuid.uuid4()
        application_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        application = Application(
            id=application_id,
            user_id=user_id,
            resume_id=resume_id,
            jd_id=jd_id,
            status="applied",
        )

        db_session.add(application)
        await db_session.commit()

        status_update = ApplicationStatusUpdate(status="invalid_status")

        with pytest.raises(HTTPException) as exc_info:
            await ApplicationService.update_application_status(
                db=db_session,
                application_id=application_id,
                user_id=user_id,
                status_update=status_update,
            )

        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid status" in exc_info.value.detail


@pytest.mark.unit
class TestApplicationServiceBulkDelete:
    """Test bulk delete operations"""

    @pytest.mark.asyncio
    async def test_bulk_delete_applications_success(self, db_session: AsyncSession):
        """Test successful bulk delete of applications"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        # Create test applications
        app_ids = []
        for _ in range(5):
            app_id = uuid.uuid4()
            app_ids.append(app_id)
            application = Application(
                id=app_id, user_id=user_id, resume_id=resume_id, jd_id=jd_id
            )
            db_session.add(application)

        await db_session.commit()

        result = await ApplicationService.bulk_delete_applications(
            db=db_session, user_id=user_id, application_ids=app_ids
        )

        assert result.success_count == 5
        assert result.failed_count == 0
        assert len(result.errors) == 0

    @pytest.mark.asyncio
    async def test_bulk_delete_applications_empty_list(self, db_session: AsyncSession):
        """Test bulk delete with empty list"""
        user_id = uuid.uuid4()

        with pytest.raises(ValidationError) as exc_info:
            await ApplicationService.bulk_delete_applications(
                db=db_session, user_id=user_id, application_ids=[]
            )

        assert "Application IDs list cannot be empty" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_bulk_delete_applications_too_many(self, db_session: AsyncSession):
        """Test bulk delete with too many IDs"""
        user_id = uuid.uuid4()

        app_ids = [uuid.uuid4() for _ in range(101)]

        with pytest.raises(ValidationError) as exc_info:
            await ApplicationService.bulk_delete_applications(
                db=db_session, user_id=user_id, application_ids=app_ids
            )

        assert "Cannot delete more than 100 applications" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_bulk_delete_applications_partial_failure(
        self, db_session: AsyncSession
    ):
        """Test bulk delete with partial failures"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        # Create 3 real applications
        real_app_ids = []
        for _ in range(3):
            app_id = uuid.uuid4()
            real_app_ids.append(app_id)
            application = Application(
                id=app_id, user_id=user_id, resume_id=resume_id, jd_id=jd_id
            )
            db_session.add(application)

        await db_session.commit()

        # Mix with 2 non-existent IDs
        all_ids = real_app_ids + [uuid.uuid4(), uuid.uuid4()]

        result = await ApplicationService.bulk_delete_applications(
            db=db_session, user_id=user_id, application_ids=all_ids
        )

        assert result.success_count == 3
        assert result.failed_count == 2
        assert len(result.errors) == 2


@pytest.mark.unit
class TestApplicationServiceBulkUpdate:
    """Test bulk update operations"""

    @pytest.mark.asyncio
    async def test_bulk_update_applications_success(self, db_session: AsyncSession):
        """Test successful bulk update of applications"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        # Create test applications
        app_ids = []
        for i in range(3):
            app_id = uuid.uuid4()
            app_ids.append(app_id)
            application = Application(
                id=app_id,
                user_id=user_id,
                resume_id=resume_id,
                jd_id=jd_id,
                status="applied",
            )
            db_session.add(application)

        await db_session.commit()

        updates = [
            {"id": str(app_ids[0]), "status": "interview"},
            {"id": str(app_ids[1]), "status": "offer"},
            {"id": str(app_ids[2]), "notes": "Updated notes"},
        ]

        result = await ApplicationService.bulk_update_applications(
            db=db_session, user_id=user_id, updates=updates
        )

        assert result["success_count"] == 3
        assert result["failed_count"] == 0
        assert len(result["errors"]) == 0

    @pytest.mark.asyncio
    async def test_bulk_update_applications_invalid_status(
        self, db_session: AsyncSession
    ):
        """Test bulk update with invalid status"""
        user_id = uuid.uuid4()

        updates = [{"id": str(uuid.uuid4()), "status": "invalid_status"}]

        with pytest.raises(ValidationError) as exc_info:
            await ApplicationService.bulk_update_applications(
                db=db_session, user_id=user_id, updates=updates
            )

        assert "Invalid status" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_bulk_update_applications_invalid_match_score(
        self, db_session: AsyncSession
    ):
        """Test bulk update with invalid match score"""
        user_id = uuid.uuid4()

        updates = [{"id": str(uuid.uuid4()), "match_score": 150}]

        with pytest.raises(ValidationError) as exc_info:
            await ApplicationService.bulk_update_applications(
                db=db_session, user_id=user_id, updates=updates
            )

        assert "Invalid match_score" in str(exc_info.value)


@pytest.mark.unit
class TestApplicationServiceBulkTag:
    """Test bulk tagging operations"""

    @pytest.mark.asyncio
    async def test_bulk_tag_applications_add(self, db_session: AsyncSession):
        """Test bulk adding tags to applications"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        # Create test applications
        app_ids = []
        for _ in range(3):
            app_id = uuid.uuid4()
            app_ids.append(app_id)
            application = Application(
                id=app_id,
                user_id=user_id,
                resume_id=resume_id,
                jd_id=jd_id,
                tags=["existing-tag"],
            )
            db_session.add(application)

        await db_session.commit()

        request = BulkTagRequest(
            ids=app_ids, tags=["new-tag1", "new-tag2"], operation="add"
        )

        result = await ApplicationService.bulk_tag_applications(
            db=db_session, user_id=user_id, request=request
        )

        assert result.success_count == 3
        assert result.failed_count == 0

    @pytest.mark.asyncio
    async def test_bulk_tag_applications_remove(self, db_session: AsyncSession):
        """Test bulk removing tags from applications"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        # Create test applications
        app_ids = []
        for _ in range(3):
            app_id = uuid.uuid4()
            app_ids.append(app_id)
            application = Application(
                id=app_id,
                user_id=user_id,
                resume_id=resume_id,
                jd_id=jd_id,
                tags=["tag1", "tag2", "tag3"],
            )
            db_session.add(application)

        await db_session.commit()

        request = BulkTagRequest(ids=app_ids, tags=["tag2"], operation="remove")

        result = await ApplicationService.bulk_tag_applications(
            db=db_session, user_id=user_id, request=request
        )

        assert result.success_count == 3
        assert result.failed_count == 0

    @pytest.mark.asyncio
    async def test_bulk_tag_applications_replace(self, db_session: AsyncSession):
        """Test bulk replacing tags on applications"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        # Create test applications
        app_ids = []
        for _ in range(3):
            app_id = uuid.uuid4()
            app_ids.append(app_id)
            application = Application(
                id=app_id,
                user_id=user_id,
                resume_id=resume_id,
                jd_id=jd_id,
                tags=["old-tag1", "old-tag2"],
            )
            db_session.add(application)

        await db_session.commit()

        request = BulkTagRequest(
            ids=app_ids, tags=["new-tag1", "new-tag2"], operation="replace"
        )

        result = await ApplicationService.bulk_tag_applications(
            db=db_session, user_id=user_id, request=request
        )

        assert result.success_count == 3
        assert result.failed_count == 0

    @pytest.mark.asyncio
    async def test_bulk_tag_applications_invalid_operation(
        self, db_session: AsyncSession
    ):
        """Test bulk tagging with invalid operation"""
        user_id = uuid.uuid4()

        request = BulkTagRequest(
            ids=[uuid.uuid4()], tags=["tag1"], operation="invalid_operation"
        )

        with pytest.raises(ValidationError) as exc_info:
            await ApplicationService.bulk_tag_applications(
                db=db_session, user_id=user_id, request=request
            )

        assert "Invalid operation type" in str(exc_info.value)


@pytest.mark.unit
class TestApplicationServiceMatchScore:
    """Test match score calculation"""

    @pytest.mark.asyncio
    async def test_get_match_score_success(self, db_session: AsyncSession):
        """Test successful match score retrieval"""
        user_id = uuid.uuid4()
        application_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        # Create application with parsed data
        from app.models.resume import Resume
        from app.models.jd import JD

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="Test Resume",
            content="Resume content",
            parsed_data='{"skills": ["Python", "FastAPI"]}',
        )

        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Test JD",
            company="Test Company",
            content="JD content",
            parsed_data='{"requirements": ["Python", "FastAPI"]}',
        )

        application = Application(
            id=application_id,
            user_id=user_id,
            resume_id=resume_id,
            jd_id=jd_id,
        )

        application.resume = resume
        application.jd = jd

        db_session.add(resume)
        db_session.add(jd)
        db_session.add(application)
        await db_session.commit()

        with patch("app.services.application_service.mcp_client") as mock_mcp:
            mock_mcp.match_resume_to_jd.return_value = {
                "match_score": 0.85,
                "strengths": ["Strong Python skills"],
                "gaps": [],
            }

            result = await ApplicationService.get_match_score(
                db=db_session, application_id=application_id, user_id=user_id
            )

            assert result["match_score"] == 0.85
            assert "strengths" in result

    @pytest.mark.asyncio
    async def test_get_match_score_not_parsed(self, db_session: AsyncSession):
        """Test match score retrieval with unparsed resume/JD"""
        user_id = uuid.uuid4()
        application_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        from app.models.resume import Resume
        from app.models.jd import JD

        resume = Resume(
            id=resume_id, user_id=user_id, title="Test Resume", content="Resume content"
        )

        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Test JD",
            company="Test Company",
            content="JD content",
        )

        application = Application(
            id=application_id,
            user_id=user_id,
            resume_id=resume_id,
            jd_id=jd_id,
        )

        application.resume = resume
        application.jd = jd

        db_session.add(resume)
        db_session.add(jd)
        db_session.add(application)
        await db_session.commit()

        with pytest.raises(HTTPException) as exc_info:
            await ApplicationService.get_match_score(
                db=db_session, application_id=application_id, user_id=user_id
            )

        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "not parsed yet" in exc_info.value.detail


@pytest.mark.unit
class TestApplicationServiceOptimize:
    """Test resume optimization"""

    @pytest.mark.asyncio
    async def test_optimize_resume_sync(self, db_session: AsyncSession):
        """Test synchronous resume optimization"""
        user_id = uuid.uuid4()
        application_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        from app.models.resume import Resume
        from app.models.jd import JD

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="Test Resume",
            content="Resume content",
            parsed_data='{"skills": ["Python"]}',
        )

        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Test JD",
            company="Test Company",
            content="JD content",
            parsed_data='{"requirements": ["Python", "FastAPI"]}',
        )

        application = Application(
            id=application_id,
            user_id=user_id,
            resume_id=resume_id,
            jd_id=jd_id,
            status="applied",
        )

        application.resume = resume
        application.jd = jd

        db_session.add(resume)
        db_session.add(jd)
        db_session.add(application)
        await db_session.commit()

        with patch("app.services.application_service.mcp_client") as mock_mcp, patch(
            "app.services.application_service.notification_service"
        ) as mock_notification:
            mock_mcp.optimize_resume.return_value = {
                "optimized_content": "Optimized resume content",
                "improvements": ["Added FastAPI experience"],
            }

            result = await ApplicationService.optimize_resume(
                db=db_session,
                application_id=application_id,
                user_id=user_id,
                async_processing=False,
            )

            assert "optimized_content" in result
            assert application.status == "optimized"

    @pytest.mark.asyncio
    async def test_optimize_resume_async(self, db_session: AsyncSession):
        """Test asynchronous resume optimization"""
        user_id = uuid.uuid4()
        application_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        from app.models.resume import Resume
        from app.models.jd import JD

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="Test Resume",
            content="Resume content",
            parsed_data='{"skills": ["Python"]}',
        )

        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Test JD",
            company="Test Company",
            content="JD content",
            parsed_data='{"requirements": ["Python", "FastAPI"]}',
        )

        application = Application(
            id=application_id,
            user_id=user_id,
            resume_id=resume_id,
            jd_id=jd_id,
        )

        application.resume = resume
        application.jd = jd

        db_session.add(resume)
        db_session.add(jd)
        db_session.add(application)
        await db_session.commit()

        with patch("app.services.application_service.TaskService") as mock_task_service:
            mock_task_service.submit_task.return_value = MagicMock(
                id=uuid.uuid4(), status="pending"
            )

            result = await ApplicationService.optimize_resume(
                db=db_session,
                application_id=application_id,
                user_id=user_id,
                async_processing=True,
            )

            assert "task_id" in result
            assert "message" in result
