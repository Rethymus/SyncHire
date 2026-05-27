"""
Local File Storage Service

Handles file storage on local filesystem instead of cloud storage (Minio/S3).
"""

import os
import shutil
import aiofiles
from pathlib import Path
from typing import Optional
from fastapi import UploadFile, HTTPException
from fastapi.responses import FileResponse, StreamingResponse

from app.core.config_lite import get_lite_settings
from app.core.logger import logger, LogCategory

settings = get_lite_settings()


class LocalFileStorage:
    """Local filesystem storage for resume and JD files."""

    def __init__(self):
        self.files_dir = settings.FILES_DIR
        self.allowed_extensions = {".pdf", ".doc", ".docx", ".txt"}
        self.max_file_size = settings.MAX_UPLOAD_SIZE

        # Ensure directory exists
        self.files_dir.mkdir(parents=True, exist_ok=True)

    def is_allowed_type(self, filename: str) -> bool:
        """
        Check if file type is allowed.

        Args:
            filename: Name of the file

        Returns:
            True if allowed, False otherwise
        """
        ext = Path(filename).suffix.lower()
        return ext in self.allowed_extensions

    async def save_file(self, file: UploadFile, file_id: str) -> str:
        """
        Save uploaded file to local filesystem.

        Args:
            file: Uploaded file
            file_id: Unique identifier for the file

        Returns:
            Path where file was saved

        Raises:
            HTTPException: If file validation fails
        """
        try:
            # Validate file type
            if not self.is_allowed_type(file.filename):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid file type. Allowed: {', '.join(self.allowed_extensions)}"
                )

            # Generate file path
            ext = Path(file.filename).suffix.lower()
            filename = f"{file_id}{ext}"
            file_path = self.files_dir / filename

            # Save file
            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()

                # Check file size
                if len(content) > self.max_file_size:
                    raise HTTPException(
                        status_code=400,
                        detail=f"File too large. Maximum size: {self.max_file_size} bytes"
                    )

                await f.write(content)

            logger.info(LogCategory.DATA, f"Saved file: {file_path}")

            return str(file_path)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(LogCategory.DATA, f"Failed to save file: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail="Failed to save file"
            )

    async def get_file(self, file_path: str, filename: str):
        """
        Get file for download.

        Args:
            file_path: Path to the file
            filename: Original filename

        Returns:
            FileResponse for download

        Raises:
            HTTPException: If file not found
        """
        try:
            path = Path(file_path)

            if not path.exists():
                raise HTTPException(
                    status_code=404,
                    detail="File not found"
                )

            # Determine media type
            media_type = self._get_media_type(path.suffix)

            return FileResponse(
                path=str(path),
                filename=filename,
                media_type=media_type
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(LogCategory.DATA, f"Failed to get file: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail="Failed to get file"
            )

    def delete_file(self, file_path: str) -> bool:
        """
        Delete file from filesystem.

        Args:
            file_path: Path to the file

        Returns:
            True if deleted, False otherwise
        """
        try:
            path = Path(file_path)

            if path.exists():
                path.unlink()
                logger.info(LogCategory.DATA, f"Deleted file: {file_path}")
                return True

            return False

        except Exception as e:
            logger.error(LogCategory.DATA, f"Failed to delete file: {str(e)}", exc_info=True)
            return False

    async def extract_text(self, file_path: str) -> str:
        """
        Extract text content from file.

        Args:
            file_path: Path to the file

        Returns:
            Extracted text content
        """
        try:
            path = Path(file_path)
            ext = path.suffix.lower()

            if ext == ".txt":
                # Read text file directly
                async with aiofiles.open(path, 'r', encoding='utf-8') as f:
                    return await f.read()

            elif ext == ".pdf":
                # Extract text from PDF
                return await self._extract_pdf_text(path)

            elif ext in [".doc", ".docx"]:
                # Extract text from Word document
                return await self._extract_docx_text(path)

            else:
                return ""

        except Exception as e:
            logger.error(LogCategory.DATA, f"Failed to extract text: {str(e)}", exc_info=True)
            return ""

    async def _extract_pdf_text(self, path: Path) -> str:
        """Extract text from PDF file."""
        try:
            import PyPDF2

            text = ""
            with open(path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                for page in reader.pages:
                    text += page.extract_text() + "\n"

            return text.strip()

        except ImportError:
            logger.warning(LogCategory.DATA, "PyPDF2 not installed, cannot extract PDF text")
            return ""
        except Exception as e:
            logger.error(LogCategory.DATA, f"PDF extraction failed: {str(e)}", exc_info=True)
            return ""

    async def _extract_docx_text(self, path: Path) -> str:
        """Extract text from DOCX file."""
        try:
            from docx import Document

            doc = Document(path)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])

            return text.strip()

        except ImportError:
            logger.warning(LogCategory.DATA, "python-docx not installed, cannot extract DOCX text")
            return ""
        except Exception as e:
            logger.error(LogCategory.DATA, f"DOCX extraction failed: {str(e)}", exc_info=True)
            return ""

    def _get_media_type(self, ext: str) -> str:
        """Get media type for file extension."""
        media_types = {
            ".pdf": "application/pdf",
            ".doc": "application/msword",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".txt": "text/plain",
        }
        return media_types.get(ext.lower(), "application/octet-stream")

    def list_files(self) -> list[str]:
        """
        List all files in storage.

        Returns:
            List of file paths
        """
        try:
            return [str(f) for f in self.files_dir.iterdir() if f.is_file()]
        except Exception as e:
            logger.error(LogCategory.DATA, f"Failed to list files: {str(e)}", exc_info=True)
            return []

    def get_storage_size(self) -> int:
        """
        Get total size of all stored files.

        Returns:
            Size in bytes
        """
        try:
            total_size = 0
            for file_path in self.files_dir.rglob('*'):
                if file_path.is_file():
                    total_size += file_path.stat().st_size
            return total_size
        except Exception as e:
            logger.error(LogCategory.DATA, f"Failed to calculate storage size: {str(e)}", exc_info=True)
            return 0


# Global file storage instance
file_storage = LocalFileStorage()
