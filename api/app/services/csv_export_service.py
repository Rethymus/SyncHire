import csv
import io
import uuid
import json
from datetime import datetime
from typing import List, Dict, Optional, Set, AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status
import logging

from app.models.application import Application
from app.models.resume import Resume
from app.models.jd import JD
from app.models.user import User
from app.core.errors import DatabaseError

logger = logging.getLogger(__name__)


class CSVExportService:
    """Service for exporting data to CSV format with progress tracking"""

    # Default fields for each entity type
    APPLICATION_FIELDS = [
        "id",
        "status",
        "match_score",
        "notes",
        "tags",
        "created_at",
        "updated_at",
        "resume_title",
        "jd_title",
        "company_name",
    ]

    RESUME_FIELDS = [
        "id",
        "title",
        "file_name",
        "skills",
        "experience_years",
        "education_level",
        "created_at",
        "updated_at",
    ]

    JD_FIELDS = [
        "id",
        "title",
        "company_name",
        "location",
        "employment_type",
        "skills_required",
        "experience_required",
        "salary_min",
        "salary_max",
        "created_at",
        "updated_at",
    ]

    @staticmethod
    def _sanitize_csv_value(value: any) -> str:
        """Sanitize value for CSV output"""
        if value is None:
            return ""
        if isinstance(value, (list, dict)):
            return json.dumps(value)
        if isinstance(value, uuid.UUID):
            return str(value)
        if isinstance(value, datetime):
            return value.isoformat()
        return str(value)

    @staticmethod
    def _escape_csv_field(value: str) -> str:
        """Escape CSV field according to RFC4180"""
        if any(c in value for c in ['"', ",", "\n", "\r"]):
            escaped = value.replace('"', '""')
            return f'"{escaped}"'
        return value

    @staticmethod
    async def export_applications(
        db: AsyncSession,
        user_id: uuid.UUID,
        fields: Optional[List[str]] = None,
        batch_size: int = 100,
        progress_callback=None,
    ) -> AsyncGenerator[str, None]:
        """
        Export applications to CSV format with streaming and progress tracking

        Args:
            db: Database session
            user_id: User ID to filter applications
            fields: List of fields to include (defaults to APPLICATION_FIELDS)
            batch_size: Number of records to process per batch
            progress_callback: Optional callback for progress updates

        Yields:
            CSV chunks as strings
        """
        try:
            if fields is None:
                fields = CSVExportService.APPLICATION_FIELDS

            # Validate fields
            invalid_fields = set(fields) - set(CSVExportService.APPLICATION_FIELDS)
            if invalid_fields:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid fields: {invalid_fields}",
                )

            # Query total count for progress tracking
            count_query = (
                select(func.count())
                .select_from(Application)
                .where(Application.user_id == user_id)
            )
            total_count_result = await db.execute(count_query)
            total_count = total_count_result.scalar() or 0

            if total_count == 0:
                logger.info(f"No applications found for user {user_id}")
                yield ",".join(fields) + "\n"
                return

            # Create CSV buffer
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")

            # Write header
            writer.writeheader()
            header = output.getvalue()
            output.seek(0)
            output.truncate(0)

            yield header

            # Process in batches
            offset = 0
            processed_count = 0

            while offset < total_count:
                # Query batch with joins
                query = (
                    select(Application, Resume, JD)
                    .join(Resume, Application.resume_id == Resume.id)
                    .join(JD, Application.jd_id == JD.id)
                    .where(Application.user_id == user_id)
                    .offset(offset)
                    .limit(batch_size)
                )

                result = await db.execute(query)
                batch = result.all()

                for application, resume, jd in batch:
                    row_data = {
                        "id": application.id,
                        "status": application.status,
                        "match_score": application.match_score,
                        "notes": application.notes,
                        "tags": (
                            json.dumps(application.tags) if application.tags else "[]"
                        ),
                        "created_at": application.created_at.isoformat(),
                        "updated_at": application.updated_at.isoformat(),
                        "resume_title": resume.title,
                        "jd_title": jd.title,
                        "company_name": jd.company_name,
                    }

                    # Filter requested fields
                    filtered_row = {
                        k: CSVExportService._sanitize_csv_value(v)
                        for k, v in row_data.items()
                        if k in fields
                    }

                    writer.writerow(filtered_row)
                    processed_count += 1

                # Yield batch data
                batch_data = output.getvalue()
                output.seek(0)
                output.truncate(0)

                yield batch_data

                # Update progress
                if progress_callback:
                    progress = (processed_count / total_count) * 100
                    await progress_callback(
                        {
                            "processed": processed_count,
                            "total": total_count,
                            "progress": round(progress, 2),
                            "status": "processing",
                        }
                    )

                offset += batch_size

            logger.info(f"Exported {processed_count} applications for user {user_id}")

        except Exception as e:
            logger.error(f"Error exporting applications: {str(e)}")
            raise DatabaseError(f"Failed to export applications: {str(e)}") from e

    @staticmethod
    async def export_resumes(
        db: AsyncSession,
        user_id: uuid.UUID,
        fields: Optional[List[str]] = None,
        batch_size: int = 100,
        progress_callback=None,
    ) -> AsyncGenerator[str, None]:
        """
        Export resumes to CSV format with streaming and progress tracking

        Args:
            db: Database session
            user_id: User ID to filter resumes
            fields: List of fields to include (defaults to RESUME_FIELDS)
            batch_size: Number of records to process per batch
            progress_callback: Optional callback for progress updates

        Yields:
            CSV chunks as strings
        """
        try:
            if fields is None:
                fields = CSVExportService.RESUME_FIELDS

            # Validate fields
            invalid_fields = set(fields) - set(CSVExportService.RESUME_FIELDS)
            if invalid_fields:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid fields: {invalid_fields}",
                )

            # Query total count
            count_query = (
                select(func.count())
                .select_from(Resume)
                .where(Resume.user_id == user_id)
            )
            total_count_result = await db.execute(count_query)
            total_count = total_count_result.scalar() or 0

            if total_count == 0:
                logger.info(f"No resumes found for user {user_id}")
                yield ",".join(fields) + "\n"
                return

            # Create CSV buffer
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")

            # Write header
            writer.writeheader()
            header = output.getvalue()
            output.seek(0)
            output.truncate(0)

            yield header

            # Process in batches
            offset = 0
            processed_count = 0

            while offset < total_count:
                query = (
                    select(Resume)
                    .where(Resume.user_id == user_id)
                    .offset(offset)
                    .limit(batch_size)
                )

                result = await db.execute(query)
                batch = result.scalars().all()

                for resume in batch:
                    row_data = {
                        "id": resume.id,
                        "title": resume.title,
                        "file_name": resume.file_name,
                        "skills": (
                            json.dumps(resume.skills) if resume.skills else "[]"
                        ),
                        "experience_years": resume.experience_years,
                        "education_level": resume.education_level,
                        "created_at": resume.created_at.isoformat(),
                        "updated_at": resume.updated_at.isoformat(),
                    }

                    # Filter requested fields
                    filtered_row = {
                        k: CSVExportService._sanitize_csv_value(v)
                        for k, v in row_data.items()
                        if k in fields
                    }

                    writer.writerow(filtered_row)
                    processed_count += 1

                # Yield batch data
                batch_data = output.getvalue()
                output.seek(0)
                output.truncate(0)

                yield batch_data

                # Update progress
                if progress_callback:
                    progress = (processed_count / total_count) * 100
                    await progress_callback(
                        {
                            "processed": processed_count,
                            "total": total_count,
                            "progress": round(progress, 2),
                            "status": "processing",
                        }
                    )

                offset += batch_size

            logger.info(f"Exported {processed_count} resumes for user {user_id}")

        except Exception as e:
            logger.error(f"Error exporting resumes: {str(e)}")
            raise DatabaseError(f"Failed to export resumes: {str(e)}") from e

    @staticmethod
    async def export_jds(
        db: AsyncSession,
        user_id: uuid.UUID,
        fields: Optional[List[str]] = None,
        batch_size: int = 100,
        progress_callback=None,
    ) -> AsyncGenerator[str, None]:
        """
        Export job descriptions to CSV format with streaming and progress tracking

        Args:
            db: Database session
            user_id: User ID to filter JDs
            fields: List of fields to include (defaults to JD_FIELDS)
            batch_size: Number of records to process per batch
            progress_callback: Optional callback for progress updates

        Yields:
            CSV chunks as strings
        """
        try:
            if fields is None:
                fields = CSVExportService.JD_FIELDS

            # Validate fields
            invalid_fields = set(fields) - set(CSVExportService.JD_FIELDS)
            if invalid_fields:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid fields: {invalid_fields}",
                )

            # Query total count
            count_query = (
                select(func.count()).select_from(JD).where(JD.user_id == user_id)
            )
            total_count_result = await db.execute(count_query)
            total_count = total_count_result.scalar() or 0

            if total_count == 0:
                logger.info(f"No JDs found for user {user_id}")
                yield ",".join(fields) + "\n"
                return

            # Create CSV buffer
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")

            # Write header
            writer.writeheader()
            header = output.getvalue()
            output.seek(0)
            output.truncate(0)

            yield header

            # Process in batches
            offset = 0
            processed_count = 0

            while offset < total_count:
                query = (
                    select(JD)
                    .where(JD.user_id == user_id)
                    .offset(offset)
                    .limit(batch_size)
                )

                result = await db.execute(query)
                batch = result.scalars().all()

                for jd in batch:
                    row_data = {
                        "id": jd.id,
                        "title": jd.title,
                        "company_name": jd.company_name,
                        "location": jd.location,
                        "employment_type": jd.employment_type,
                        "skills_required": (
                            json.dumps(jd.skills_required)
                            if jd.skills_required
                            else "[]"
                        ),
                        "experience_required": jd.experience_required,
                        "salary_min": jd.salary_min,
                        "salary_max": jd.salary_max,
                        "created_at": jd.created_at.isoformat(),
                        "updated_at": jd.updated_at.isoformat(),
                    }

                    # Filter requested fields
                    filtered_row = {
                        k: CSVExportService._sanitize_csv_value(v)
                        for k, v in row_data.items()
                        if k in fields
                    }

                    writer.writerow(filtered_row)
                    processed_count += 1

                # Yield batch data
                batch_data = output.getvalue()
                output.seek(0)
                output.truncate(0)

                yield batch_data

                # Update progress
                if progress_callback:
                    progress = (processed_count / total_count) * 100
                    await progress_callback(
                        {
                            "processed": processed_count,
                            "total": total_count,
                            "progress": round(progress, 2),
                            "status": "processing",
                        }
                    )

                offset += batch_size

            logger.info(f"Exported {processed_count} JDs for user {user_id}")

        except Exception as e:
            logger.error(f"Error exporting JDs: {str(e)}")
            raise DatabaseError(f"Failed to export JDs: {str(e)}") from e


# Import at top level
from sqlalchemy import func
