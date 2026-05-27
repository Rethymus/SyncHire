"""
Comprehensive unit tests for ResumeService

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
import tempfile
import os
from unittest.mock import AsyncMock, MagicMock, patch, mock_open
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile

from app.services.resume_service import ResumeService
from app.models.resume import Resume
from app.schemas.resume import ResumeUpdate, BulkDeleteResponse
from app.core.errors import (
    ValidationError,
    NotFoundError,
    FileUploadError,
    FileSizeError,
    FileTypeError,
    DatabaseError,
)
from app.services.mcp_client import MCPError


@pytest.mark.unit
class TestResumeServiceCreate:
    """Test resume creation with comprehensive error handling"""

    @pytest.mark.asyncio
    async def test_create_resume_success(self, db_session: AsyncSession):
        """Test successful resume creation"""
        user_id = uuid.uuid4()

        # Create mock file
        file_content = b"Test PDF content"
        file = MagicMock(spec=UploadFile)
        file.filename = "resume.pdf"
        file.read = AsyncMock(return_value=file_content)

        with patch.object(
            ResumeService, "StorageService"
        ) as mock_storage, patch.object(
            ResumeService, "FileParserService"
        ) as mock_parser, patch.object(
            ResumeService, "mcp_client"
        ) as mock_mcp, patch.object(
            ResumeService, "AIService"
        ) as mock_ai:

            mock_storage.upload_file.return_value = "s3://test/resume.pdf"
            mock_parser.parse_file.return_value = "Extracted resume text"
            mock_mcp.parse_resume.return_value = {
                "skills": ["Python", "FastAPI"],
                "experience": "5 years",
            }
            mock_ai.generate_embedding.return_value = [0.1] * 1536

            result = await ResumeService.create_resume(
                db=db_session, user_id=user_id, file=file, title="Software Engineer"
            )

            assert result.title == "Software Engineer"
            assert result.file_path == "s3://test/resume.pdf"
            assert result.content == "Extracted resume text"
            mock_storage.upload_file.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_resume_empty_title(self, db_session: AsyncSession):
        """Test resume creation with empty title"""
        user_id = uuid.uuid4()

        file = MagicMock(spec=UploadFile)
        file.filename = "resume.pdf"
        file.read = AsyncMock(return_value=b"content")

        with pytest.raises(ValidationError) as exc_info:
            await ResumeService.create_resume(
                db=db_session, user_id=user_id, file=file, title=""
            )

        assert "Resume title is required" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_create_resume_empty_file(self, db_session: AsyncSession):
        """Test resume creation with empty file"""
        user_id = uuid.uuid4()

        file = MagicMock(spec=UploadFile)
        file.filename = "resume.pdf"
        file.read = AsyncMock(return_value=b"")

        with pytest.raises(ValidationError) as exc_info:
            await ResumeService.create_resume(
                db=db_session, user_id=user_id, file=file, title="Software Engineer"
            )

        assert "Uploaded file is empty" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_create_resume_file_too_large(self, db_session: AsyncSession):
        """Test resume creation with file exceeding size limit"""
        user_id = uuid.uuid4()

        file = MagicMock(spec=UploadFile)
        file.filename = "resume.pdf"
        # Create content larger than MAX_UPLOAD_SIZE
        file.read = AsyncMock(return_value=b"0" * (11 * 1024 * 1024))  # 11MB

        with pytest.raises(FileSizeError) as exc_info:
            await ResumeService.create_resume(
                db=db_session, user_id=user_id, file=file, title="Software Engineer"
            )

        assert exc_info.value.max_size == ResumeService.MAX_UPLOAD_SIZE

    @pytest.mark.asyncio
    async def test_create_resume_invalid_file_type(self, db_session: AsyncSession):
        """Test resume creation with invalid file type"""
        user_id = uuid.uuid4()

        file = MagicMock(spec=UploadFile)
        file.filename = "resume.exe"
        file.read = AsyncMock(return_value=b"content")

        with pytest.raises(FileTypeError) as exc_info:
            await ResumeService.create_resume(
                db=db_session, user_id=user_id, file=file, title="Software Engineer"
            )

        assert ".exe" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_create_resume_storage_failure(self, db_session: AsyncSession):
        """Test resume creation when storage upload fails"""
        user_id = uuid.uuid4()

        file = MagicMock(spec=UploadFile)
        file.filename = "resume.pdf"
        file.read = AsyncMock(return_value=b"content")

        with patch.object(
            ResumeService, "StorageService"
        ) as mock_storage:
            mock_storage.upload_file.side_effect = Exception("Storage service down")

            with pytest.raises(FileUploadError):
                await ResumeService.create_resume(
                    db=db_session, user_id=user_id, file=file, title="Software Engineer"
                )

    @pytest.mark.asyncio
    async def test_create_resume_parsing_failure(self, db_session: AsyncSession):
        """Test resume creation when parsing fails"""
        user_id = uuid.uuid4()

        file = MagicMock(spec=UploadFile)
        file.filename = "resume.pdf"
        file.read = AsyncMock(return_value=b"content")

        with patch.object(
            ResumeService, "StorageService"
        ) as mock_storage, patch.object(
            ResumeService, "FileParserService"
        ) as mock_parser:

            mock_storage.upload_file.return_value = "s3://test/resume.pdf"
            mock_parser.parse_file.side_effect = Exception("Parser failed")

            # Should still create resume even if parsing fails
            result = await ResumeService.create_resume(
                db=db_session, user_id=user_id, file=file, title="Software Engineer"
            )

            assert result.title == "Software Engineer"
            assert result.file_path == "s3://test/resume.pdf"

    @pytest.mark.asyncio
    async def test_create_resume_mcp_failure(self, db_session: AsyncSession):
        """Test resume creation when MCP parsing fails"""
        user_id = uuid.uuid4()

        file = MagicMock(spec=UploadFile)
        file.filename = "resume.pdf"
        file.read = AsyncMock(return_value=b"content")

        with patch.object(
            ResumeService, "StorageService"
        ) as mock_storage, patch.object(
            ResumeService, "FileParserService"
        ) as mock_parser, patch.object(
            ResumeService, "mcp_client"
        ) as mock_mcp, patch.object(
            ResumeService, "AIService"
        ) as mock_ai, patch(
            "tempfile.NamedTemporaryFile"
        ) as mock_temp:

            mock_storage.upload_file.return_value = "s3://test/resume.pdf"
            mock_parser.parse_file.return_value = "Extracted text"
            mock_mcp.parse_resume.side_effect = MCPError("MCP service down")
            mock_ai.generate_embedding.return_value = [0.1] * 1536

            # Mock temporary file
            mock_temp_file = MagicMock()
            mock_temp_file.name = "/tmp/test.pdf"
            mock_temp.return_value.__enter__.return_value = mock_temp_file
            mock_temp.return_value.__exit__.return_value = False

            # Should still create resume even if MCP fails
            result = await ResumeService.create_resume(
                db=db_session, user_id=user_id, file=file, title="Software Engineer"
            )

            assert result.title == "Software Engineer"
            assert result.content == "Extracted text"


@pytest.mark.unit
class TestResumeServiceGet:
    """Test resume retrieval methods"""

    @pytest.mark.asyncio
    async def test_get_resumes_empty(self, db_session: AsyncSession):
        """Test getting resumes when none exist"""
        user_id = uuid.uuid4()

        result = await ResumeService.get_resumes(db=db_session, user_id=user_id)

        assert result == []

    @pytest.mark.asyncio
    async def test_get_resumes_with_data(self, db_session: AsyncSession):
        """Test getting resumes with existing data"""
        user_id = uuid.uuid4()

        # Create test resumes
        resume1 = Resume(
            id=uuid.uuid4(),
            user_id=user_id,
            title="Software Engineer Resume",
            content="Resume content 1",
            file_path="path1.pdf",
        )
        resume2 = Resume(
            id=uuid.uuid4(),
            user_id=user_id,
            title="Senior Developer Resume",
            content="Resume content 2",
            file_path="path2.pdf",
        )

        db_session.add(resume1)
        db_session.add(resume2)
        await db_session.commit()

        result = await ResumeService.get_resumes(db=db_session, user_id=user_id)

        assert len(result) == 2
        assert all(resume.user_id == user_id for resume in result)

    @pytest.mark.asyncio
    async def test_get_resumes_paginated(self, db_session: AsyncSession):
        """Test paginated resume retrieval"""
        user_id = uuid.uuid4()

        # Create 25 test resumes
        for i in range(25):
            resume = Resume(
                id=uuid.uuid4(),
                user_id=user_id,
                title=f"Resume {i}",
                content=f"Content {i}",
                file_path=f"path{i}.pdf",
            )
            db_session.add(resume)

        await db_session.commit()

        # Test first page
        result, total = await ResumeService.get_resumes_paginated(
            db=db_session, user_id=user_id, page=1, page_size=10
        )

        assert len(result) == 10
        assert total == 25

        # Test second page
        result, total = await ResumeService.get_resumes_paginated(
            db=db_session, user_id=user_id, page=2, page_size=10
        )

        assert len(result) == 10
        assert total == 25

    @pytest.mark.asyncio
    async def test_get_resume_success(self, db_session: AsyncSession):
        """Test getting a specific resume"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="Software Engineer Resume",
            content="Resume content",
            file_path="path.pdf",
        )

        db_session.add(resume)
        await db_session.commit()

        result = await ResumeService.get_resume(
            db=db_session, resume_id=resume_id, user_id=user_id
        )

        assert result.id == resume_id
        assert result.title == "Software Engineer Resume"

    @pytest.mark.asyncio
    async def test_get_resume_not_found(self, db_session: AsyncSession):
        """Test getting a non-existent resume"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()

        with pytest.raises(NotFoundError) as exc_info:
            await ResumeService.get_resume(
                db=db_session, resume_id=resume_id, user_id=user_id
            )

        assert "Resume" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_get_resume_unauthorized(self, db_session: AsyncSession):
        """Test getting a resume that belongs to another user"""
        user_id = uuid.uuid4()
        other_user_id = uuid.uuid4()
        resume_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=other_user_id,
            title="Other User's Resume",
            content="Content",
            file_path="path.pdf",
        )

        db_session.add(resume)
        await db_session.commit()

        with pytest.raises(NotFoundError) as exc_info:
            await ResumeService.get_resume(
                db=db_session, resume_id=resume_id, user_id=user_id
            )

        assert "Resume" in str(exc_info.value)


@pytest.mark.unit
class TestResumeServiceUpdate:
    """Test resume update methods"""

    @pytest.mark.asyncio
    async def test_update_resume_title(self, db_session: AsyncSession):
        """Test updating resume title"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="Software Engineer",
            content="Content",
            file_path="path.pdf",
        )

        db_session.add(resume)
        await db_session.commit()

        update_data = ResumeUpdate(title="Senior Software Engineer")

        result = await ResumeService.update_resume(
            db=db_session, resume_id=resume_id, user_id=user_id, update_data=update_data
        )

        assert result.title == "Senior Software Engineer"

    @pytest.mark.asyncio
    async def test_update_resume_empty_title(self, db_session: AsyncSession):
        """Test updating resume with empty title"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="Software Engineer",
            content="Content",
            file_path="path.pdf",
        )

        db_session.add(resume)
        await db_session.commit()

        update_data = ResumeUpdate(title="   ")

        with pytest.raises(ValidationError) as exc_info:
            await ResumeService.update_resume(
                db=db_session, resume_id=resume_id, user_id=user_id, update_data=update_data
            )

        assert "cannot be empty" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_update_resume_not_found(self, db_session: AsyncSession):
        """Test updating a non-existent resume"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()

        update_data = ResumeUpdate(title="New Title")

        with pytest.raises(NotFoundError) as exc_info:
            await ResumeService.update_resume(
                db=db_session, resume_id=resume_id, user_id=user_id, update_data=update_data
            )

        assert "Resume" in str(exc_info.value)


@pytest.mark.unit
class TestResumeServiceDelete:
    """Test resume deletion methods"""

    @pytest.mark.asyncio
    async def test_delete_resume_success(self, db_session: AsyncSession):
        """Test successful resume deletion"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="Software Engineer",
            content="Content",
            file_path="s3://resume.pdf",
        )

        db_session.add(resume)
        await db_session.commit()

        with patch.object(
            ResumeService, "StorageService"
        ) as mock_storage:
            mock_storage.delete_file.return_value = None

            await ResumeService.delete_resume(
                db=db_session, resume_id=resume_id, user_id=user_id
            )

            mock_storage.delete_file.assert_called_once_with("s3://resume.pdf")

    @pytest.mark.asyncio
    async def test_delete_resume_storage_failure(self, db_session: AsyncSession):
        """Test resume deletion when storage deletion fails"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="Software Engineer",
            content="Content",
            file_path="s3://resume.pdf",
        )

        db_session.add(resume)
        await db_session.commit()

        with patch.object(
            ResumeService, "StorageService"
        ) as mock_storage:
            mock_storage.delete_file.side_effect = Exception("Storage service down")

            # Should still delete database record even if storage fails
            await ResumeService.delete_resume(
                db=db_session, resume_id=resume_id, user_id=user_id
            )

            # Verify deletion
            result = await db_session.execute(select(Resume).where(Resume.id == resume_id))
            assert result.scalar_one_or_none() is None

    @pytest.mark.asyncio
    async def test_delete_resume_not_found(self, db_session: AsyncSession):
        """Test deleting a non-existent resume"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()

        with pytest.raises(NotFoundError) as exc_info:
            await ResumeService.delete_resume(
                db=db_session, resume_id=resume_id, user_id=user_id
            )

        assert "Resume" in str(exc_info.value)


@pytest.mark.unit
class TestResumeServiceReparse:
    """Test resume re-parsing methods"""

    @pytest.mark.asyncio
    async def test_reparse_resume_success(self, db_session: AsyncSession):
        """Test successful resume re-parsing"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="Software Engineer",
            content="Old content",
            file_path="s3://resume.pdf",
        )

        db_session.add(resume)
        await db_session.commit()

        with patch.object(
            ResumeService, "StorageService"
        ) as mock_storage, patch.object(
            ResumeService, "mcp_client"
        ) as mock_mcp, patch.object(
            ResumeService, "AIService"
        ) as mock_ai, patch(
            "tempfile.NamedTemporaryFile"
        ) as mock_temp:

            mock_storage.download_file.return_value = b"PDF content"
            mock_mcp.parse_resume.return_value = {
                "skills": ["Python", "FastAPI"],
                "text_content": "Updated content",
            }
            mock_ai.generate_embedding.return_value = [0.2] * 1536

            # Mock temporary file
            mock_temp_file = MagicMock()
            mock_temp_file.name = "/tmp/test.pdf"
            mock_temp.return_value.__enter__.return_value = mock_temp_file
            mock_temp.return_value.__exit__.return_value = False

            result = await ResumeService.reparse_resume(
                db=db_session, resume_id=resume_id, user_id=user_id
            )

            assert result.content is not None
            mock_mcp.parse_resume.assert_called_once()

    @pytest.mark.asyncio
    async def test_reparse_resume_not_found(self, db_session: AsyncSession):
        """Test re-parsing a non-existent resume"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()

        with pytest.raises(NotFoundError) as exc_info:
            await ResumeService.reparse_resume(
                db=db_session, resume_id=resume_id, user_id=user_id
            )

        assert "Resume" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_reparse_resume_download_failure(self, db_session: AsyncSession):
        """Test resume re-parsing when file download fails"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="Software Engineer",
            content="Content",
            file_path="s3://resume.pdf",
        )

        db_session.add(resume)
        await db_session.commit()

        with patch.object(
            ResumeService, "StorageService"
        ) as mock_storage:
            mock_storage.download_file.return_value = None

            with pytest.raises(NotFoundError) as exc_info:
                await ResumeService.reparse_resume(
                    db=db_session, resume_id=resume_id, user_id=user_id
                )

            assert "Resume file" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_reparse_resume_mcp_failure(self, db_session: AsyncSession):
        """Test resume re-parsing when MCP fails"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="Software Engineer",
            content="Old content",
            file_path="s3://resume.pdf",
        )

        db_session.add(resume)
        await db_session.commit()

        with patch.object(
            ResumeService, "StorageService"
        ) as mock_storage, patch.object(
            ResumeService, "mcp_client"
        ) as mock_mcp, patch(
            "tempfile.NamedTemporaryFile"
        ) as mock_temp:

            mock_storage.download_file.return_value = b"PDF content"
            mock_mcp.parse_resume.side_effect = MCPError("MCP service down")

            # Mock temporary file
            mock_temp_file = MagicMock()
            mock_temp_file.name = "/tmp/test.pdf"
            mock_temp.return_value.__enter__.return_value = mock_temp_file
            mock_temp.return_value.__exit__.return_value = False

            with pytest.raises(Exception) as exc_info:
                await ResumeService.reparse_resume(
                    db=db_session, resume_id=resume_id, user_id=user_id
                )

            assert "Failed to parse resume" in str(exc_info.value)


@pytest.mark.unit
class TestResumeServiceBulkDelete:
    """Test bulk delete operations"""

    @pytest.mark.asyncio
    async def test_bulk_delete_resumes_success(self, db_session: AsyncSession):
        """Test successful bulk delete of resumes"""
        user_id = uuid.uuid4()

        # Create test resumes
        resume_ids = []
        for _ in range(5):
            resume_id = uuid.uuid4()
            resume_ids.append(resume_id)
            resume = Resume(
                id=resume_id,
                user_id=user_id,
                title=f"Resume {resume_id}",
                content="Content",
                file_path=f"s3://resume{resume_id}.pdf",
            )
            db_session.add(resume)

        await db_session.commit()

        with patch.object(ResumeService, "StorageService"):
            result = await ResumeService.bulk_delete_resumes(
                db=db_session, user_id=user_id, resume_ids=resume_ids
            )

            assert result.success_count == 5
            assert result.failed_count == 0
            assert len(result.errors) == 0

    @pytest.mark.asyncio
    async def test_bulk_delete_resumes_empty_list(self, db_session: AsyncSession):
        """Test bulk delete with empty list"""
        user_id = uuid.uuid4()

        with pytest.raises(ValidationError) as exc_info:
            await ResumeService.bulk_delete_resumes(
                db=db_session, user_id=user_id, resume_ids=[]
            )

        assert "Resume IDs list cannot be empty" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_bulk_delete_resumes_too_many(self, db_session: AsyncSession):
        """Test bulk delete with too many IDs"""
        user_id = uuid.uuid4()

        resume_ids = [uuid.uuid4() for _ in range(101)]

        with pytest.raises(ValidationError) as exc_info:
            await ResumeService.bulk_delete_resumes(
                db=db_session, user_id=user_id, resume_ids=resume_ids
            )

        assert "Cannot delete more than 100 resumes" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_bulk_delete_resumes_invalid_uuid(self, db_session: AsyncSession):
        """Test bulk delete with invalid UUID format"""
        user_id = uuid.uuid4()

        resume_ids = ["invalid-uuid", str(uuid.uuid4())]

        with pytest.raises(ValidationError) as exc_info:
            await ResumeService.bulk_delete_resumes(
                db=db_session, user_id=user_id, resume_ids=resume_ids
            )

        assert "Invalid resume ID format" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_bulk_delete_resumes_partial_failure(self, db_session: AsyncSession):
        """Test bulk delete with partial failures"""
        user_id = uuid.uuid4()

        # Create 3 real resumes
        real_resume_ids = []
        for _ in range(3):
            resume_id = uuid.uuid4()
            real_resume_ids.append(resume_id)
            resume = Resume(
                id=resume_id,
                user_id=user_id,
                title=f"Resume {resume_id}",
                content="Content",
                file_path=f"s3://resume{resume_id}.pdf",
            )
            db_session.add(resume)

        await db_session.commit()

        # Mix with 2 non-existent IDs
        all_ids = real_resume_ids + [uuid.uuid4(), uuid.uuid4()]

        with patch.object(ResumeService, "StorageService"):
            result = await ResumeService.bulk_delete_resumes(
                db=db_session, user_id=user_id, resume_ids=all_ids
            )

            assert result.success_count == 3
            assert result.failed_count == 2
            assert len(result.errors) == 2


@pytest.mark.unit
class TestResumeServiceEdgeCases:
    """Test edge cases and error scenarios"""

    @pytest.mark.asyncio
    async def test_create_resume_all_supported_formats(self, db_session: AsyncSession):
        """Test creating resumes with all supported file formats"""
        user_id = uuid.uuid4()

        supported_formats = [".pdf", ".doc", ".docx", ".txt"]

        for file_format in supported_formats:
            file = MagicMock(spec=UploadFile)
            file.filename = f"resume{file_format}"
            file.read = AsyncMock(return_value=b"content")

            with patch.object(
                ResumeService, "StorageService"
            ) as mock_storage, patch.object(
                ResumeService, "FileParserService"
            ) as mock_parser:

                mock_storage.upload_file.return_value = f"s3://resume{file_format}"
                mock_parser.parse_file.return_value = "Extracted text"

                result = await ResumeService.create_resume(
                    db=db_session,
                    user_id=user_id,
                    file=file,
                    title=f"Resume {file_format}",
                )

                assert result.title == f"Resume {file_format}"

    @pytest.mark.asyncio
    async def test_update_resume_with_no_changes(self, db_session: AsyncSession):
        """Test updating resume with no actual changes"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="Software Engineer",
            content="Content",
            file_path="path.pdf",
        )

        db_session.add(resume)
        await db_session.commit()

        update_data = ResumeUpdate()  # No changes

        result = await ResumeService.update_resume(
            db=db_session, resume_id=resume_id, user_id=user_id, update_data=update_data
        )

        assert result.title == "Software Engineer"

    @pytest.mark.asyncio
    async def test_get_resumes_pagination_edge_cases(self, db_session: AsyncSession):
        """Test pagination edge cases"""
        user_id = uuid.uuid4()

        # Create exactly 20 resumes
        for i in range(20):
            resume = Resume(
                id=uuid.uuid4(),
                user_id=user_id,
                title=f"Resume {i}",
                content=f"Content {i}",
                file_path=f"path{i}.pdf",
            )
            db_session.add(resume)

        await db_session.commit()

        # Test page size equals total
        result, total = await ResumeService.get_resumes_paginated(
            db=db_session, user_id=user_id, page=1, page_size=20
        )

        assert len(result) == 20
        assert total == 20

        # Test page beyond available data
        result, total = await ResumeService.get_resumes_paginated(
            db=db_session, user_id=user_id, page=5, page_size=10
        )

        assert len(result) == 0
        assert total == 20

    @pytest.mark.asyncio
    async def test_create_resume_without_filename(self, db_session: AsyncSession):
        """Test creating resume without filename"""
        user_id = uuid.uuid4()

        file = MagicMock(spec=UploadFile)
        file.filename = None
        file.read = AsyncMock(return_value=b"content")

        with pytest.raises(ValidationError) as exc_info:
            await ResumeService.create_resume(
                db=db_session, user_id=user_id, file=file, title="Software Engineer"
            )

        assert "Filename is required" in str(exc_info.value)
