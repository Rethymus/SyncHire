import json
import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.application import Application
from app.schemas.application import ApplicationCreate
from app.services.resume_service import ResumeService
from app.services.jd_service import JDService
from app.services.ai_service import AIService
from app.services.mcp_client import mcp_client, MCPError


class ApplicationService:
    @staticmethod
    async def create_application(
        db: AsyncSession,
        user_id: uuid.UUID,
        app_data: ApplicationCreate,
    ) -> Application:
        resume = await ResumeService.get_resume(db, app_data.resume_id, user_id)
        jd = await JDService.get_jd(db, app_data.jd_id, user_id)

        db_application = Application(
            user_id=user_id,
            resume_id=app_data.resume_id,
            jd_id=app_data.jd_id,
        )

        db.add(db_application)
        await db.commit()
        await db.refresh(db_application)

        return db_application

    @staticmethod
    async def get_applications(db: AsyncSession, user_id: uuid.UUID) -> list[Application]:
        result = await db.execute(
            select(Application)
            .where(Application.user_id == user_id)
            .order_by(Application.created_at.desc())
        )
        return list(result.scalars().all())

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

        return application

    @staticmethod
    async def get_match_score(
        db: AsyncSession,
        application_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> dict:
        application = await ApplicationService.get_application(db, application_id, user_id)

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
        application = await ApplicationService.get_application(db, application_id, user_id)

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
        application.status = "optimized"
        await db.commit()

        return optimized

    @staticmethod
    async def generate_interview_prep(
        db: AsyncSession,
        application_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> dict:
        application = await ApplicationService.get_application(db, application_id, user_id)

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
