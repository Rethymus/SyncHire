import json
import uuid
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.application import Application
from app.models.application_status_history import ApplicationStatusHistory
from app.schemas.application import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationStatusUpdate,
    BulkDeleteResponse,
)
from app.services.resume_service import ResumeService
from app.services.jd_service import JDService
from app.services.ai_service import AIService
from app.services.mcp_client import mcp_client, MCPError
from app.services.notification_service import notification_service
from app.core.errors import (
    ValidationError,
    NotFoundError,
    DatabaseError,
    handle_database_error,
)
import logging

logger = logging.getLogger(__name__)


class ApplicationService:
    @staticmethod
    async def create_application(
        db: AsyncSession,
        user_id: uuid.UUID,
        app_data: ApplicationCreate,
    ) -> Application:
        """
        Create a new application with comprehensive error handling

        Args:
            db: Database session
            user_id: User ID
            app_data: Application creation data

        Returns:
            Created application object

        Raises:
            ValidationError: If input data is invalid
            NotFoundError: If resume or JD not found
            DatabaseError: If database operation fails
        """
        try:
            # Validate input
            if not app_data.resume_id or not app_data.jd_id:
                raise ValidationError(
                    message="Resume ID and JD ID are required",
                    details={"resume_id": str(app_data.resume_id), "jd_id": str(app_data.jd_id)}
                )

            # Verify resume exists and belongs to user
            try:
                await ResumeService.get_resume(db, app_data.resume_id, user_id)
            except NotFoundError:
                logger.warning(f"Resume {app_data.resume_id} not found for user {user_id}")
                raise NotFoundError(
                    resource="Resume",
                    details={"resume_id": str(app_data.resume_id)}
                )

            # Verify JD exists and belongs to user
            try:
                await JDService.get_jd(db, app_data.jd_id, user_id)
            except NotFoundError:
                logger.warning(f"JD {app_data.jd_id} not found for user {user_id}")
                raise NotFoundError(
                    resource="Job Description",
                    details={"jd_id": str(app_data.jd_id)}
                )

            # Create application with transaction handling
            try:
                db_application = Application(
                    user_id=user_id,
                    resume_id=app_data.resume_id,
                    jd_id=app_data.jd_id,
                )

                db.add(db_application)
                await db.commit()
                await db.refresh(db_application)
                logger.info(f"Application created: {db_application.id}")

                return db_application

            except Exception as e:
                await db.rollback()
                handle_database_error(e, "application creation")

        except (ValidationError, NotFoundError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating application: {str(e)}", exc_info=True)
            raise DatabaseError(
                message="Failed to create application",
                details={"user_id": str(user_id), "error": str(e)}
            )

    @staticmethod
    async def get_applications(
        db: AsyncSession, user_id: uuid.UUID
    ) -> list[Application]:
        result = await db.execute(
            select(Application)
            .where(Application.user_id == user_id)
            .order_by(Application.created_at.desc())
        )
        applications = list(result.scalars().all())

        # Eager load status histories in single query to avoid N+1 problem
        if applications:
            app_ids = [app.id for app in applications]
            history_result = await db.execute(
                select(ApplicationStatusHistory)
                .where(ApplicationStatusHistory.application_id.in_(app_ids))
                .order_by(ApplicationStatusHistory.application_id, ApplicationStatusHistory.changed_at.desc())
            )
            histories = list(history_result.scalars().all())

            # Group histories by application
            history_map: dict[uuid.UUID, list[ApplicationStatusHistory]] = {}
            for history in histories:
                if history.application_id not in history_map:
                    history_map[history.application_id] = []
                history_map[history.application_id].append(history)

            # Assign histories to applications
            for app in applications:
                app.status_history = history_map.get(app.id, [])

        return applications

    @staticmethod
    async def get_application(
        db: AsyncSession,
        application_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Application:
        result = await db.execute(
            select(Application).where(
                Application.id == application_id,
                Application.user_id == user_id,
            )
        )
        application = result.scalar_one_or_none()

        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found",
            )

        # Load status history
        history_result = await db.execute(
            select(ApplicationStatusHistory)
            .where(ApplicationStatusHistory.application_id == application.id)
            .order_by(ApplicationStatusHistory.changed_at.desc())
        )
        application.status_history = list(history_result.scalars().all())

        return application

    @staticmethod
    async def get_match_score(
        db: AsyncSession,
        application_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> dict:
        application = await ApplicationService.get_application(
            db, application_id, user_id
        )

        if not application.resume.parsed_data or not application.jd.parsed_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume or JD not parsed yet",
            )

        resume_data = json.loads(application.resume.parsed_data)
        jd_data = json.loads(application.jd.parsed_data)

        try:
            match_details = await mcp_client.match_resume_to_jd(resume_data, jd_data)
        except MCPError:
            # Fallback to AI service
            match_details = await AIService.match_resume(
                application.resume.content or "",
                application.jd.content,
            )

        application.match_score = match_details.get("match_score", 0)
        application.match_details = json.dumps(match_details, ensure_ascii=False)
        await db.commit()

        return match_details

    @staticmethod
    async def optimize_resume(
        db: AsyncSession,
        application_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> dict:
        application = await ApplicationService.get_application(
            db, application_id, user_id
        )

        if not application.resume.parsed_data or not application.jd.parsed_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume or JD not parsed yet",
            )

        resume_data = json.loads(application.resume.parsed_data)
        jd_data = json.loads(application.jd.parsed_data)

        try:
            optimized = await mcp_client.optimize_resume(resume_data, jd_data)
        except MCPError:
            # Fallback to AI service
            parsed_jd = jd_data
            optimized = await AIService.optimize_resume(
                application.resume.content or "",
                application.jd.content,
                parsed_jd,
            )

        application.optimized_resume = json.dumps(optimized, ensure_ascii=False)
        old_status = application.status
        application.status = "optimized"
        await db.commit()
        await db.refresh(application)

        # Send notification about optimization
        await notification_service.notify_application_status_change(
            db=db,
            application=application,
            old_status=old_status,
            new_status="optimized",
            notes="Your resume has been optimized using AI."
        )

        return optimized

    @staticmethod
    async def generate_interview_prep(
        db: AsyncSession,
        application_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> dict:
        application = await ApplicationService.get_application(
            db, application_id, user_id
        )

        if not application.resume.parsed_data or not application.jd.parsed_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume or JD not parsed yet",
            )

        resume_data = json.loads(application.resume.parsed_data)
        jd_data = json.loads(application.jd.parsed_data)

        try:
            prep = await mcp_client.generate_interview_prep(resume_data, jd_data)
        except MCPError:
            # Generate basic prep using AI service
            prep = await AIService.generate_interview_prep(
                application.resume.content or "",
                application.jd.content,
            )

        return prep

    @staticmethod
    async def update_application(
        db: AsyncSession,
        application_id: uuid.UUID,
        user_id: uuid.UUID,
        app_data: ApplicationUpdate,
    ) -> Application:
        application = await ApplicationService.get_application(
            db, application_id, user_id
        )

        # Update fields if provided
        if app_data.status is not None:
            # Validate status
            valid_statuses = [
                "applied",
                "interview",
                "rejected",
                "offer",
                "optimized",
                "pending",
            ]
            if app_data.status not in valid_statuses:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
                )

            # Create status history entry
            if application.status != app_data.status:
                status_history = ApplicationStatusHistory(
                    application_id=application.id,
                    user_id=user_id,
                    old_status=application.status,
                    new_status=app_data.status,
                    notes=app_data.notes,
                )
                db.add(status_history)

            application.status = app_data.status

        if app_data.notes is not None:
            application.notes = app_data.notes

        await db.commit()
        await db.refresh(application)

        # Reload status history
        history_result = await db.execute(
            select(ApplicationStatusHistory)
            .where(ApplicationStatusHistory.application_id == application.id)
            .order_by(ApplicationStatusHistory.changed_at.desc())
        )
        application.status_history = list(history_result.scalars().all())

        return application

    @staticmethod
    async def update_application_status(
        db: AsyncSession,
        application_id: uuid.UUID,
        user_id: uuid.UUID,
        status_update: ApplicationStatusUpdate,
    ) -> Application:
        """Update application status with history tracking"""
        application = await ApplicationService.get_application(
            db, application_id, user_id
        )

        # Validate status
        valid_statuses = [
            "applied",
            "interview",
            "rejected",
            "offer",
            "optimized",
            "pending",
        ]
        if status_update.status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
            )

        # Store old status before updating
        old_status = application.status

        # Create status history entry
        status_history = ApplicationStatusHistory(
            application_id=application.id,
            user_id=user_id,
            old_status=old_status,
            new_status=status_update.status,
            notes=status_update.notes,
        )
        db.add(status_history)

        # Update application status
        application.status = status_update.status
        if status_update.notes:
            application.notes = status_update.notes

        await db.commit()
        await db.refresh(application)

        # Reload status history
        history_result = await db.execute(
            select(ApplicationStatusHistory)
            .where(ApplicationStatusHistory.application_id == application.id)
            .order_by(ApplicationStatusHistory.changed_at.desc())
        )
        application.status_history = list(history_result.scalars().all())

        # Send notification about status change
        await notification_service.notify_application_status_change(
            db=db,
            application=application,
            old_status=old_status,
            new_status=status_update.status,
            notes=status_update.notes
        )

        return application

    @staticmethod
    async def delete_application(
        db: AsyncSession,
        application_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        application = await ApplicationService.get_application(
            db, application_id, user_id
        )
        await db.delete(application)
        await db.commit()

    @staticmethod
    async def bulk_delete_applications(
        db: AsyncSession,
        user_id: uuid.UUID,
        application_ids: List[uuid.UUID],
    ) -> BulkDeleteResponse:
        """
        Bulk delete applications with comprehensive error handling and partial failure support

        Args:
            db: Database session
            user_id: User ID
            application_ids: List of application IDs to delete

        Returns:
            BulkDeleteResponse with success/failure counts and error details

        Raises:
            ValidationError: If input data is invalid
        """
        try:
            # Validate input
            if not application_ids:
                raise ValidationError(
                    message="Application IDs list cannot be empty",
                    field="application_ids"
                )

            if len(application_ids) > 100:
                raise ValidationError(
                    message="Cannot delete more than 100 applications at once",
                    field="application_ids",
                    details={"count": len(application_ids), "max": 100}
                )

            # Validate all IDs are valid UUIDs
            try:
                valid_ids = [uuid.UUID(str(app_id)) for app_id in application_ids]
            except ValueError as e:
                raise ValidationError(
                    message="Invalid application ID format",
                    field="application_ids",
                    details={"error": str(e)}
                )

            # Fetch all applications that belong to the user
            try:
                result = await db.execute(
                    select(Application).where(
                        Application.id.in_(valid_ids),
                        Application.user_id == user_id
                    )
                )
                applications = list(result.scalars().all())
                found_ids = {app.id for app in applications}

                # Identify IDs that weren't found
                missing_ids = set(valid_ids) - found_ids

                logger.info(f"Found {len(applications)} out of {len(valid_ids)} applications for user {user_id}")

            except Exception as e:
                logger.error(f"Failed to fetch applications for bulk deletion: {str(e)}", exc_info=True)
                raise DatabaseError(
                    message="Failed to fetch applications for deletion",
                    details={"user_id": str(user_id), "error": str(e)}
                )

            # Delete applications one by one to handle partial failures
            success_count = 0
            failed_count = 0
            errors = []

            for application in applications:
                try:
                    # Delete database record
                    await db.delete(application)
                    success_count += 1
                    logger.debug(f"Successfully deleted application {application.id}")

                except Exception as e:
                    failed_count += 1
                    error_msg = str(e)
                    errors.append({
                        "id": str(application.id),
                        "error": error_msg
                    })
                    logger.error(f"Failed to delete application {application.id}: {error_msg}")

            # Add missing IDs to errors
            for missing_id in missing_ids:
                failed_count += 1
                errors.append({
                    "id": str(missing_id),
                    "error": "Application not found or access denied"
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
            logger.error(f"Unexpected error during bulk application deletion: {str(e)}", exc_info=True)
            raise DatabaseError(
                message="Failed to perform bulk delete operation",
                details={"user_id": str(user_id), "error": str(e)}
            )
