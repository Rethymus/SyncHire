import uuid
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.jd import JD
from app.schemas.jd import JDCreate, JDUpdate
from app.services.ai_service import AIService
from app.services.mcp_client import mcp_client, MCPError


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
