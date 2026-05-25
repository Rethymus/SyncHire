import json
import uuid
import tempfile
import os
from pathlib import Path
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import UploadFile
from app.models.resume import Resume
from app.schemas.resume import ResumeUpdate, BulkDeleteResponse
from app.core.config import get_settings
from app.core.errors import (
    ValidationError,
    NotFoundError,
    FileUploadError,
    FileSizeError,
    FileTypeError,
    DatabaseError,
    handle_database_error,
    ExternalServiceError,
)
from app.services.mcp_client import mcp_client, MCPError
from app.services.ai_service import AIService
from app.services.storage_service import StorageService
from app.services.file_parser import FileParserService
import logging

logger = logging.getLogger(__name__)
settings = get_settings()


class ResumeService:
    # Allowed file extensions for resume upload
    ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt"}
    MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB

    @staticmethod
    async def create_resume(
        db: AsyncSession,
        user_id: uuid.UUID,
        file: UploadFile,
        title: str,
    ) -> Resume:
        """
        Create a new resume by uploading and parsing a file with comprehensive error handling

        Args:
            db: Database session
            user_id: User ID
            file: Uploaded file
            title: Resume title

        Returns:
            Created resume object

        Raises:
            ValidationError: If input data is invalid
            FileUploadError: If file upload fails
            DatabaseError: If database operation fails
        """
        s3_key = None
        tmp_file_path = None

        try:
            # Validate input
            if not title or not title.strip():
                raise ValidationError(
                    message="Resume title is required",
                    field="title"
                )

            if not file.filename:
                raise ValidationError(
                    message="Filename is required",
                    field="file"
                )

            # Read file content
            try:
                content = await file.read()
            except Exception as e:
                logger.error(f"Failed to read file content: {str(e)}")
                raise FileUploadError(
                    message="Failed to read uploaded file",
                    details={"error": str(e)}
                )

            # Validate file size
            if len(content) == 0:
                raise ValidationError(
                    message="Uploaded file is empty",
                    field="file"
                )

            if len(content) > ResumeService.MAX_UPLOAD_SIZE:
                raise FileSizeError(
                    max_size=ResumeService.MAX_UPLOAD_SIZE,
                    actual_size=len(content)
                )

            # Validate file extension
            file_extension = Path(file.filename).suffix.lower()
            if file_extension not in ResumeService.ALLOWED_EXTENSIONS:
                raise FileTypeError(
                    allowed_types=list(ResumeService.ALLOWED_EXTENSIONS),
                    actual_type=file_extension
                )

            # Determine content type
            content_types = {
                ".pdf": "application/pdf",
                ".doc": "application/msword",
                ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".txt": "text/plain",
            }
            content_type = content_types.get(file_extension, "application/octet-stream")

            # Upload to storage with error handling
            try:
                s3_key = await StorageService.upload_file(
                    file_content=content,
                    file_name=file.filename,
                    content_type=content_type,
                )
                logger.info(f"File uploaded to storage: {s3_key}")
            except Exception as e:
                logger.error(f"Storage upload failed: {str(e)}", exc_info=True)
                raise FileUploadError(
                    message="Failed to upload file to storage",
                    details={"error": str(e)}
                )

            # Parse resume using file parser service
            parsed_data = None
            resume_content = None
            embedding = None

            try:
                # Extract text from file using FileParserService
                try:
                    extracted_text = await FileParserService.parse_file(file.filename, content)
                    resume_content = extracted_text
                except Exception as e:
                    logger.warning(f"File parsing failed: {str(e)}")
                    # Continue without parsed content

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
                            try:
                                embedding = await AIService.generate_embedding(text_for_embedding)
                            except Exception as e:
                                logger.warning(f"Embedding generation failed: {str(e)}")

                    finally:
                        # Clean up temporary file
                        if tmp_file_path and os.path.exists(tmp_file_path):
                            os.remove(tmp_file_path)
                            tmp_file_path = None

                except MCPError as mcp_error:
                    # Log MCP error but continue - resume is saved with extracted text
                    logger.warning(f"MCP parsing failed: {mcp_error}")
                    # Still generate embedding from extracted text
                    if resume_content:
                        try:
                            embedding = await AIService.generate_embedding(resume_content)
                        except Exception as e:
                            logger.warning(f"Embedding generation from extracted text failed: {str(e)}")

            except Exception as e:
                logger.error(f"Resume parsing failed: {str(e)}", exc_info=True)
                # Continue - resume is saved even if parsing fails

            # Create database record with transaction handling
            try:
                db_resume = Resume(
                    user_id=user_id,
                    title=title,
                    file_path=s3_key,
                    content=resume_content,
                    parsed_data=json.dumps(parsed_data, ensure_ascii=False) if parsed_data else None,
                    embedding=embedding,
                )

                db.add(db_resume)
                await db.commit()
                await db.refresh(db_resume)
                logger.info(f"Resume created successfully: {db_resume.id}")

                return db_resume

            except Exception as e:
                await db.rollback()
                # Clean up uploaded file if database insert fails
                if s3_key:
                    try:
                        await StorageService.delete_file(s3_key)
                    except Exception as cleanup_error:
                        logger.error(f"Failed to cleanup storage file: {cleanup_error}")

                handle_database_error(e, "resume creation")

        except (ValidationError, FileUploadError, DatabaseError):
            # Re-raise our custom errors
            raise
        except Exception as e:
            logger.error(f"Unexpected error during resume creation: {str(e)}", exc_info=True)
            raise FileUploadError(
                message="Failed to create resume due to an unexpected error",
                details={"error": str(e)}
            )
        finally:
            # Ensure temporary file is cleaned up
            if tmp_file_path and os.path.exists(tmp_file_path):
                try:
                    os.remove(tmp_file_path)
                except Exception as e:
                    logger.error(f"Failed to cleanup temporary file: {e}")

    @staticmethod
    async def get_resumes(db: AsyncSession, user_id: uuid.UUID) -> list[Resume]:
        """
        Get all resumes for a user with error handling

        Args:
            db: Database session
            user_id: User ID

        Returns:
            List of resume objects

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            result = await db.execute(
                select(Resume)
                .where(Resume.user_id == user_id)
                .order_by(Resume.created_at.desc())
            )
            resumes = list(result.scalars().all())
            logger.info(f"Retrieved {len(resumes)} resumes for user {user_id}")
            return resumes

        except Exception as e:
            logger.error(f"Failed to retrieve resumes for user {user_id}: {str(e)}", exc_info=True)
            raise DatabaseError(
                message="Failed to retrieve resumes",
                details={"user_id": str(user_id), "error": str(e)}
            )

    @staticmethod
    async def get_resume(
        db: AsyncSession, resume_id: uuid.UUID, user_id: uuid.UUID
    ) -> Resume:
        """
        Get a specific resume with error handling

        Args:
            db: Database session
            resume_id: Resume ID
            user_id: User ID

        Returns:
            Resume object

        Raises:
            NotFoundError: If resume not found
            DatabaseError: If database operation fails
        """
        try:
            result = await db.execute(
                select(Resume).where(Resume.id == resume_id, Resume.user_id == user_id)
            )
            resume = result.scalar_one_or_none()

            if not resume:
                logger.warning(f"Resume {resume_id} not found for user {user_id}")
                raise NotFoundError(
                    resource="Resume",
                    details={"resume_id": str(resume_id), "user_id": str(user_id)}
                )

            return resume

        except NotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to retrieve resume {resume_id}: {str(e)}", exc_info=True)
            raise DatabaseError(
                message="Failed to retrieve resume",
                details={"resume_id": str(resume_id), "error": str(e)}
            )

    @staticmethod
    async def update_resume(
        db: AsyncSession,
        resume_id: uuid.UUID,
        user_id: uuid.UUID,
        update_data: ResumeUpdate,
    ) -> Resume:
        """
        Update a resume with error handling

        Args:
            db: Database session
            resume_id: Resume ID
            user_id: User ID
            update_data: Update data

        Returns:
            Updated resume object

        Raises:
            NotFoundError: If resume not found
            ValidationError: If update data is invalid
            DatabaseError: If database operation fails
        """
        try:
            resume = await ResumeService.get_resume(db, resume_id, user_id)

            # Update fields if provided
            if update_data.title is not None:
                if not update_data.title.strip():
                    raise ValidationError(
                        message="Resume title cannot be empty",
                        field="title"
                    )
                resume.title = update_data.title.strip()

            # Commit changes with transaction handling
            try:
                await db.commit()
                await db.refresh(resume)
                logger.info(f"Resume {resume_id} updated successfully")
                return resume

            except Exception as e:
                await db.rollback()
                handle_database_error(e, "resume update")

        except (NotFoundError, ValidationError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error updating resume {resume_id}: {str(e)}", exc_info=True)
            raise DatabaseError(
                message="Failed to update resume",
                details={"resume_id": str(resume_id), "error": str(e)}
            )

    @staticmethod
    async def delete_resume(
        db: AsyncSession, resume_id: uuid.UUID, user_id: uuid.UUID
    ) -> None:
        """
        Delete a resume with error handling and cleanup

        Args:
            db: Database session
            resume_id: Resume ID
            user_id: User ID

        Raises:
            NotFoundError: If resume not found
            DatabaseError: If database operation fails
        """
        try:
            resume = await ResumeService.get_resume(db, resume_id, user_id)

            # Delete file from storage with error handling
            if resume.file_path:
                try:
                    await StorageService.delete_file(resume.file_path)
                    logger.info(f"Deleted file from storage: {resume.file_path}")
                except Exception as e:
                    logger.error(f"Failed to delete file from storage: {str(e)}")
                    # Continue with database deletion even if storage deletion fails

            # Delete database record with transaction handling
            try:
                await db.delete(resume)
                await db.commit()
                logger.info(f"Resume {resume_id} deleted successfully")

            except Exception as e:
                await db.rollback()
                handle_database_error(e, "resume deletion")

        except NotFoundError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error deleting resume {resume_id}: {str(e)}", exc_info=True)
            raise DatabaseError(
                message="Failed to delete resume",
                details={"resume_id": str(resume_id), "error": str(e)}
            )

    @staticmethod
    async def reparse_resume(
        db: AsyncSession,
        resume_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Resume:
        """
        Re-parse a resume using MCP client with comprehensive error handling

        Args:
            db: Database session
            resume_id: Resume ID
            user_id: User ID

        Returns:
            Updated resume object

        Raises:
            NotFoundError: If resume not found
            ExternalServiceError: If MCP service fails
            DatabaseError: If database operation fails
        """
        tmp_file_path = None

        try:
            resume = await ResumeService.get_resume(db, resume_id, user_id)

            # Download file from storage
            try:
                content = await StorageService.download_file(resume.file_path)
                if content is None:
                    raise NotFoundError(
                        resource="Resume file",
                        details={"file_path": resume.file_path}
                    )
            except NotFoundError:
                raise
            except Exception as e:
                logger.error(f"Failed to download resume file: {str(e)}")
                raise ExternalServiceError(
                    service="Storage Service",
                    message="Failed to download resume file",
                    details={"file_path": resume.file_path, "error": str(e)}
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
                    # Parse with MCP client
                    try:
                        parsed_data = await mcp_client.parse_resume(tmp_file_path, content)
                    except MCPError as e:
                        logger.error(f"MCP parsing failed: {str(e)}")
                        raise ExternalServiceError(
                            service="MCP Resume Parser",
                            message="Failed to parse resume",
                            details={"error": str(e)}
                        )

                    # Update embedding
                    embedding = None
                    if parsed_data.get("text_content"):
                        try:
                            embedding = await AIService.generate_embedding(
                                parsed_data["text_content"]
                            )
                        except Exception as e:
                            logger.warning(f"Embedding generation failed: {str(e)}")

                    # Update database with transaction handling
                    try:
                        resume.content = json.dumps(parsed_data, ensure_ascii=False)
                        resume.parsed_data = json.dumps(parsed_data, ensure_ascii=False)
                        resume.embedding = embedding

                        await db.commit()
                        await db.refresh(resume)
                        logger.info(f"Resume {resume_id} re-parsed successfully")

                        return resume

                    except Exception as e:
                        await db.rollback()
                        handle_database_error(e, "resume re-parsing")

                finally:
                    # Clean up temporary file
                    if tmp_file_path and os.path.exists(tmp_file_path):
                        os.remove(tmp_file_path)
                        tmp_file_path = None

            except (ExternalServiceError, DatabaseError):
                raise
            except Exception as e:
                logger.error(f"Unexpected error during resume re-parsing: {str(e)}", exc_info=True)
                raise ExternalServiceError(
                    service="Resume Parser",
                    message="Failed to re-parse resume",
                    details={"error": str(e)}
                )

        except (NotFoundError, ExternalServiceError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error re-parsing resume {resume_id}: {str(e)}", exc_info=True)
            raise DatabaseError(
                message="Failed to re-parse resume",
                details={"resume_id": str(resume_id), "error": str(e)}
            )
        finally:
            # Ensure temporary file is cleaned up
            if tmp_file_path and os.path.exists(tmp_file_path):
                try:
                    os.remove(tmp_file_path)
                except Exception as e:
                    logger.error(f"Failed to cleanup temporary file: {e}")

    @staticmethod
    async def bulk_delete_resumes(
        db: AsyncSession,
        user_id: uuid.UUID,
        resume_ids: List[uuid.UUID],
    ) -> BulkDeleteResponse:
        """
        Bulk delete resumes with comprehensive error handling and partial failure support

        Args:
            db: Database session
            user_id: User ID
            resume_ids: List of resume IDs to delete

        Returns:
            BulkDeleteResponse with success/failure counts and error details

        Raises:
            ValidationError: If input data is invalid
        """
        try:
            # Validate input
            if not resume_ids:
                raise ValidationError(
                    message="Resume IDs list cannot be empty",
                    field="resume_ids"
                )

            if len(resume_ids) > 100:
                raise ValidationError(
                    message="Cannot delete more than 100 resumes at once",
                    field="resume_ids",
                    details={"count": len(resume_ids), "max": 100}
                )

            # Validate all IDs are valid UUIDs
            try:
                valid_ids = [uuid.UUID(str(resume_id)) for resume_id in resume_ids]
            except ValueError as e:
                raise ValidationError(
                    message="Invalid resume ID format",
                    field="resume_ids",
                    details={"error": str(e)}
                )

            # Fetch all resumes that belong to the user
            try:
                result = await db.execute(
                    select(Resume).where(
                        Resume.id.in_(valid_ids),
                        Resume.user_id == user_id
                    )
                )
                resumes = list(result.scalars().all())
                found_ids = {resume.id for resume in resumes}

                # Identify IDs that weren't found
                missing_ids = set(valid_ids) - found_ids

                logger.info(f"Found {len(resumes)} out of {len(valid_ids)} resumes for user {user_id}")

            except Exception as e:
                logger.error(f"Failed to fetch resumes for bulk deletion: {str(e)}", exc_info=True)
                raise DatabaseError(
                    message="Failed to fetch resumes for deletion",
                    details={"user_id": str(user_id), "error": str(e)}
                )

            # Delete resumes one by one to handle partial failures
            success_count = 0
            failed_count = 0
            errors = []

            for resume in resumes:
                try:
                    # Delete file from storage
                    if resume.file_path:
                        try:
                            await StorageService.delete_file(resume.file_path)
                            logger.debug(f"Deleted file from storage: {resume.file_path}")
                        except Exception as e:
                            logger.error(f"Failed to delete file {resume.file_path}: {str(e)}")
                            # Continue with database deletion

                    # Delete database record
                    await db.delete(resume)
                    success_count += 1
                    logger.debug(f"Successfully deleted resume {resume.id}")

                except Exception as e:
                    failed_count += 1
                    error_msg = str(e)
                    errors.append({
                        "id": str(resume.id),
                        "error": error_msg
                    })
                    logger.error(f"Failed to delete resume {resume.id}: {error_msg}")

            # Add missing IDs to errors
            for missing_id in missing_ids:
                failed_count += 1
                errors.append({
                    "id": str(missing_id),
                    "error": "Resume not found or access denied"
                })

            # Commit transaction if at least one deletion succeeded
            if success_count > 0:
                try:
                    await db.commit()
                    logger.info(f"Bulk delete completed: {success_count} succeeded, {failed_count} failed")
                except Exception as e:
                    await db.rollback()
                    logger.error(f"Failed to commit bulk delete transaction: {str(e)}", exc_info=True)
                    raise DatabaseError(
                        message="Failed to commit bulk delete operation",
                        details={"error": str(e)}
                    )

            return BulkDeleteResponse(
                success_count=success_count,
                failed_count=failed_count,
                errors=errors
            )

        except (ValidationError, DatabaseError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error during bulk resume deletion: {str(e)}", exc_info=True)
            raise DatabaseError(
                message="Failed to perform bulk delete operation",
                details={"user_id": str(user_id), "error": str(e)}
            )
