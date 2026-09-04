"""
Applications API - Lightweight Version

Local-first application tracking without authentication.
"""

import re
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.local_first_helpers import dump_json, load_json
from app.api.utils_lite import parse_uuid
from app.core.database_lite import get_db
from app.core.logger import LogCategory, logger
from app.models.application_lite import Application, ApplicationStatus
from app.models.application_material_lite import ApplicationMaterial
from app.models.jd_lite import JobDescription
from app.models.resume_lite import Resume
from app.models.resume_variant_lite import ResumeVariant
from app.schemas.schemas_lite import (
    ApplicationBatchUpdateRequest,
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusUpdateRequest,
    ApplicationUpdate,
)
from app.services.ai_service_lite import ai_service
from app.core.clock import utcnow

router = APIRouter(prefix="/applications", tags=["applications"])

# Legacy status values still sent by frontend pages built against the
# full-stack taxonomy; mapped onto the closest local-first status so the
# PATCH /status loop works against either backend.
_LEGACY_STATUS_ALIASES = {
    "pending": ApplicationStatus.SAVED,
    "optimized": ApplicationStatus.TARGETED,
}

_WORD_RE = re.compile(r"[a-zA-Z][a-zA-Z0-9.+#-]*")


def _resolve_next_status(raw_status: str) -> ApplicationStatus:
    """Resolve a client-supplied status string to a lite ApplicationStatus."""
    if raw_status in _LEGACY_STATUS_ALIASES:
        return _LEGACY_STATUS_ALIASES[raw_status]
    try:
        return ApplicationStatus(raw_status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {raw_status}",
        )


def _append_timeline_event(application: Application, event: dict) -> None:
    """Append an event to the application timeline JSON column."""
    timeline = load_json(application.timeline_json)
    if not isinstance(timeline, list):
        timeline = []
    timeline.append(event)
    application.timeline_json = dump_json(timeline)


def _local_match_details(resume_content: str, jd_content: str, score: float) -> dict:
    """Build a lexical match breakdown mirroring the frontend contract.

    Lite mode has no parsed resume/JD structure, so the sub-scores are
    deterministic word-overlap approximations of the full-stack AI output.
    """
    resume_words = {
        w for w in _WORD_RE.findall((resume_content or "").lower()) if len(w) >= 3
    }
    jd_words = {w for w in _WORD_RE.findall((jd_content or "").lower()) if len(w) >= 3}
    overlap = resume_words & jd_words
    skills_match = round(len(overlap) / max(1, len(jd_words)) * 100, 1)
    missing = sorted(jd_words - resume_words)[:10]
    return {
        "skills_match": skills_match,
        "experience_match": round(score, 1),
        "education_match": skills_match,
        "missing_skills": missing,
        "recommendations": [
            "Lite mode: subscores are lexical approximations. Connect an AI "
            + "provider (or run the full-stack backend) for a detailed breakdown."
        ],
    }


def _interview_question_entry(text: str, category: str, priority: str) -> dict:
    return {
        "question": text,
        "category": category,
        "priority": priority,
        "suggestedAnswer": "",
        "talkingPoints": [],
    }


def _build_interview_prep_payload(
    resume_content: str, jd: JobDescription, questions: list[str]
) -> dict:
    """Assemble the camelCase interview-prep payload the frontend renders."""
    hr, technical, behavioral = [], [], []
    for index, question in enumerate(questions):
        bucket = index % 3
        priority = "high" if index < 3 else "medium"
        entry = _interview_question_entry(
            question, ["hr", "technical", "behavioral"][bucket], priority
        )
        (hr if bucket == 0 else technical if bucket == 1 else behavioral).append(entry)

    resume_lines = [
        line.strip() for line in (resume_content or "").splitlines() if line.strip()
    ][:3]

    return {
        "hrQuestions": hr,
        "technicalQuestions": technical,
        "behavioralQuestions": behavioral,
        "selfIntroduction": {
            "hook": f"Practitioner ready for the {jd.title} role.",
            "structure": [
                "Who I am",
                "Most relevant proof",
                "Why this role",
                "Ask for the next step",
            ],
            "customization": {
                "highlightFromResume": resume_lines,
                "connectToJD": [f"Map past work to the {jd.title} requirements."],
                "demonstrateCulturalFit": [
                    f"Explain the motivation for joining {jd.company}."
                ],
            },
            "example": (
                f"I'm a candidate focused on the skills listed for the "
                f"{jd.title} position, with hands-on results I can walk through. "
                f"I'm excited about what {jd.company} is building and would love "
                "to discuss how I can contribute."
            ),
        },
        "reverseQuestions": [
            {
                "question": "What does success look like in the first 90 days?",
                "category": "role",
                "whenToAsk": "When the interviewer asks if you have questions.",
            },
            {
                "question": "How is the team structured and who would I work with daily?",
                "category": "team",
                "whenToAsk": "With the hiring manager.",
            },
            {
                "question": "What are the biggest challenges for the team this year?",
                "category": "company",
                "whenToAsk": "With senior team members.",
            },
            {
                "question": "How does the team support growth and learning?",
                "category": "growth",
                "whenToAsk": "With potential peers or the manager.",
            },
        ],
        "checklist": [
            {
                "category": "Research",
                "items": [
                    f"Review {jd.company} products and recent news.",
                    "Re-read the job description and note key requirements.",
                ],
                "completed": False,
            },
            {
                "category": "Materials",
                "items": [
                    "Print or open the tailored resume.",
                    "Prepare short stories for the top requirements.",
                ],
                "completed": False,
            },
            {
                "category": "Logistics",
                "items": [
                    "Confirm interview time and platform.",
                    "Prepare a quiet environment and test audio.",
                ],
                "completed": False,
            },
        ],
        "generatedAt": utcnow().isoformat(),
        "targetRole": jd.title,
        "targetCompany": jd.company,
    }


def _application_response(application: Application) -> ApplicationResponse:
    return ApplicationResponse(
        id=str(application.id),
        resume_id=str(application.resume_id),
        jd_id=str(application.jd_id),
        status=application.status.value,
        resume_variant_id=(
            str(application.resume_variant_id)
            if application.resume_variant_id
            else None
        ),
        materials_id=(
            str(application.materials_id) if application.materials_id else None
        ),
        platform=application.platform,
        source_url=application.source_url,
        notes=application.notes,
        match_score=application.match_score,
        applied_date=application.applied_date,
        submitted_manually_at=application.submitted_manually_at,
        next_action=application.next_action,
        next_action_at=application.next_action_at,
        contact_name=application.contact_name,
        contact_channel=application.contact_channel,
        timeline=load_json(application.timeline_json),
        last_updated=application.last_updated,
        created_at=application.created_at,
        updated_at=application.updated_at,
    )


async def _ensure_materials_ready_allowed(
    db: AsyncSession,
    application: Application,
    materials_id=None,
) -> None:
    material_id = materials_id or application.materials_id
    if material_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="materials_ready requires linked application materials",
        )

    result = await db.execute(
        select(ApplicationMaterial).where(ApplicationMaterial.id == material_id)
    )
    material = result.scalar_one_or_none()
    if material is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application materials not found",
        )
    if material.review_status not in {"reviewed", "ready"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="materials_ready requires reviewed or ready materials",
        )


async def _validate_optional_application_links(
    db: AsyncSession,
    resume_variant_id=None,
    materials_id=None,
) -> None:
    if resume_variant_id is not None:
        result = await db.execute(
            select(ResumeVariant).where(ResumeVariant.id == resume_variant_id)
        )
        if result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume variant not found",
            )
    if materials_id is not None:
        result = await db.execute(
            select(ApplicationMaterial).where(ApplicationMaterial.id == materials_id)
        )
        if result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application materials not found",
            )


@router.post(
    "", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED
)
async def create_application(
    application: ApplicationCreate, db: AsyncSession = Depends(get_db)
):
    """
    Create a new application.

    Args:
        application: Application data
        db: Database session

    Returns:
        Created application
    """
    try:
        resume_id = parse_uuid(application.resume_id, "resume_id")
        jd_id = parse_uuid(application.jd_id, "jd_id")
        resume_variant_id = (
            parse_uuid(application.resume_variant_id, "resume_variant_id")
            if application.resume_variant_id
            else None
        )
        materials_id = (
            parse_uuid(application.materials_id, "materials_id")
            if application.materials_id
            else None
        )

        # Validate resume exists
        resume_result = await db.execute(select(Resume).where(Resume.id == resume_id))
        if not resume_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found"
            )

        # Validate JD exists
        jd_result = await db.execute(
            select(JobDescription).where(JobDescription.id == jd_id)
        )
        if not jd_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job description not found",
            )

        await _validate_optional_application_links(
            db, resume_variant_id=resume_variant_id, materials_id=materials_id
        )

        # Create application record
        application_id = uuid4()
        db_application = Application(
            id=application_id,
            resume_id=resume_id,
            jd_id=jd_id,
            resume_variant_id=resume_variant_id,
            materials_id=materials_id,
            status=ApplicationStatus(
                (application.status or ApplicationStatus.SAVED).value
            ),
            platform=application.platform,
            source_url=application.source_url,
            notes=application.notes,
        )

        if db_application.status == ApplicationStatus.MATERIALS_READY:
            await _ensure_materials_ready_allowed(db, db_application, materials_id)

        db.add(db_application)
        await db.commit()
        await db.refresh(db_application)

        logger.info(LogCategory.DATA, f"Created application: {application_id}")

        return _application_response(db_application)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA, f"Failed to create application: {e!s}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create application",
        )


@router.get("", response_model=list[ApplicationResponse])
async def list_applications(
    skip: int = 0,
    limit: int = 100,
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    List all applications.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        status_filter: Optional status filter
        db: Database session

    Returns:
        List of applications
    """
    try:
        query = select(Application)

        if status_filter:
            try:
                query = query.where(
                    Application.status == ApplicationStatus(status_filter)
                )
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {status_filter}",
                )

        query = query.offset(skip).limit(limit).order_by(Application.updated_at.desc())

        result = await db.execute(query)
        applications = result.scalars().all()

        return [_application_response(app) for app in applications]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA, f"Failed to list applications: {e!s}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list applications",
        )


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(application_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get a specific application.

    Args:
        application_id: Application ID
        db: Database session

    Returns:
        Application details
    """
    try:
        application_uuid = parse_uuid(application_id, "application_id")
        result = await db.execute(
            select(Application)
            .options(
                selectinload(Application.resume),
                selectinload(Application.job_description),
            )
            .where(Application.id == application_uuid)
        )
        application = result.scalar_one_or_none()

        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
            )

        return _application_response(application)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA,
            f"Failed to get application {application_id}: {e!s}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get application",
        )


@router.put("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: str,
    application: ApplicationUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Update an application.

    Args:
        application_id: Application ID
        application: Updated application data
        db: Database session

    Returns:
        Updated application
    """
    try:
        application_uuid = parse_uuid(application_id, "application_id")
        result = await db.execute(
            select(Application).where(Application.id == application_uuid)
        )
        db_application = result.scalar_one_or_none()

        if not db_application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
            )

        # Update fields
        if application.status is not None:
            try:
                next_status = ApplicationStatus(application.status)
                if next_status == ApplicationStatus.MATERIALS_READY:
                    pending_materials_id = (
                        parse_uuid(application.materials_id, "materials_id")
                        if application.materials_id
                        else db_application.materials_id
                    )
                    await _ensure_materials_ready_allowed(
                        db, db_application, pending_materials_id
                    )
                db_application.status = next_status
                # Update last_updated when status changes
                db_application.last_updated = utcnow()
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {application.status}",
                )

        if application.resume_variant_id is not None:
            resume_variant_id = parse_uuid(
                application.resume_variant_id, "resume_variant_id"
            )
            await _validate_optional_application_links(
                db, resume_variant_id=resume_variant_id
            )
            db_application.resume_variant_id = resume_variant_id

        if application.materials_id is not None:
            materials_id = parse_uuid(application.materials_id, "materials_id")
            await _validate_optional_application_links(db, materials_id=materials_id)
            db_application.materials_id = materials_id

        if application.platform is not None:
            db_application.platform = application.platform

        if application.source_url is not None:
            db_application.source_url = application.source_url

        if application.notes is not None:
            db_application.notes = application.notes

        if application.match_score is not None:
            db_application.match_score = application.match_score

        if application.applied_date is not None:
            db_application.applied_date = application.applied_date

        if application.submitted_manually_at is not None:
            db_application.submitted_manually_at = application.submitted_manually_at

        if application.next_action is not None:
            db_application.next_action = application.next_action

        if application.next_action_at is not None:
            db_application.next_action_at = application.next_action_at

        if application.contact_name is not None:
            db_application.contact_name = application.contact_name

        if application.contact_channel is not None:
            db_application.contact_channel = application.contact_channel

        if application.timeline is not None:
            db_application.timeline_json = dump_json(application.timeline)

        await db.commit()
        await db.refresh(db_application)

        logger.info(LogCategory.DATA, f"Updated application: {application_id}")

        return _application_response(db_application)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA,
            f"Failed to update application {application_id}: {e!s}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update application",
        )


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(application_id: str, db: AsyncSession = Depends(get_db)):
    """
    Delete an application.

    Args:
        application_id: Application ID
        db: Database session

    Returns:
        No content on success
    """
    try:
        application_uuid = parse_uuid(application_id, "application_id")
        result = await db.execute(
            select(Application).where(Application.id == application_uuid)
        )
        application = result.scalar_one_or_none()

        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
            )

        await db.delete(application)
        await db.commit()

        logger.info(LogCategory.DATA, f"Deleted application: {application_id}")

        return

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA,
            f"Failed to delete application {application_id}: {e!s}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete application",
        )


@router.patch("/{application_id}/status", response_model=ApplicationResponse)
async def update_application_status(
    application_id: str,
    status_update: ApplicationStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Update an application status (lite parity with the full-stack PATCH).

    Records the transition in the application timeline so
    GET /{application_id}/history can replay it.
    """
    try:
        application_uuid = parse_uuid(application_id, "application_id")
        result = await db.execute(
            select(Application).where(Application.id == application_uuid)
        )
        application = result.scalar_one_or_none()

        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
            )

        old_status = application.status
        next_status = _resolve_next_status(status_update.status)
        if next_status == ApplicationStatus.MATERIALS_READY:
            await _ensure_materials_ready_allowed(db, application)

        application.status = next_status
        application.last_updated = utcnow()
        if status_update.notes:
            application.notes = status_update.notes

        _append_timeline_event(
            application,
            {
                "event": "status_change",
                "old_status": old_status.value if old_status else None,
                "new_status": next_status.value,
                "notes": status_update.notes,
                "changed_at": utcnow().isoformat(),
            },
        )

        await db.commit()
        await db.refresh(application)

        logger.info(
            LogCategory.DATA,
            f"Updated application status: {application_id} "
            f"{old_status.value if old_status else None} -> {next_status.value}",
        )

        return _application_response(application)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA,
            f"Failed to update application status {application_id}: {e!s}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update application status",
        )


@router.get("/{application_id}/history")
async def get_application_status_history(
    application_id: str, db: AsyncSession = Depends(get_db)
):
    """
    Status change history for an application (lite parity with full-stack).

    Derived from ``timeline_json`` entries written by PATCH /status, newest
    first, in the ``{id, old_status, new_status, notes, changed_at}`` shape
    the frontend status manager renders.
    """
    try:
        application_uuid = parse_uuid(application_id, "application_id")
        result = await db.execute(
            select(Application).where(Application.id == application_uuid)
        )
        application = result.scalar_one_or_none()

        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
            )

        timeline = load_json(application.timeline_json)
        entries = [
            event
            for event in (timeline if isinstance(timeline, list) else [])
            if isinstance(event, dict) and event.get("event") == "status_change"
        ]

        return [
            {
                "id": f"{application_id}-status-{index}",
                "old_status": event.get("old_status"),
                "new_status": event.get("new_status"),
                "notes": event.get("notes"),
                "changed_at": event.get("changed_at"),
            }
            for index, event in enumerate(reversed(entries))
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.DATA,
            f"Failed to get application history {application_id}: {e!s}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get application history",
        )


@router.get("/{application_id}/match")
async def get_application_match_score(
    application_id: str, db: AsyncSession = Depends(get_db)
):
    """
    Get (and persist) the match score for an application.

    Returns the ``{match_score, match_details}`` payload the frontend
    match-analysis view expects; mirrors the full-stack GET endpoint.
    """
    try:
        application_uuid = parse_uuid(application_id, "application_id")
        result = await db.execute(
            select(Application)
            .options(
                selectinload(Application.resume),
                selectinload(Application.job_description),
            )
            .where(Application.id == application_uuid)
        )
        application = result.scalar_one_or_none()

        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
            )

        resume_content = application.resume.content or ""
        jd_content = application.job_description.description or ""
        match_score = await ai_service.calculate_match_score(resume_content, jd_content)
        application.match_score = match_score
        await db.commit()

        logger.info(
            LogCategory.AI,
            f"Calculated match score for application {application_id}: {match_score}",
        )

        return {
            "match_score": match_score,
            "match_details": _local_match_details(
                resume_content, jd_content, match_score
            ),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.AI,
            f"Failed to get match score for application {application_id}: {e!s}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate match score",
        )


@router.get("/{application_id}/interview-prep")
async def get_interview_prep(application_id: str, db: AsyncSession = Depends(get_db)):
    """
    Generate interview preparation material for an application.

    Returns the camelCase payload (hrQuestions / technicalQuestions /
    behavioralQuestions / selfIntroduction / reverseQuestions / checklist)
    that the frontend interview-prep page renders.
    """
    try:
        application_uuid = parse_uuid(application_id, "application_id")
        result = await db.execute(
            select(Application)
            .options(
                selectinload(Application.resume),
                selectinload(Application.job_description),
            )
            .where(Application.id == application_uuid)
        )
        application = result.scalar_one_or_none()

        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
            )

        jd = application.job_description
        questions = await ai_service.generate_interview_questions(jd.description, 9)

        logger.info(
            LogCategory.AI,
            f"Generated interview prep for application {application_id}",
        )

        return _build_interview_prep_payload(
            application.resume.content or "", jd, questions
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.AI,
            f"Failed to generate interview prep for application {application_id}: {e!s}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate interview prep",
        )


@router.post("/{application_id}/match", response_model=ApplicationResponse)
async def calculate_match(application_id: str, db: AsyncSession = Depends(get_db)):
    """
    Calculate match score for application using AI.

    Args:
        application_id: Application ID
        db: Database session

    Returns:
        Updated application with match score
    """
    try:
        application_uuid = parse_uuid(application_id, "application_id")
        result = await db.execute(
            select(Application)
            .options(
                selectinload(Application.resume),
                selectinload(Application.job_description),
            )
            .where(Application.id == application_uuid)
        )
        application = result.scalar_one_or_none()

        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
            )

        # Calculate match score
        match_score = await ai_service.calculate_match_score(
            application.resume.content, application.job_description.description
        )

        # Update application
        application.match_score = match_score
        await db.commit()
        await db.refresh(application)

        logger.info(
            LogCategory.AI,
            f"Calculated match score for application {application_id}: {match_score}",
        )

        return _application_response(application)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            LogCategory.AI,
            f"Failed to calculate match for application {application_id}: {e!s}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate match score",
        )


@router.post("/batch-update")
async def batch_update_applications(
    request: ApplicationBatchUpdateRequest = Body(...),
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Batch update applications.

    Args:
        request: Application IDs and optional new status
        background_tasks: FastAPI background tasks
        db: Database session

    Returns:
        Batch update results
    """
    try:
        updated = 0
        failed = 0
        errors = []

        for app_id in request.application_ids:
            try:
                app_uuid = parse_uuid(app_id, "application_id")
                result = await db.execute(
                    select(Application).where(Application.id == app_uuid)
                )
                application = result.scalar_one_or_none()

                if application and request.status:
                    next_status = ApplicationStatus(request.status.value)
                    if next_status == ApplicationStatus.MATERIALS_READY:
                        await _ensure_materials_ready_allowed(db, application)
                    application.status = next_status
                    application.last_updated = utcnow()
                    updated += 1

            except Exception as e:
                failed += 1
                errors.append(f"{app_id}: {e!s}")

        await db.commit()

        logger.info(
            LogCategory.DATA,
            f"Batch updated applications: {updated} updated, {failed} failed",
        )

        return {"updated": updated, "failed": failed, "errors": errors}

    except Exception as e:
        logger.error(
            LogCategory.DATA,
            f"Failed to batch update applications: {e!s}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to batch update applications",
        )
