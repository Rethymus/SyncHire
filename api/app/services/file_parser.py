"""File parsing service for JD uploads.

Supports PDF and DOCX file parsing with text extraction.
"""

import io
from fastapi import HTTPException, status
import pdfplumber
from docx import Document


class FileParserService:
    """Service for parsing uploaded files."""

    SUPPORTED_EXTENSIONS = {".pdf", ".docx"}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

    @staticmethod
    async def parse_file(filename: str, file_content: bytes) -> str:
        """Parse uploaded file and extract text content.

        Args:
            filename: Name of the uploaded file
            file_content: Binary content of the file

        Returns:
            Extracted text content

        Raises:
            HTTPException: If file is invalid or unsupported
        """
        # Validate file extension
        file_ext = FileParserService._get_file_extension(filename)
        if file_ext not in FileParserService.SUPPORTED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file type: {file_ext}. Supported: {', '.join(FileParserService.SUPPORTED_EXTENSIONS)}",
            )

        # Validate file size
        if len(file_content) > FileParserService.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size: {FileParserService.MAX_FILE_SIZE / (1024 * 1024):.0f}MB",
            )

        try:
            if file_ext == ".pdf":
                return await FileParserService._parse_pdf(file_content)
            elif file_ext == ".docx":
                return await FileParserService._parse_docx(file_content)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to parse file: {str(e)}",
            )

    @staticmethod
    def _get_file_extension(filename: str) -> str:
        """Extract file extension from filename."""
        return "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    @staticmethod
    async def _parse_pdf(file_content: bytes) -> str:
        """Parse PDF file and extract text."""
        text_parts = []

        try:
            # Open PDF from bytes
            pdf_file = io.BytesIO(file_content)
            with pdfplumber.open(pdf_file) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)

            text = "\n".join(text_parts)

            if not text or len(text.strip()) < 50:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Could not extract sufficient text from PDF. Please ensure the PDF contains text.",
                )

            return text.strip()

        except Exception as e:
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to parse PDF: {str(e)}",
            )

    @staticmethod
    async def _parse_docx(file_content: bytes) -> str:
        """Parse DOCX file and extract text."""
        try:
            # Open DOCX from bytes
            docx_file = io.BytesIO(file_content)
            doc = Document(docx_file)

            # Extract text from paragraphs
            text_parts = [
                paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip()
            ]
            text = "\n".join(text_parts)

            if not text or len(text.strip()) < 50:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Could not extract sufficient text from DOCX. Please ensure the document contains text.",
                )

            return text.strip()

        except Exception as e:
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to parse DOCX: {str(e)}",
            )
