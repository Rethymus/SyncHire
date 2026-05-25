import uuid
import json
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status
from app.models.jd import JD
from app.schemas.jd import JDCreate, JDUpdate, BulkDeleteResponse
from app.services.ai_service import AIService
from app.services.mcp_client import mcp_client, MCPError
import logging

logger = logging.getLogger(__name__)


class JDService:
    @staticmethod
    async def parse_jd(content: str) -> dict:
        """Parse JD using MCP client with fallback to AI service."""
        try:
            return await mcp_client.parse_jd(content)
        except MCPError:
            # Fallback to AI service if MCP is unavailable
            return await AIService.parse_jd(content)

    @staticmethod
    async def create_jd(
        db: AsyncSession,
        user_id: uuid.UUID,
        jd_data: JDCreate,
    ) -> JD:
        parsed_data = await JDService.parse_jd(jd_data.content)

        # Generate embedding for semantic search
        embedding = None
        try:
            embedding = await AIService.generate_embedding(jd_data.content)
        except Exception as e:
            print(f"Failed to generate embedding: {e}")

        db_jd = JD(
            user_id=user_id,
            title=jd_data.title,
            company=jd_data.company,
            content=jd_data.content,
            parsed_data=json.dumps(parsed_data, ensure_ascii=False),
            embedding=embedding,
        )

        db.add(db_jd)
        await db.commit()
        await db.refresh(db_jd)

        return db_jd

    @staticmethod
    async def get_jds(db: AsyncSession, user_id: uuid.UUID) -> list[JD]:
        result = await db.execute(
            select(JD).where(JD.user_id == user_id).order_by(JD.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_jds_paginated(
        db: AsyncSession, user_id: uuid.UUID, page: int = 1, page_size: int = 20
    ) -> tuple[list[JD], int]:
        """
        Get paginated JDs for a user.

        Args:
            db: Database session
            user_id: User ID
            page: Page number (1-indexed)
            page_size: Number of items per page

        Returns:
            Tuple of (JDs list, total count)
        """
        # Get total count
        count_result = await db.execute(
            select(func.count(JD.id)).where(JD.user_id == user_id)
        )
        total = count_result.scalar() or 0

        # Get paginated results
        offset = (page - 1) * page_size
        result = await db.execute(
            select(JD)
            .where(JD.user_id == user_id)
            .order_by(JD.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        jds = list(result.scalars().all())

        logger.info(
            f"Retrieved {len(jds)} JDs for user {user_id} "
            f"(page {page}, page_size {page_size}, total {total})"
        )
        return jds, total

    @staticmethod
    async def get_jd(db: AsyncSession, jd_id: uuid.UUID, user_id: uuid.UUID) -> JD:
        result = await db.execute(
            select(JD).where(JD.id == jd_id, JD.user_id == user_id)
        )
        jd = result.scalar_one_or_none()

        if not jd:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="JD not found",
            )

        return jd

    @staticmethod
    async def update_jd(
        db: AsyncSession,
        jd_id: uuid.UUID,
        user_id: uuid.UUID,
        jd_data: JDUpdate,
    ) -> JD:
        jd = await JDService.get_jd(db, jd_id, user_id)

        # Update fields if provided
        if jd_data.title is not None:
            jd.title = jd_data.title
        if jd_data.company is not None:
            jd.company = jd_data.company
        if jd_data.content is not None:
            jd.content = jd_data.content
            # Re-parse and generate new embedding if content changed
            parsed_data = await JDService.parse_jd(jd_data.content)
            jd.parsed_data = json.dumps(parsed_data, ensure_ascii=False)

            try:
                embedding = await AIService.generate_embedding(jd_data.content)
                jd.embedding = embedding
            except Exception as e:
                print(f"Failed to generate embedding: {e}")

        await db.commit()
        await db.refresh(jd)

        return jd

    @staticmethod
    async def delete_jd(
        db: AsyncSession,
        jd_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        jd = await JDService.get_jd(db, jd_id, user_id)
        await db.delete(jd)
        await db.commit()

    @staticmethod
    async def bulk_delete_jds(
        db: AsyncSession,
        user_id: uuid.UUID,
        jd_ids: List[uuid.UUID],
    ) -> BulkDeleteResponse:
        """
        Bulk delete job descriptions with comprehensive error handling and partial failure support

        Args:
            db: Database session
            user_id: User ID
            jd_ids: List of JD IDs to delete

        Returns:
            BulkDeleteResponse with success/failure counts and error details

        Raises:
            ValidationError: If input data is invalid
        """
        try:
            # Validate input
            if not jd_ids:
                raise ValueError("JD IDs list cannot be empty")

            if len(jd_ids) > 100:
                raise ValueError("Cannot delete more than 100 JDs at once")

            # Validate all IDs are valid UUIDs
            try:
                valid_ids = [uuid.UUID(str(jd_id)) for jd_id in jd_ids]
            except ValueError as e:
                raise ValueError(f"Invalid JD ID format: {e}")

            # Fetch all JDs that belong to the user
            result = await db.execute(
                select(JD).where(JD.id.in_(valid_ids), JD.user_id == user_id)
            )
            jds = list(result.scalars().all())
            found_ids = {jd.id for jd in jds}

            # Identify IDs that weren't found
            missing_ids = set(valid_ids) - found_ids

            logger.info(
                f"Found {len(jds)} out of {len(valid_ids)} JDs for user {user_id}"
            )

            # Delete JDs one by one to handle partial failures
            success_count = 0
            failed_count = 0
            errors = []

            for jd in jds:
                try:
                    await db.delete(jd)
                    success_count += 1
                    logger.debug(f"Successfully deleted JD {jd.id}")
                except Exception as e:
                    failed_count += 1
                    error_msg = str(e)
                    errors.append({"id": str(jd.id), "error": error_msg})
                    logger.error(f"Failed to delete JD {jd.id}: {error_msg}")

            # Add missing IDs to errors
            for missing_id in missing_ids:
                failed_count += 1
                errors.append(
                    {"id": str(missing_id), "error": "JD not found or access denied"}
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
                    logger.error(f"Failed to commit bulk delete transaction: {e}")
                    raise

            return BulkDeleteResponse(
                success_count=success_count, failed_count=failed_count, errors=errors
            )

        except Exception as e:
            logger.error(f"Unexpected error during bulk JD deletion: {e}")
            raise
