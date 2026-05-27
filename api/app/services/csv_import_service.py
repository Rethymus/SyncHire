import csv
import uuid
import json
from datetime import datetime
from typing import List, Dict, Optional, AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from io import StringIO
import logging

from app.models.application import Application
from app.models.resume import Resume
from app.models.jd import JD
from app.models.user import User
from app.core.errors import DatabaseError, ValidationError

logger = logging.getLogger(__name__)


class CSVImportService:
    """Service for importing data from CSV format with validation and progress tracking"""

    @staticmethod
    def _parse_csv_value(value: str, field_type: str) -> any:
        """Parse CSV value based on field type"""
        if not value or value.strip() == "":
            return None

        if field_type in ["tags", "skills", "skills_required"]:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value.split(",") if value else []
        elif field_type in [
            "match_score",
            "experience_years",
            "experience_required",
            "salary_min",
            "salary_max",
        ]:
            try:
                return float(value)
            except ValueError:
                return None
        elif field_type in ["created_at", "updated_at"]:
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                return None
        else:
            return value.strip()

    @staticmethod
    def _validate_row(row: Dict, required_fields: List[str]) -> tuple[bool, List[str]]:
        """Validate a CSV row and return (is_valid, error_messages)"""
        errors = []

        for field in required_fields:
            if field not in row or not row[field].strip():
                errors.append(f"Missing required field: {field}")

        return len(errors) == 0, errors

    @staticmethod
    async def import_applications(
        db: AsyncSession,
        user_id: uuid.UUID,
        csv_data: str,
        batch_size: int = 50,
        on_duplicate: str = "skip",
        progress_callback=None,
    ) -> AsyncGenerator[Dict, None]:
        """
        Import applications from CSV format with validation and progress tracking

        Args:
            db: Database session
            user_id: User ID to assign imported applications
            csv_data: CSV data as string
            batch_size: Number of records to process per batch
            on_duplicate: Strategy for handling duplicates ('skip', 'update', 'error')
            progress_callback: Optional callback for progress updates

        Yields:
            Import progress updates
        """
        try:
            # Parse CSV
            csv_reader = csv.DictReader(StringIO(csv_data))
            rows = list(csv_reader)

            if not rows:
                yield {
                    "status": "error",
                    "message": "CSV file is empty",
                    "processed": 0,
                    "total": 0,
                    "errors": [],
                }
                return

            total_rows = len(rows)
            processed_count = 0
            success_count = 0
            error_count = 0
            validation_errors = []

            # Process in batches
            for i in range(0, total_rows, batch_size):
                batch = rows[i : i + batch_size]
                batch_results = []

                for row_num, row in enumerate(batch, start=i + 1):
                    try:
                        # Validate required fields
                        required_fields = ["resume_title", "jd_title"]
                        is_valid, errors = CSVImportService._validate_row(
                            row, required_fields
                        )

                        if not is_valid:
                            error_count += 1
                            validation_errors.extend(
                                [f"Row {row_num}: {error}" for error in errors]
                            )
                            batch_results.append(
                                {"row": row_num, "status": "error", "errors": errors}
                            )
                            continue

                        # Find related resume and JD
                        resume_query = (
                            select(Resume)
                            .where(Resume.user_id == user_id)
                            .where(Resume.title == row["resume_title"])
                            .limit(1)
                        )
                        resume_result = await db.execute(resume_query)
                        resume = resume_result.scalar_one_or_none()

                        if not resume:
                            error_count += 1
                            error_msg = f"Row {row_num}: Resume not found: {row['resume_title']}"
                            validation_errors.append(error_msg)
                            batch_results.append(
                                {
                                    "row": row_num,
                                    "status": "error",
                                    "errors": [error_msg],
                                }
                            )
                            continue

                        jd_query = (
                            select(JD)
                            .where(JD.user_id == user_id)
                            .where(JD.title == row["jd_title"])
                            .limit(1)
                        )
                        jd_result = await db.execute(jd_query)
                        jd = jd_result.scalar_one_or_none()

                        if not jd:
                            error_count += 1
                            error_msg = (
                                f"Row {row_num}: JD not found: {row['jd_title']}"
                            )
                            validation_errors.append(error_msg)
                            batch_results.append(
                                {
                                    "row": row_num,
                                    "status": "error",
                                    "errors": [error_msg],
                                }
                            )
                            continue

                        # Check for existing application
                        existing_query = (
                            select(Application)
                            .where(Application.user_id == user_id)
                            .where(Application.resume_id == resume.id)
                            .where(Application.jd_id == jd.id)
                            .limit(1)
                        )
                        existing_result = await db.execute(existing_query)
                        existing = existing_result.scalar_one_or_none()

                        if existing:
                            if on_duplicate == "skip":
                                batch_results.append(
                                    {
                                        "row": row_num,
                                        "status": "skipped",
                                        "reason": "duplicate",
                                    }
                                )
                                continue
                            elif on_duplicate == "error":
                                error_count += 1
                                error_msg = f"Row {row_num}: Application already exists"
                                validation_errors.append(error_msg)
                                batch_results.append(
                                    {
                                        "row": row_num,
                                        "status": "error",
                                        "errors": [error_msg],
                                    }
                                )
                                continue
                            elif on_duplicate == "update":
                                # Update existing application
                                if "status" in row and row["status"]:
                                    existing.status = row["status"]
                                if "notes" in row:
                                    existing.notes = (
                                        row["notes"] if row["notes"] else None
                                    )
                                if "tags" in row and row["tags"]:
                                    existing.tags = CSVImportService._parse_csv_value(
                                        row["tags"], "tags"
                                    )
                                if "match_score" in row and row["match_score"]:
                                    existing.match_score = (
                                        CSVImportService._parse_csv_value(
                                            row["match_score"], "match_score"
                                        )
                                    )

                                existing.updated_at = datetime.utcnow()
                                batch_results.append(
                                    {
                                        "row": row_num,
                                        "status": "updated",
                                        "id": str(existing.id),
                                    }
                                )
                                success_count += 1
                                continue

                        # Create new application
                        application = Application(
                            user_id=user_id,
                            resume_id=resume.id,
                            jd_id=jd.id,
                            status=row.get("status", "pending"),
                            match_score=CSVImportService._parse_csv_value(
                                row.get("match_score", ""), "match_score"
                            ),
                            notes=row.get("notes") if row.get("notes") else None,
                            tags=CSVImportService._parse_csv_value(
                                row.get("tags", "[]"), "tags"
                            ),
                        )

                        db.add(application)
                        await db.flush()

                        success_count += 1
                        batch_results.append(
                            {
                                "row": row_num,
                                "status": "created",
                                "id": str(application.id),
                            }
                        )

                    except Exception as e:
                        error_count += 1
                        error_msg = f"Row {row_num}: {str(e)}"
                        validation_errors.append(error_msg)
                        batch_results.append(
                            {"row": row_num, "status": "error", "errors": [str(e)]}
                        )

                # Commit batch
                await db.commit()
                processed_count += len(batch)

                # Update progress
                if progress_callback:
                    progress = (processed_count / total_rows) * 100
                    await progress_callback(
                        {
                            "processed": processed_count,
                            "total": total_rows,
                            "progress": round(progress, 2),
                            "status": "processing",
                            "success": success_count,
                            "errors": error_count,
                        }
                    )

                yield {
                    "status": "processing",
                    "processed": processed_count,
                    "total": total_rows,
                    "success": success_count,
                    "errors": error_count,
                    "batch_results": batch_results,
                }

            # Final summary
            yield {
                "status": "completed",
                "processed": processed_count,
                "total": total_rows,
                "success": success_count,
                "errors": error_count,
                "validation_errors": validation_errors[-10:],  # Last 10 errors
            }

            logger.info(
                f"Imported {success_count} applications for user {user_id} with {error_count} errors"
            )

        except Exception as e:
            logger.error(f"Error importing applications: {str(e)}")
            await db.rollback()
            yield {
                "status": "error",
                "message": f"Failed to import applications: {str(e)}",
                "processed": processed_count,
                "total": total_rows,
                "errors": [str(e)],
            }

    @staticmethod
    async def import_resumes(
        db: AsyncSession,
        user_id: uuid.UUID,
        csv_data: str,
        batch_size: int = 50,
        on_duplicate: str = "skip",
        progress_callback=None,
    ) -> AsyncGenerator[Dict, None]:
        """
        Import resumes from CSV format with validation and progress tracking

        Args:
            db: Database session
            user_id: User ID to assign imported resumes
            csv_data: CSV data as string
            batch_size: Number of records to process per batch
            on_duplicate: Strategy for handling duplicates ('skip', 'update', 'error')
            progress_callback: Optional callback for progress updates

        Yields:
            Import progress updates
        """
        try:
            # Parse CSV
            csv_reader = csv.DictReader(StringIO(csv_data))
            rows = list(csv_reader)

            if not rows:
                yield {
                    "status": "error",
                    "message": "CSV file is empty",
                    "processed": 0,
                    "total": 0,
                    "errors": [],
                }
                return

            total_rows = len(rows)
            processed_count = 0
            success_count = 0
            error_count = 0
            validation_errors = []

            # Process in batches
            for i in range(0, total_rows, batch_size):
                batch = rows[i : i + batch_size]
                batch_results = []

                for row_num, row in enumerate(batch, start=i + 1):
                    try:
                        # Validate required fields
                        required_fields = ["title"]
                        is_valid, errors = CSVImportService._validate_row(
                            row, required_fields
                        )

                        if not is_valid:
                            error_count += 1
                            validation_errors.extend(
                                [f"Row {row_num}: {error}" for error in errors]
                            )
                            batch_results.append(
                                {"row": row_num, "status": "error", "errors": errors}
                            )
                            continue

                        # Check for existing resume
                        existing_query = (
                            select(Resume)
                            .where(Resume.user_id == user_id)
                            .where(Resume.title == row["title"])
                            .limit(1)
                        )
                        existing_result = await db.execute(existing_query)
                        existing = existing_result.scalar_one_or_none()

                        if existing:
                            if on_duplicate == "skip":
                                batch_results.append(
                                    {
                                        "row": row_num,
                                        "status": "skipped",
                                        "reason": "duplicate",
                                    }
                                )
                                continue
                            elif on_duplicate == "error":
                                error_count += 1
                                error_msg = f"Row {row_num}: Resume already exists"
                                validation_errors.append(error_msg)
                                batch_results.append(
                                    {
                                        "row": row_num,
                                        "status": "error",
                                        "errors": [error_msg],
                                    }
                                )
                                continue
                            elif on_duplicate == "update":
                                # Update existing resume
                                if "file_name" in row and row["file_name"]:
                                    existing.file_name = row["file_name"]
                                if "skills" in row and row["skills"]:
                                    existing.skills = CSVImportService._parse_csv_value(
                                        row["skills"], "skills"
                                    )
                                if (
                                    "experience_years" in row
                                    and row["experience_years"]
                                ):
                                    existing.experience_years = (
                                        CSVImportService._parse_csv_value(
                                            row["experience_years"], "experience_years"
                                        )
                                    )
                                if "education_level" in row and row["education_level"]:
                                    existing.education_level = row["education_level"]

                                existing.updated_at = datetime.utcnow()
                                batch_results.append(
                                    {
                                        "row": row_num,
                                        "status": "updated",
                                        "id": str(existing.id),
                                    }
                                )
                                success_count += 1
                                continue

                        # Create new resume (minimal - file upload required separately)
                        resume = Resume(
                            user_id=user_id,
                            title=row["title"],
                            file_name=row.get("file_name", "imported_resume.pdf"),
                            skills=CSVImportService._parse_csv_value(
                                row.get("skills", "[]"), "skills"
                            ),
                            experience_years=CSVImportService._parse_csv_value(
                                row.get("experience_years", ""), "experience_years"
                            ),
                            education_level=row.get("education_level"),
                        )

                        db.add(resume)
                        await db.flush()

                        success_count += 1
                        batch_results.append(
                            {"row": row_num, "status": "created", "id": str(resume.id)}
                        )

                    except Exception as e:
                        error_count += 1
                        error_msg = f"Row {row_num}: {str(e)}"
                        validation_errors.append(error_msg)
                        batch_results.append(
                            {"row": row_num, "status": "error", "errors": [str(e)]}
                        )

                # Commit batch
                await db.commit()
                processed_count += len(batch)

                # Update progress
                if progress_callback:
                    progress = (processed_count / total_rows) * 100
                    await progress_callback(
                        {
                            "processed": processed_count,
                            "total": total_rows,
                            "progress": round(progress, 2),
                            "status": "processing",
                            "success": success_count,
                            "errors": error_count,
                        }
                    )

                yield {
                    "status": "processing",
                    "processed": processed_count,
                    "total": total_rows,
                    "success": success_count,
                    "errors": error_count,
                    "batch_results": batch_results,
                }

            # Final summary
            yield {
                "status": "completed",
                "processed": processed_count,
                "total": total_rows,
                "success": success_count,
                "errors": error_count,
                "validation_errors": validation_errors[-10:],  # Last 10 errors
            }

            logger.info(
                f"Imported {success_count} resumes for user {user_id} with {error_count} errors"
            )

        except Exception as e:
            logger.error(f"Error importing resumes: {str(e)}")
            await db.rollback()
            yield {
                "status": "error",
                "message": f"Failed to import resumes: {str(e)}",
                "processed": processed_count,
                "total": total_rows,
                "errors": [str(e)],
            }

    @staticmethod
    async def import_jds(
        db: AsyncSession,
        user_id: uuid.UUID,
        csv_data: str,
        batch_size: int = 50,
        on_duplicate: str = "skip",
        progress_callback=None,
    ) -> AsyncGenerator[Dict, None]:
        """
        Import job descriptions from CSV format with validation and progress tracking

        Args:
            db: Database session
            user_id: User ID to assign imported JDs
            csv_data: CSV data as string
            batch_size: Number of records to process per batch
            on_duplicate: Strategy for handling duplicates ('skip', 'update', 'error')
            progress_callback: Optional callback for progress updates

        Yields:
            Import progress updates
        """
        try:
            # Parse CSV
            csv_reader = csv.DictReader(StringIO(csv_data))
            rows = list(csv_reader)

            if not rows:
                yield {
                    "status": "error",
                    "message": "CSV file is empty",
                    "processed": 0,
                    "total": 0,
                    "errors": [],
                }
                return

            total_rows = len(rows)
            processed_count = 0
            success_count = 0
            error_count = 0
            validation_errors = []

            # Process in batches
            for i in range(0, total_rows, batch_size):
                batch = rows[i : i + batch_size]
                batch_results = []

                for row_num, row in enumerate(batch, start=i + 1):
                    try:
                        # Validate required fields
                        required_fields = ["title", "company_name"]
                        is_valid, errors = CSVImportService._validate_row(
                            row, required_fields
                        )

                        if not is_valid:
                            error_count += 1
                            validation_errors.extend(
                                [f"Row {row_num}: {error}" for error in errors]
                            )
                            batch_results.append(
                                {"row": row_num, "status": "error", "errors": errors}
                            )
                            continue

                        # Check for existing JD
                        existing_query = (
                            select(JD)
                            .where(JD.user_id == user_id)
                            .where(JD.title == row["title"])
                            .where(JD.company_name == row["company_name"])
                            .limit(1)
                        )
                        existing_result = await db.execute(existing_query)
                        existing = existing_result.scalar_one_or_none()

                        if existing:
                            if on_duplicate == "skip":
                                batch_results.append(
                                    {
                                        "row": row_num,
                                        "status": "skipped",
                                        "reason": "duplicate",
                                    }
                                )
                                continue
                            elif on_duplicate == "error":
                                error_count += 1
                                error_msg = f"Row {row_num}: JD already exists"
                                validation_errors.append(error_msg)
                                batch_results.append(
                                    {
                                        "row": row_num,
                                        "status": "error",
                                        "errors": [error_msg],
                                    }
                                )
                                continue
                            elif on_duplicate == "update":
                                # Update existing JD
                                if "location" in row and row["location"]:
                                    existing.location = row["location"]
                                if "employment_type" in row and row["employment_type"]:
                                    existing.employment_type = row["employment_type"]
                                if "skills_required" in row and row["skills_required"]:
                                    existing.skills_required = (
                                        CSVImportService._parse_csv_value(
                                            row["skills_required"], "skills_required"
                                        )
                                    )
                                if (
                                    "experience_required" in row
                                    and row["experience_required"]
                                ):
                                    existing.experience_required = (
                                        CSVImportService._parse_csv_value(
                                            row["experience_required"],
                                            "experience_required",
                                        )
                                    )
                                if "salary_min" in row and row["salary_min"]:
                                    existing.salary_min = (
                                        CSVImportService._parse_csv_value(
                                            row["salary_min"], "salary_min"
                                        )
                                    )
                                if "salary_max" in row and row["salary_max"]:
                                    existing.salary_max = (
                                        CSVImportService._parse_csv_value(
                                            row["salary_max"], "salary_max"
                                        )
                                    )

                                existing.updated_at = datetime.utcnow()
                                batch_results.append(
                                    {
                                        "row": row_num,
                                        "status": "updated",
                                        "id": str(existing.id),
                                    }
                                )
                                success_count += 1
                                continue

                        # Create new JD
                        jd = JD(
                            user_id=user_id,
                            title=row["title"],
                            company_name=row["company_name"],
                            location=row.get("location"),
                            employment_type=row.get("employment_type"),
                            skills_required=CSVImportService._parse_csv_value(
                                row.get("skills_required", "[]"), "skills_required"
                            ),
                            experience_required=CSVImportService._parse_csv_value(
                                row.get("experience_required", ""),
                                "experience_required",
                            ),
                            salary_min=CSVImportService._parse_csv_value(
                                row.get("salary_min", ""), "salary_min"
                            ),
                            salary_max=CSVImportService._parse_csv_value(
                                row.get("salary_max", ""), "salary_max"
                            ),
                        )

                        db.add(jd)
                        await db.flush()

                        success_count += 1
                        batch_results.append(
                            {"row": row_num, "status": "created", "id": str(jd.id)}
                        )

                    except Exception as e:
                        error_count += 1
                        error_msg = f"Row {row_num}: {str(e)}"
                        validation_errors.append(error_msg)
                        batch_results.append(
                            {"row": row_num, "status": "error", "errors": [str(e)]}
                        )

                # Commit batch
                await db.commit()
                processed_count += len(batch)

                # Update progress
                if progress_callback:
                    progress = (processed_count / total_rows) * 100
                    await progress_callback(
                        {
                            "processed": processed_count,
                            "total": total_rows,
                            "progress": round(progress, 2),
                            "status": "processing",
                            "success": success_count,
                            "errors": error_count,
                        }
                    )

                yield {
                    "status": "processing",
                    "processed": processed_count,
                    "total": total_rows,
                    "success": success_count,
                    "errors": error_count,
                    "batch_results": batch_results,
                }

            # Final summary
            yield {
                "status": "completed",
                "processed": processed_count,
                "total": total_rows,
                "success": success_count,
                "errors": error_count,
                "validation_errors": validation_errors[-10:],  # Last 10 errors
            }

            logger.info(
                f"Imported {success_count} JDs for user {user_id} with {error_count} errors"
            )

        except Exception as e:
            logger.error(f"Error importing JDs: {str(e)}")
            await db.rollback()
            yield {
                "status": "error",
                "message": f"Failed to import JDs: {str(e)}",
                "processed": processed_count,
                "total": total_rows,
                "errors": [str(e)],
            }
