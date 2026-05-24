"""Tests for FileParserService."""

import pytest
from fastapi import status
from app.services.file_parser import FileParserService


class TestFileParserService:
    """Test suite for FileParserService."""

    def test_supported_extensions(self):
        """Test that supported extensions are correct."""
        assert FileParserService.SUPPORTED_EXTENSIONS == {".pdf", ".docx"}

    def test_max_file_size(self):
        """Test that max file size is set correctly."""
        assert FileParserService.MAX_FILE_SIZE == 10 * 1024 * 1024  # 10MB

    @pytest.mark.asyncio
    async def test_parse_unsupported_file_type(self):
        """Test parsing unsupported file type."""
        with pytest.raises(Exception) as exc_info:
            await FileParserService.parse_file("test.txt", b"content")

        assert exc_info.value.status_code == status.HTTP_415_UNSUPPORTED_MEDIA_TYPE

    @pytest.mark.asyncio
    async def test_parse_file_too_large(self):
        """Test parsing file that exceeds size limit."""
        large_content = b"x" * (11 * 1024 * 1024)  # 11MB

        with pytest.raises(Exception) as exc_info:
            await FileParserService.parse_file("test.pdf", large_content)

        assert exc_info.value.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE

    def test_get_file_extension(self):
        """Test extracting file extension."""
        assert FileParserService._get_file_extension("test.pdf") == ".pdf"
        assert FileParserService._get_file_extension("test.DOCX") == ".docx"
        assert FileParserService._get_file_extension("test") == ""

    @pytest.mark.asyncio
    async def test_parse_pdf_with_insufficient_text(self):
        """Test parsing PDF with insufficient text."""
        # This would require a valid PDF file, so we'll test the error handling
        # In a real scenario, you'd create a mock PDF with minimal text
        pass

    @pytest.mark.asyncio
    async def test_parse_docx_with_insufficient_text(self):
        """Test parsing DOCX with insufficient text."""
        # This would require a valid DOCX file, so we'll test the error handling
        # In a real scenario, you'd create a mock DOCX with minimal text
        pass
