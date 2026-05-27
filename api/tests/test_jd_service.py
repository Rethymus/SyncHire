"""
Comprehensive unit tests for JDService

These tests follow 2026 best practices:
- Async testing with pytest-asyncio
- Comprehensive mocking of external dependencies
- Edge case and error case coverage
- Transaction rollback testing
- Database session isolation
"""

import pytest
import uuid
import json
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.services.jd_service import JDService
from app.models.jd import JD
from app.schemas.jd import JDCreate, JDUpdate, BulkDeleteResponse
from app.core.errors import ValidationError, DatabaseError
from app.services.mcp_client import MCPError


@pytest.mark.unit
class TestJDServiceCreate:
    """Test JD creation with comprehensive error handling"""

    @pytest.mark.asyncio
    async def test_create_jd_success(self, db_session: AsyncSession):
        """Test successful JD creation"""
        user_id = uuid.uuid4()

        jd_data = JDCreate(
            title="Senior Software Engineer",
            company="Tech Corp",
            content="We are looking for a senior software engineer...",
        )

        with patch.object(
            JDService, "parse_jd", new=AsyncMock()
        ) as mock_parse, patch.object(
            JDService, "generate_embedding", new=AsyncMock()
        ) as mock_embedding:

            mock_parse.return_value = {
                "requirements": ["Python", "FastAPI", "PostgreSQL"],
                "nice_to_have": ["Docker", "Kubernetes"],
            }
            mock_embedding.return_value = [0.1] * 1536

            result = await JDService.create_jd(
                db=db_session, user_id=user_id, jd_data=jd_data
            )

            assert result.title == "Senior Software Engineer"
            assert result.company == "Tech Corp"
            assert mock_parse.called

    @pytest.mark.asyncio
    async def test_create_jd_async_processing(self, db_session: AsyncSession):
        """Test JD creation with async processing"""
        user_id = uuid.uuid4()

        jd_data = JDCreate(
            title="Senior Software Engineer",
            company="Tech Corp",
            content="We are looking for a senior software engineer...",
        )

        with patch("app.services.jd_service.TaskService") as mock_task_service:
            mock_task_service.submit_task.return_value = MagicMock(
                id=uuid.uuid4(), status="pending"
            )

            result = await JDService.create_jd(
                db=db_session, user_id=user_id, jd_data=jd_data, async_processing=True
            )

            assert "jd" in result
            assert "task_id" in result
            assert "message" in result
            mock_task_service.submit_task.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_jd_with_embedding_failure(self, db_session: AsyncSession):
        """Test JD creation when embedding generation fails"""
        user_id = uuid.uuid4()

        jd_data = JDCreate(
            title="Senior Software Engineer",
            company="Tech Corp",
            content="We are looking for a senior software engineer...",
        )

        with patch.object(
            JDService, "parse_jd", new=AsyncMock()
        ) as mock_parse, patch.object(
            JDService, "generate_embedding", new=AsyncMock()
        ) as mock_embedding:

            mock_parse.return_value = {"requirements": ["Python"]}
            mock_embedding.side_effect = Exception("Embedding service down")

            # Should still create JD even if embedding fails
            result = await JDService.create_jd(
                db=db_session, user_id=user_id, jd_data=jd_data
            )

            assert result.title == "Senior Software Engineer"
            assert result.embedding is None


@pytest.mark.unit
class TestJDServiceParse:
    """Test JD parsing methods"""

    @pytest.mark.asyncio
    async def test_parse_jd_with_mcp(self):
        """Test JD parsing using MCP client"""
        content = "Job Title: Senior Developer\nRequirements: Python, FastAPI"

        with patch("app.services.jd_service.mcp_client") as mock_mcp:
            mock_mcp.parse_jd.return_value = {
                "job_title": "Senior Developer",
                "requirements": ["Python", "FastAPI"],
            }

            result = await JDService.parse_jd(content)

            assert result["job_title"] == "Senior Developer"
            assert "Python" in result["requirements"]
            mock_mcp.parse_jd.assert_called_once_with(content)

    @pytest.mark.asyncio
    async def test_parse_jd_mcp_fallback(self):
        """Test JD parsing fallback to AI service when MCP fails"""
        content = "Job Title: Senior Developer\nRequirements: Python, FastAPI"

        with patch("app.services.jd_service.mcp_client") as mock_mcp, patch.object(
            JDService, "AIService"
        ) as mock_ai_service:

            mock_mcp.parse_jd.side_effect = MCPError("MCP service unavailable")
            mock_ai_service.parse_jd.return_value = {
                "job_title": "Senior Developer",
                "requirements": ["Python", "FastAPI"],
            }

            result = await JDService.parse_jd(content)

            assert result["job_title"] == "Senior Developer"
            mock_ai_service.parse_jd.assert_called_once_with(content)


@pytest.mark.unit
class TestJDServiceGet:
    """Test JD retrieval methods"""

    @pytest.mark.asyncio
    async def test_get_jds_empty(self, db_session: AsyncSession):
        """Test getting JDs when none exist"""
        user_id = uuid.uuid4()

        result = await JDService.get_jds(db=db_session, user_id=user_id)

        assert result == []

    @pytest.mark.asyncio
    async def test_get_jds_with_data(self, db_session: AsyncSession):
        """Test getting JDs with existing data"""
        user_id = uuid.uuid4()

        # Create test JDs
        jd1 = JD(
            id=uuid.uuid4(),
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="JD content 1",
        )
        jd2 = JD(
            id=uuid.uuid4(),
            user_id=user_id,
            title="Senior Developer",
            company="Another Corp",
            content="JD content 2",
        )

        db_session.add(jd1)
        db_session.add(jd2)
        await db_session.commit()

        result = await JDService.get_jds(db=db_session, user_id=user_id)

        assert len(result) == 2
        assert all(jd.user_id == user_id for jd in result)

    @pytest.mark.asyncio
    async def test_get_jds_paginated(self, db_session: AsyncSession):
        """Test paginated JD retrieval"""
        user_id = uuid.uuid4()

        # Create 25 test JDs
        for i in range(25):
            jd = JD(
                id=uuid.uuid4(),
                user_id=user_id,
                title=f"Job {i}",
                company=f"Company {i}",
                content=f"Content {i}",
            )
            db_session.add(jd)

        await db_session.commit()

        # Test first page
        result, total = await JDService.get_jds_paginated(
            db=db_session, user_id=user_id, page=1, page_size=10
        )

        assert len(result) == 10
        assert total == 25

        # Test second page
        result, total = await JDService.get_jds_paginated(
            db=db_session, user_id=user_id, page=2, page_size=10
        )

        assert len(result) == 10
        assert total == 25

    @pytest.mark.asyncio
    async def test_get_jd_success(self, db_session: AsyncSession):
        """Test getting a specific JD"""
        user_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="JD content",
        )

        db_session.add(jd)
        await db_session.commit()

        result = await JDService.get_jd(db=db_session, jd_id=jd_id, user_id=user_id)

        assert result.id == jd_id
        assert result.title == "Software Engineer"

    @pytest.mark.asyncio
    async def test_get_jd_not_found(self, db_session: AsyncSession):
        """Test getting a non-existent JD"""
        user_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        with pytest.raises(HTTPException) as exc_info:
            await JDService.get_jd(db=db_session, jd_id=jd_id, user_id=user_id)

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "JD not found" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_jd_unauthorized(self, db_session: AsyncSession):
        """Test getting a JD that belongs to another user"""
        user_id = uuid.uuid4()
        other_user_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        jd = JD(
            id=jd_id,
            user_id=other_user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="JD content",
        )

        db_session.add(jd)
        await db_session.commit()

        with pytest.raises(HTTPException) as exc_info:
            await JDService.get_jd(db=db_session, jd_id=jd_id, user_id=user_id)

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.unit
class TestJDServiceUpdate:
    """Test JD update methods"""

    @pytest.mark.asyncio
    async def test_update_jd_title(self, db_session: AsyncSession):
        """Test updating JD title"""
        user_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="JD content",
        )

        db_session.add(jd)
        await db_session.commit()

        update_data = JDUpdate(title="Senior Software Engineer")

        with patch.object(
            JDService, "parse_jd", new=AsyncMock()
        ) as mock_parse, patch.object(
            JDService, "generate_embedding", new=AsyncMock()
        ) as mock_embedding:

            mock_parse.return_value = {"requirements": ["Python"]}
            mock_embedding.return_value = [0.1] * 1536

            result = await JDService.update_jd(
                db=db_session, jd_id=jd_id, user_id=user_id, jd_data=update_data
            )

            assert result.title == "Senior Software Engineer"

    @pytest.mark.asyncio
    async def test_update_jd_content_with_reparsing(self, db_session: AsyncSession):
        """Test updating JD content with re-parsing"""
        user_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="Old content",
        )

        db_session.add(jd)
        await db_session.commit()

        update_data = JDUpdate(content="New updated content with more requirements")

        with patch.object(
            JDService, "parse_jd", new=AsyncMock()
        ) as mock_parse, patch.object(
            JDService, "generate_embedding", new=AsyncMock()
        ) as mock_embedding:

            mock_parse.return_value = {
                "requirements": ["Python", "FastAPI", "PostgreSQL"]
            }
            mock_embedding.return_value = [0.2] * 1536

            result = await JDService.update_jd(
                db=db_session, jd_id=jd_id, user_id=user_id, jd_data=update_data
            )

            assert result.content == "New updated content with more requirements"
            assert result.parsed_data is not None
            assert result.embedding is not None
            mock_parse.assert_called_once()


@pytest.mark.unit
class TestJDServiceDelete:
    """Test JD deletion methods"""

    @pytest.mark.asyncio
    async def test_delete_jd_success(self, db_session: AsyncSession):
        """Test successful JD deletion"""
        user_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="JD content",
        )

        db_session.add(jd)
        await db_session.commit()

        await JDService.delete_jd(db=db_session, jd_id=jd_id, user_id=user_id)

        # Verify deletion
        result = await db_session.execute(select(JD).where(JD.id == jd_id))
        assert result.scalar_one_or_none() is None

    @pytest.mark.asyncio
    async def test_delete_jd_not_found(self, db_session: AsyncSession):
        """Test deleting a non-existent JD"""
        user_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        with pytest.raises(HTTPException) as exc_info:
            await JDService.delete_jd(db=db_session, jd_id=jd_id, user_id=user_id)

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.unit
class TestJDServiceBulkDelete:
    """Test bulk delete operations"""

    @pytest.mark.asyncio
    async def test_bulk_delete_jds_success(self, db_session: AsyncSession):
        """Test successful bulk delete of JDs"""
        user_id = uuid.uuid4()

        # Create test JDs
        jd_ids = []
        for _ in range(5):
            jd_id = uuid.uuid4()
            jd_ids.append(jd_id)
            jd = JD(
                id=jd_id,
                user_id=user_id,
                title=f"Job {jd_id}",
                company="Tech Corp",
                content="Content",
            )
            db_session.add(jd)

        await db_session.commit()

        result = await JDService.bulk_delete_jds(
            db=db_session, user_id=user_id, jd_ids=jd_ids
        )

        assert result.success_count == 5
        assert result.failed_count == 0
        assert len(result.errors) == 0

    @pytest.mark.asyncio
    async def test_bulk_delete_jds_empty_list(self, db_session: AsyncSession):
        """Test bulk delete with empty list"""
        user_id = uuid.uuid4()

        with pytest.raises(ValueError) as exc_info:
            await JDService.bulk_delete_jds(db=db_session, user_id=user_id, jd_ids=[])

        assert "JD IDs list cannot be empty" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_bulk_delete_jds_too_many(self, db_session: AsyncSession):
        """Test bulk delete with too many IDs"""
        user_id = uuid.uuid4()

        jd_ids = [uuid.uuid4() for _ in range(101)]

        with pytest.raises(ValueError) as exc_info:
            await JDService.bulk_delete_jds(
                db=db_session, user_id=user_id, jd_ids=jd_ids
            )

        assert "Cannot delete more than 100 JDs" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_bulk_delete_jds_invalid_uuid(self, db_session: AsyncSession):
        """Test bulk delete with invalid UUID format"""
        user_id = uuid.uuid4()

        jd_ids = ["invalid-uuid", str(uuid.uuid4())]

        with pytest.raises(ValueError) as exc_info:
            await JDService.bulk_delete_jds(
                db=db_session, user_id=user_id, jd_ids=jd_ids
            )

        assert "Invalid JD ID format" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_bulk_delete_jds_partial_failure(self, db_session: AsyncSession):
        """Test bulk delete with partial failures"""
        user_id = uuid.uuid4()

        # Create 3 real JDs
        real_jd_ids = []
        for _ in range(3):
            jd_id = uuid.uuid4()
            real_jd_ids.append(jd_id)
            jd = JD(
                id=jd_id,
                user_id=user_id,
                title=f"Job {jd_id}",
                company="Tech Corp",
                content="Content",
            )
            db_session.add(jd)

        await db_session.commit()

        # Mix with 2 non-existent IDs
        all_ids = real_jd_ids + [uuid.uuid4(), uuid.uuid4()]

        result = await JDService.bulk_delete_jds(
            db=db_session, user_id=user_id, jd_ids=all_ids
        )

        assert result.success_count == 3
        assert result.failed_count == 2
        assert len(result.errors) == 2

    @pytest.mark.asyncio
    async def test_bulk_delete_jds_ownership_check(self, db_session: AsyncSession):
        """Test bulk delete respects user ownership"""
        user_id = uuid.uuid4()
        other_user_id = uuid.uuid4()

        # Create JDs for both users
        user_jd_id = uuid.uuid4()
        user_jd = JD(
            id=user_jd_id,
            user_id=user_id,
            title="User's JD",
            company="Tech Corp",
            content="Content",
        )

        other_jd_id = uuid.uuid4()
        other_jd = JD(
            id=other_jd_id,
            user_id=other_user_id,
            title="Other User's JD",
            company="Other Corp",
            content="Content",
        )

        db_session.add(user_jd)
        db_session.add(other_jd)
        await db_session.commit()

        # Try to delete both JDs
        result = await JDService.bulk_delete_jds(
            db=db_session, user_id=user_id, jd_ids=[user_jd_id, other_jd_id]
        )

        # Only user's JD should be deleted
        assert result.success_count == 1
        assert result.failed_count == 1
        assert result.errors[0]["id"] == str(other_jd_id)


@pytest.mark.unit
class TestJDServiceEmbedding:
    """Test embedding generation"""

    @pytest.mark.asyncio
    async def test_generate_embedding_success(self):
        """Test successful embedding generation"""
        content = "Software engineer with Python and FastAPI experience"

        with patch("app.services.jd_service.AIService") as mock_ai_service:
            mock_ai_service.generate_embedding.return_value = [0.1] * 1536

            result = await JDService.generate_embedding(content)

            assert len(result) == 1536
            mock_ai_service.generate_embedding.assert_called_once_with(content)

    @pytest.mark.asyncio
    async def test_generate_embedding_failure(self):
        """Test embedding generation failure"""
        content = "Test content"

        with patch("app.services.jd_service.AIService") as mock_ai_service:
            mock_ai_service.generate_embedding.side_effect = Exception("Service down")

            result = await JDService.generate_embedding(content)

            # Should return None on failure
            assert result is None


@pytest.mark.unit
class TestJDServiceEdgeCases:
    """Test edge cases and error scenarios"""

    @pytest.mark.asyncio
    async def test_create_jd_with_empty_content(self, db_session: AsyncSession):
        """Test creating JD with empty content"""
        user_id = uuid.uuid4()

        jd_data = JDCreate(title="Test Job", company="Test Corp", content="")

        with patch.object(
            JDService, "parse_jd", new=AsyncMock()
        ) as mock_parse, patch.object(
            JDService, "generate_embedding", new=AsyncMock()
        ) as mock_embedding:

            mock_parse.return_value = {}
            mock_embedding.return_value = None

            result = await JDService.create_jd(
                db=db_session, user_id=user_id, jd_data=jd_data
            )

            # Should still create JD even with empty content
            assert result.title == "Test Job"

    @pytest.mark.asyncio
    async def test_update_jd_with_no_changes(self, db_session: AsyncSession):
        """Test updating JD with no actual changes"""
        user_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="JD content",
        )

        db_session.add(jd)
        await db_session.commit()

        update_data = JDUpdate()  # No changes

        result = await JDService.update_jd(
            db=db_session, jd_id=jd_id, user_id=user_id, jd_data=update_data
        )

        assert result.title == "Software Engineer"
        assert result.company == "Tech Corp"

    @pytest.mark.asyncio
    async def test_get_jds_pagination_edge_cases(self, db_session: AsyncSession):
        """Test pagination edge cases"""
        user_id = uuid.uuid4()

        # Create exactly 20 JDs
        for i in range(20):
            jd = JD(
                id=uuid.uuid4(),
                user_id=user_id,
                title=f"Job {i}",
                company="Tech Corp",
                content=f"Content {i}",
            )
            db_session.add(jd)

        await db_session.commit()

        # Test page size equals total
        result, total = await JDService.get_jds_paginated(
            db=db_session, user_id=user_id, page=1, page_size=20
        )

        assert len(result) == 20
        assert total == 20

        # Test page beyond available data
        result, total = await JDService.get_jds_paginated(
            db=db_session, user_id=user_id, page=5, page_size=10
        )

        assert len(result) == 0
        assert total == 20

    @pytest.mark.asyncio
    async def test_bulk_delete_with_duplicates(self, db_session: AsyncSession):
        """Test bulk delete with duplicate IDs"""
        user_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Test Job",
            company="Tech Corp",
            content="Content",
        )

        db_session.add(jd)
        await db_session.commit()

        # Include duplicate ID
        result = await JDService.bulk_delete_jds(
            db=db_session, user_id=user_id, jd_ids=[jd_id, jd_id]
        )

        # Should handle duplicates gracefully
        assert result.success_count >= 1
