import json
import os
import uuid
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status, UploadFile
from app.models.resume import Resume
from app.schemas.resume import ResumeUpdate
from app.core.config import get_settings
from app.services.mcp_client import mcp_client, MCPError
from app.services.ai_service import AIService

settings = get_settings()
UPLOAD_DIR = Path("uploads/resumes")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class ResumeService:
    @staticmethod
    async def create_resume(
        db: AsyncSession,
        user_id: uuid.UUID,
        file: UploadFile,
        title: str,
    ) -> Resume:
        file_extension = Path(file.filename).suffix.lower()

        if file_extension not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_extension} not allowed",
            )

        content = await file.read()

        if len(content) > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large",
            )

        file_id = uuid.uuid4()
        file_path = UPLOAD_DIR / f"{file_id}{file_extension}"

        with open(file_path, "wb") as buffer:
            buffer.write(content)

        # Parse resume using MCP client
        parsed_data = None
        resume_content = None
        embedding = None

        try:
            parsed_data = await mcp_client.parse_resume(str(file_path), content)
            resume_content = json.dumps(parsed_data, ensure_ascii=False)

            # Generate embedding for semantic search
            if parsed_data.get("text_content"):
                embedding = await AIService.generate_embedding(
                    parsed_data["text_content"]
                )
        except MCPError as e:
            # Log error but continue - resume is saved
            print(f"MCP parsing failed: {e}")

        db_resume = Resume(
            user_id=user_id,
            title=title,
            file_path=str(file_path),
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

        if os.path.exists(resume.file_path):
            os.remove(resume.file_path)

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

        if not os.path.exists(resume.file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume file not found",
            )

        try:
            with open(resume.file_path, "rb") as f:
                content = f.read()

            parsed_data = await mcp_client.parse_resume(resume.file_path, content)
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
        except MCPError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to parse resume: {e}",
            )
