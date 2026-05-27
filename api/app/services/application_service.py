import json
import uuid
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status
from app.models.application import Application
from app.models.application_status_history import ApplicationStatusHistory
from app.schemas.application import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationStatusUpdate,
    BulkDeleteResponse,
    BulkTagRequest,
    BulkTagResponse,
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
                    details={
                        "resume_id": str(app_data.resume_id),
                        "jd_id": str(app_data.jd_id),
                    },
                )

            # Verify resume exists and belongs to user
            try:
                await ResumeService.get_resume(db, app_data.resume_id, user_id)
            except NotFoundError:
                logger.warning(
                    f"Resume {app_data.resume_id} not found for user {user_id}"
                )
                raise NotFoundError(
                    resource="Resume", details={"resume_id": str(app_data.resume_id)}
                )

            # Verify JD exists and belongs to user
            try:
                await JDService.get_jd(db, app_data.jd_id, user_id)
            except NotFoundError:
                logger.warning(f"JD {app_data.jd_id} not found for user {user_id}")
                raise NotFoundError(
                    resource="Job Description", details={"jd_id": str(app_data.jd_id)}
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
            logger.error(
                f"Unexpected error creating application: {str(e)}", exc_info=True
            )
            raise DatabaseError(
                message="Failed to create application",
                details={"user_id": str(user_id), "error": str(e)},
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
                .order_by(
                    ApplicationStatusHistory.application_id,
                    ApplicationStatusHistory.changed_at.desc(),
                )
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
    async def get_applications_paginated(
        db: AsyncSession, user_id: uuid.UUID, page: int = 1, page_size: int = 20
    ) -> tuple[list[Application], int]:
        """
        Get paginated applications for a user with eager loading of status histories.

        Args:
            db: Database session
            user_id: User ID
            page: Page number (1-indexed)
            page_size: Number of items per page

        Returns:
            Tuple of (applications list, total count)
        """
        # Get total count
        count_result = await db.execute(
            select(func.count(Application.id)).where(Application.user_id == user_id)
        )
        total = count_result.scalar() or 0

        # Get paginated results
        offset = (page - 1) * page_size
        result = await db.execute(
            select(Application)
            .where(Application.user_id == user_id)
            .order_by(Application.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        applications = list(result.scalars().all())

        # Eager load status histories in single query to avoid N+1 problem
        if applications:
            app_ids = [app.id for app in applications]
            history_result = await db.execute(
                select(ApplicationStatusHistory)
                .where(ApplicationStatusHistory.application_id.in_(app_ids))
                .order_by(
                    ApplicationStatusHistory.application_id,
                    ApplicationStatusHistory.changed_at.desc(),
                )
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

        logger.info(
            f"Retrieved {len(applications)} applications for user {user_id} "
            f"(page {page}, page_size {page_size}, total {total})"
        )
        return applications, total

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
        async_processing: bool = True,
    ) -> dict | str:
        """
        Optimize resume for a specific job application.

        Args:
            db: Database session
            application_id: Application ID
            user_id: User ID
            async_processing: If True, submit as async task and return task_id

        Returns:
            Optimization result if async_processing=False, task_id if True
        """
        application = await ApplicationService.get_application(
            db, application_id, user_id
        )

        if not application.resume.parsed_data or not application.jd.parsed_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume or JD not parsed yet",
            )

        if async_processing:
            # Submit async optimization task
            from app.services.task_service import TaskService

            task = await TaskService.submit_task(
                db=db,
                user_id=user_id,
                task_type="resume_optimization",
                input_data={
                    "application_id": str(application_id),
                    "resume_content": application.resume.content,
                    "resume_parsed": application.resume.parsed_data,
                    "jd_content": application.jd.content,
                    "jd_parsed": application.jd.parsed_data,
                },
                priority="high",
            )

            return {
                "task_id": str(task.id),
                "message": "Resume optimization is being processed in background. "
                          "Use the task_id to check status and retrieve results.",
            }

        # Synchronous processing (original behavior)
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
            notes="Your resume has been optimized using AI.",
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
            notes=status_update.notes,
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
                    field="application_ids",
                )

            if len(application_ids) > 100:
                raise ValidationError(
                    message="Cannot delete more than 100 applications at once",
                    field="application_ids",
                    details={"count": len(application_ids), "max": 100},
                )

            # Validate all IDs are valid UUIDs
            try:
                valid_ids = [uuid.UUID(str(app_id)) for app_id in application_ids]
            except ValueError as e:
                raise ValidationError(
                    message="Invalid application ID format",
                    field="application_ids",
                    details={"error": str(e)},
                )

            # Fetch all applications that belong to the user
            try:
                result = await db.execute(
                    select(Application).where(
                        Application.id.in_(valid_ids), Application.user_id == user_id
                    )
                )
                applications = list(result.scalars().all())
                found_ids = {app.id for app in applications}

                # Identify IDs that weren't found
                missing_ids = set(valid_ids) - found_ids

                logger.info(
                    f"Found {len(applications)} out of {len(valid_ids)} applications for user {user_id}"
                )

            except Exception as e:
                logger.error(
                    f"Failed to fetch applications for bulk deletion: {str(e)}",
                    exc_info=True,
                )
                raise DatabaseError(
                    message="Failed to fetch applications for deletion",
                    details={"user_id": str(user_id), "error": str(e)},
                )

            # Use bulk delete for better performance (single DELETE statement)
            # This is much faster than individual deletes and reduces transaction overhead
            success_count = 0
            failed_count = 0
            errors = []

            try:
                # Bulk delete using SQLAlchemy core (more efficient than ORM)
                from sqlalchemy import delete as sql_delete

                delete_stmt = sql_delete(Application).where(
                    Application.id.in_(found_ids)
                )
                result = await db.execute(delete_stmt)
                success_count = result.rowcount
                logger.info(
                    f"Bulk deleted {success_count} applications in single operation"
                )

            except Exception as e:
                # Fallback to individual deletes if bulk delete fails
                logger.warning(
                    f"Bulk delete failed, falling back to individual deletes: {str(e)}"
                )
                for application in applications:
                    try:
                        await db.delete(application)
                        success_count += 1
                        logger.debug(f"Successfully deleted application {application.id}")
                    except Exception as individual_error:
                        failed_count += 1
                        error_msg = str(individual_error)
                        errors.append({"id": str(application.id), "error": error_msg})
                        logger.error(
                            f"Failed to delete application {application.id}: {error_msg}"
                        )

            # Add missing IDs to errors
            for missing_id in missing_ids:
                failed_count += 1
                errors.append(
                    {
                        "id": str(missing_id),
                        "error": "Application not found or access denied",
                    }
                )

            # Commit transaction if at least one deletion succeeded
            if success_count > 0:
                try:
                    await db.commit()
                    logger.info(
                        f"Bulk delete completed: {success_count} succeeded, {failed_count} failed"
                    )
                except Exception as e:
                    await db.rollback()
                    logger.error(
                        f"Failed to commit bulk delete transaction: {str(e)}",
                        exc_info=True,
                    )
                    raise DatabaseError(
                        message="Failed to commit bulk delete operation",
                        details={"error": str(e)},
                    )

            return BulkDeleteResponse(
                success_count=success_count, failed_count=failed_count, errors=errors
            )

        except (ValidationError, DatabaseError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error during bulk application deletion: {str(e)}",
                exc_info=True,
            )
            raise DatabaseError(
                message="Failed to perform bulk delete operation",
                details={"user_id": str(user_id), "error": str(e)},
            )

    @staticmethod
    async def bulk_update_applications(
        db: AsyncSession,
        user_id: uuid.UUID,
        updates: List[dict],
        allow_partial_failures: bool = True,
    ) -> dict:
        """
        Bulk update applications with partial failure support.

        Args:
            db: Database session
            user_id: User ID
            updates: List of update dicts, each containing 'id' and fields to update
            allow_partial_failures: If True, continue on failures;
                                 if False, stop on first error

        Returns:
            Dictionary with:
                - success_count: Number of successfully updated applications
                - failed_count: Number of failed updates
                - errors: List of error details for failed updates

        Raises:
            ValidationError: If input data is invalid
            DatabaseError: If database operation fails critically

        Example:
            updates = [
                {"id": "uuid1", "status": "applied", "notes": "Applied via LinkedIn"},
                {"id": "uuid2", "match_score": 85.5},
                {"id": "uuid3", "status": "interview"}
            ]
        """
        try:
            # Validate input
            if not updates:
                raise ValidationError(
                    message="Updates list cannot be empty",
                    field="updates",
                )

            if len(updates) > 100:
                raise ValidationError(
                    message="Cannot update more than 100 applications at once",
                    field="updates",
                    details={"count": len(updates), "max": 100},
                )

            # Validate all update items have required fields
            valid_statuses = [
                "applied",
                "interview",
                "rejected",
                "offer",
                "optimized",
                "pending",
            ]

            valid_updates = []
            for i, update in enumerate(updates):
                if not isinstance(update, dict):
                    raise ValidationError(
                        message=f"Update at index {i} must be a dictionary",
                        field="updates",
                        details={"index": i, "type": type(update).__name__},
                    )

                if "id" not in update:
                    raise ValidationError(
                        message=f"Update at index {i} missing required field 'id'",
                        field="updates",
                        details={"index": i, "update": update},
                    )

                # Validate that at least one field is being updated
                update_fields = set(update.keys()) - {"id"}
                if not update_fields:
                    raise ValidationError(
                        message=f"Update at index {i} has no fields to update",
                        field="updates",
                        details={"index": i, "update": update},
                    )

                # Validate fields being updated
                invalid_fields = update_fields - {"status", "notes", "match_score"}
                if invalid_fields:
                    raise ValidationError(
                        message=f"Update at index {i} contains invalid fields",
                        field="updates",
                        details={
                            "index": i,
                            "invalid_fields": list(invalid_fields),
                            "valid_fields": ["status", "notes", "match_score"],
                        },
                    )

                # Validate status if provided
                if "status" in update and update["status"] not in valid_statuses:
                    raise ValidationError(
                        message=f"Invalid status at index {i}",
                        field="updates",
                        details={
                            "index": i,
                            "status": update["status"],
                            "valid_statuses": valid_statuses,
                        },
                    )

                # Validate match_score if provided
                if "match_score" in update:
                    score = update["match_score"]
                    if not isinstance(score, (int, float)) or not (0 <= score <= 100):
                        raise ValidationError(
                            message=(
                                f"Invalid match_score at index {i}. "
                                f"Must be between 0 and 100"
                            ),
                            field="updates",
                            details={"index": i, "match_score": score},
                        )

                # Validate UUID format
                try:
                    update_id = uuid.UUID(str(update["id"]))
                    update_data = {k: v for k, v in update.items() if k != "id"}
                    valid_updates.append({"id": update_id, **update_data})
                except ValueError as e:
                    raise ValidationError(
                        message=f"Invalid application ID format at index {i}",
                        field="updates",
                        details={"index": i, "id": update["id"], "error": str(e)},
                    )

            # Extract all application IDs
            application_ids = [update["id"] for update in valid_updates]

            logger.info(
                f"Processing bulk update for {len(application_ids)} "
                f"applications for user {user_id}"
            )

            # Fetch all applications that belong to the user
            try:
                result = await db.execute(
                    select(Application).where(
                        Application.id.in_(application_ids),
                        Application.user_id == user_id,
                    )
                )
                applications = list(result.scalars().all())
                found_ids = {app.id for app in applications}

                # Identify IDs that weren't found
                missing_ids = set(application_ids) - found_ids

                logger.info(
                    f"Found {len(applications)} out of {len(application_ids)} "
                    f"applications for user {user_id}"
                )

            except Exception as e:
                logger.error(
                    f"Failed to fetch applications for bulk update: {str(e)}",
                    exc_info=True,
                )
                raise DatabaseError(
                    message="Failed to fetch applications for update",
                    details={"user_id": str(user_id), "error": str(e)},
                )

            # Process updates
            success_count = 0
            failed_count = 0
            errors = []

            # Create a mapping of application ID to application object
            app_map = {app.id: app for app in applications}

            # Process each update
            for update_data in valid_updates:
                app_id = update_data["id"]
                update_fields = {k: v for k, v in update_data.items() if k != "id"}

                try:
                    application = app_map.get(app_id)

                    if not application:
                        # Application not found or access denied
                        failed_count += 1
                        errors.append(
                            {
                                "id": str(app_id),
                                "error": "Application not found or access denied",
                            }
                        )
                        logger.warning(
                            f"Application {app_id} not found for user {user_id}"
                        )

                        if not allow_partial_failures:
                            raise ValidationError(
                                message=f"Application {app_id} not found",
                                details={"id": str(app_id)},
                            )
                        continue

                    # Store old status for history tracking
                    old_status = application.status

                    # Update fields
                    if "status" in update_fields:
                        application.status = update_fields["status"]

                    if "notes" in update_fields:
                        application.notes = update_fields["notes"]

                    if "match_score" in update_fields:
                        application.match_score = float(update_fields["match_score"])

                    # Create status history entry if status changed
                    if "status" in update_fields and application.status != old_status:
                        status_history = ApplicationStatusHistory(
                            application_id=application.id,
                            user_id=user_id,
                            old_status=old_status,
                            new_status=application.status,
                            notes=update_fields.get("notes"),
                        )
                        db.add(status_history)
                        logger.info(
                            f"Status change for application {app_id}: "
                            f"{old_status} -> {application.status}"
                        )

                    success_count += 1
                    logger.debug(
                        f"Successfully updated application {app_id}: {update_fields}"
                    )

                except Exception as e:
                    failed_count += 1
                    error_msg = str(e)
                    errors.append({"id": str(app_id), "error": error_msg})
                    logger.error(f"Failed to update application {app_id}: {error_msg}")

                    if not allow_partial_failures:
                        # Rollback any changes made so far
                        await db.rollback()
                        raise DatabaseError(
                            message="Bulk update failed due to error",
                            details={"id": str(app_id), "error": error_msg},
                        )

            # Add missing IDs to errors
            for missing_id in missing_ids:
                failed_count += 1
                errors.append(
                    {
                        "id": str(missing_id),
                        "error": "Application not found or access denied",
                    }
                )

            # Commit transaction if at least one update succeeded
            if success_count > 0:
                try:
                    await db.commit()
                    logger.info(
                        f"Bulk update completed: {success_count} succeeded, "
                        f"{failed_count} failed"
                    )
                except Exception as e:
                    await db.rollback()
                    logger.error(
                        f"Failed to commit bulk update transaction: {str(e)}",
                        exc_info=True,
                    )
                    raise DatabaseError(
                        message="Failed to commit bulk update operation",
                        details={"error": str(e)},
                    )

            return {
                "success_count": success_count,
                "failed_count": failed_count,
                "errors": errors,
            }

        except (ValidationError, DatabaseError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error during bulk application update: {str(e)}",
                exc_info=True,
            )
            raise DatabaseError(
                message="Failed to perform bulk update operation",
                details={"user_id": str(user_id), "error": str(e)},
            )

    @staticmethod
    async def bulk_tag_applications(
        db: AsyncSession,
        user_id: uuid.UUID,
        request: BulkTagRequest,
    ) -> BulkTagResponse:
        """
        Bulk tag applications with comprehensive error handling and partial failure support

        Args:
            db: Database session
            user_id: User ID
            request: BulkTagRequest with ids, tags, and operation type

        Returns:
            BulkTagResponse with success/failure counts and error details

        Raises:
            ValidationError: If input data is invalid
            DatabaseError: If database operation fails critically
        """
        try:
            # Validate input
            if not request.ids:
                raise ValidationError(
                    message="Application IDs list cannot be empty",
                    field="ids",
                )

            if len(request.ids) > 100:
                raise ValidationError(
                    message="Cannot tag more than 100 applications at once",
                    field="ids",
                    details={"count": len(request.ids), "max": 100},
                )

            if not request.tags:
                raise ValidationError(
                    message="Tags list cannot be empty",
                    field="tags",
                )

            # Validate operation type
            valid_operations = ["add", "remove", "replace"]
            if request.operation not in valid_operations:
                raise ValidationError(
                    message=f"Invalid operation type: {request.operation}",
                    field="operation",
                    details={"valid_operations": valid_operations},
                )

            # Validate all IDs are valid UUIDs
            try:
                valid_ids = [uuid.UUID(str(app_id)) for app_id in request.ids]
            except ValueError as e:
                raise ValidationError(
                    message="Invalid application ID format",
                    field="ids",
                    details={"error": str(e)},
                )

            # Validate tags (sanitize and validate format)
            valid_tags = []
            for tag in request.tags:
                if not isinstance(tag, str):
                    raise ValidationError(
                        message="All tags must be strings",
                        field="tags",
                        details={"tag": tag, "type": type(tag).__name__},
                    )
                # Remove whitespace and validate
                tag = tag.strip()
                if not tag:
                    continue  # Skip empty tags
                if len(tag) > 50:  # Reasonable tag length limit
                    raise ValidationError(
                        message="Tag length exceeds maximum of 50 characters",
                        field="tags",
                        details={"tag": tag, "length": len(tag)},
                    )
                valid_tags.append(tag)

            if not valid_tags:
                raise ValidationError(
                    message="No valid tags provided after sanitization",
                    field="tags",
                )

            logger.info(
                f"Processing bulk {request.operation} tag operation for {len(valid_ids)} "
                f"applications with tags {valid_tags} for user {user_id}"
            )

            # Fetch all applications that belong to the user
            try:
                result = await db.execute(
                    select(Application).where(
                        Application.id.in_(valid_ids),
                        Application.user_id == user_id,
                    )
                )
                applications = list(result.scalars().all())
                found_ids = {app.id for app in applications}

                # Identify IDs that weren't found
                missing_ids = set(valid_ids) - found_ids

                logger.info(
                    f"Found {len(applications)} out of {len(valid_ids)} applications for user {user_id}"
                )

            except Exception as e:
                logger.error(
                    f"Failed to fetch applications for bulk tagging: {str(e)}",
                    exc_info=True,
                )
                raise DatabaseError(
                    message="Failed to fetch applications for tagging",
                    details={"user_id": str(user_id), "error": str(e)},
                )

            # Process tagging operations
            success_count = 0
            failed_count = 0
            errors = []

            # Create a mapping of application ID to application object
            app_map = {app.id: app for app in applications}

            # Process each application
            for app_id in valid_ids:
                try:
                    application = app_map.get(app_id)

                    if not application:
                        # Application not found or access denied
                        failed_count += 1
                        errors.append(
                            {
                                "id": str(app_id),
                                "error": "Application not found or access denied",
                            }
                        )
                        logger.warning(f"Application {app_id} not found for user {user_id}")
                        continue

                    # Get current tags (ensure it's a list)
                    current_tags = list(application.tags) if application.tags else []

                    # Apply the requested operation
                    if request.operation == "add":
                        # Add new tags without duplicates
                        new_tags = list(set(current_tags + valid_tags))
                        application.tags = new_tags
                        logger.info(
                            f"Added tags {valid_tags} to application {app_id}. "
                            f"New tags: {new_tags}"
                        )

                    elif request.operation == "remove":
                        # Remove specified tags
                        new_tags = [tag for tag in current_tags if tag not in valid_tags]
                        application.tags = new_tags
                        logger.info(
                            f"Removed tags {valid_tags} from application {app_id}. "
                            f"Remaining tags: {new_tags}"
                        )

                    elif request.operation == "replace":
                        # Replace all tags with new ones
                        application.tags = valid_tags
                        logger.info(
                            f"Replaced tags for application {app_id} with {valid_tags}"
                        )

                    success_count += 1
                    logger.debug(f"Successfully tagged application {app_id}")

                except Exception as e:
                    failed_count += 1
                    error_msg = str(e)
                    errors.append({"id": str(app_id), "error": error_msg})
                    logger.error(f"Failed to tag application {app_id}: {error_msg}")

            # Add missing IDs to errors
            for missing_id in missing_ids:
                failed_count += 1
                errors.append(
                    {
                        "id": str(missing_id),
                        "error": "Application not found or access denied",
                    }
                )

            # Commit transaction if at least one tagging succeeded
            if success_count > 0:
                try:
                    await db.commit()
                    logger.info(
                        f"Bulk tagging completed: {success_count} succeeded, {failed_count} failed"
                    )
                except Exception as e:
                    await db.rollback()
                    logger.error(
                        f"Failed to commit bulk tagging transaction: {str(e)}",
                        exc_info=True,
                    )
                    raise DatabaseError(
                        message="Failed to commit bulk tagging operation",
                        details={"error": str(e)},
                    )

            return BulkTagResponse(
                success_count=success_count,
                failed_count=failed_count,
                errors=errors,
            )

        except (ValidationError, DatabaseError):
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error during bulk application tagging: {str(e)}",
                exc_info=True,
            )
            raise DatabaseError(
                message="Failed to perform bulk tagging operation",
                details={"user_id": str(user_id), "error": str(e)},
            )
