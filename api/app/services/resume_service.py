import json
import uuid
import tempfile
import os
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status, UploadFile
from app.models.resume import Resume
from app.schemas.resume import ResumeUpdate
from app.core.config import get_settings
from app.services.mcp_client import mcp_client, MCPError
from app.services.ai_service import AIService
from app.services.storage_service import StorageService
from app.services.file_parser import FileParserService

settings = get_settings()


class ResumeService:
    @staticmethod
    async def create_resume(
        db: AsyncSession,
        user_id: uuid.UUID,
        file: UploadFile,
        title: str,
    ) -> Resume:
        """Create a new resume by uploading and parsing a file."""

        # Read file content
        content = await file.read()

        # Validate file size
        max_upload_size = 10 * 1024 * 1024  # 10MB
        if len(content) > max_upload_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size: {max_upload_size / (1024 * 1024)}MB",
            )

        file_extension = Path(file.filename).suffix.lower()

        # Determine content type
        content_types = {
            ".pdf": "application/pdf",
            ".doc": "application/msword",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".txt": "text/plain",
        }
        content_type = content_types.get(file_extension, "application/octet-stream")

        # Upload to Minio
        s3_key = await StorageService.upload_file(
            file_content=content,
            file_name=file.filename,
            content_type=content_type,
        )

        # Parse resume using file parser service
        parsed_data = None
        resume_content = None
        embedding = None

        try:
            # Extract text from file using FileParserService
            extracted_text = await FileParserService.parse_file(file.filename, content)

            # Store extracted text as content
            resume_content = extracted_text

            # Try to parse structured data using MCP client
            try:
                # Create temporary file for MCP parsing
                with tempfile.NamedTemporaryFile(
                    delete=False, suffix=file_extension
                ) as tmp_file:
                    tmp_file.write(content)
                    tmp_file_path = tmp_file.name

                try:
                    parsed_data = await mcp_client.parse_resume(tmp_file_path, content)

                    # Generate embedding for semantic search
                    text_for_embedding = parsed_data.get("text_content") or extracted_text
                    if text_for_embedding:
                        embedding = await AIService.generate_embedding(text_for_embedding)

                finally:
                    # Clean up temporary file
                    if os.path.exists(tmp_file_path):
                        os.remove(tmp_file_path)

            except MCPError as mcp_error:
                # Log MCP error but continue - resume is saved with extracted text
                print(f"MCP parsing failed: {mcp_error}")
                # Still generate embedding from extracted text
                if extracted_text:
                    embedding = await AIService.generate_embedding(extracted_text)

        except HTTPException:
            # Re-raise HTTP exceptions from file parser
            raise
        except Exception as e:
            # Log error but continue - resume is saved
            print(f"Resume parsing failed: {e}")

        db_resume = Resume(
            user_id=user_id,
            title=title,
            file_path=s3_key,
            content=resume_content,
            parsed_data=json.dumps(parsed_data) if parsed_data else None,
            embedding=embedding,
        )

        db.add(db_resume)
        await db.commit()
        await db.refresh(db_resume)

        return db_resume

    @staticmethod
    async def get_resumes(db: AsyncSession, user_id: uuid.UUID) -> list[Resume]:
        result = await db.execute(
            select(Resume)
            .where(Resume.user_id == user_id)
            .order_by(Resume.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_resume(
        db: AsyncSession, resume_id: uuid.UUID, user_id: uuid.UUID
    ) -> Resume:
        result = await db.execute(
            select(Resume).where(Resume.id == resume_id, Resume.user_id == user_id)
        )
        resume = result.scalar_one_or_none()

        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found",
            )

        return resume

    @staticmethod
    async def update_resume(
        db: AsyncSession,
        resume_id: uuid.UUID,
        user_id: uuid.UUID,
        update_data: ResumeUpdate,
    ) -> Resume:
        resume = await ResumeService.get_resume(db, resume_id, user_id)

        if update_data.title is not None:
            resume.title = update_data.title

        await db.commit()
        await db.refresh(resume)

        return resume

    @staticmethod
    async def delete_resume(
        db: AsyncSession, resume_id: uuid.UUID, user_id: uuid.UUID
    ) -> None:
        resume = await ResumeService.get_resume(db, resume_id, user_id)

        # Delete file from Minio storage
        if resume.file_path:
            await StorageService.delete_file(resume.file_path)

        await db.delete(resume)
        await db.commit()

    @staticmethod
    async def reparse_resume(
        db: AsyncSession,
        resume_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Resume:
        """Re-parse a resume using MCP client."""
        resume = await ResumeService.get_resume(db, resume_id, user_id)

        # Download file from Minio
        content = await StorageService.download_file(resume.file_path)
        if content is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume file not found in storage",
            )

        try:
            # Create temporary file for MCP parsing
            file_extension = Path(resume.file_path).suffix
            with tempfile.NamedTemporaryFile(
                delete=False, suffix=file_extension
            ) as tmp_file:
                tmp_file.write(content)
                tmp_file_path = tmp_file.name

            try:
                parsed_data = await mcp_client.parse_resume(tmp_file_path, content)
                resume_content = json.dumps(parsed_data, ensure_ascii=False)

                # Update embedding
                embedding = None
                if parsed_data.get("text_content"):
                    embedding = await AIService.generate_embedding(
                        parsed_data["text_content"]
                    )

                resume.content = resume_content
                resume.parsed_data = json.dumps(parsed_data)
                resume.embedding = embedding

                await db.commit()
                await db.refresh(resume)

                return resume
            finally:
                # Clean up temporary file
                if os.path.exists(tmp_file_path):
                    os.remove(tmp_file_path)

        except MCPError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to parse resume: {e}",
            )
