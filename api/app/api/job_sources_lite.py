"""
Job Sources API - Lightweight Version

Manage ATS job board subscriptions, trigger syncs, and browse the
ingested job feed. Job data comes directly from company recruiting
pages via official ATS public APIs.
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database_lite import get_db
from app.core.logger import LogCategory, logger
from app.models.jd_lite import JobDescription
from app.models.job_source import JobSource
from app.schemas.schemas_lite import (
    JobDescriptionResponse,
    JobSourceCatalogRequest,
    JobSourceCatalogResponse,
    JobSourceCreate,
    JobSourceDetectRequest,
    JobSourceDetectResponse,
    JobSourceImportRequest,
    JobSourceImportResponse,
    JobSourceLogApplicationRequest,
    JobSourceLogApplicationResponse,
    JobSourceResponse,
    JobSourceScoreResponse,
    JobSourceSyncResponse,
    JobSourceUpdate,
)
from app.services import job_source_service

router = APIRouter(prefix="/job-sources", tags=["job-sources"])


def _source_response(source: JobSource) -> JobSourceResponse:
    return JobSourceResponse(
        id=str(source.id),
        name=source.name,
        ats_type=source.ats_type,
        org_key=source.org_key,
        portal_url=source.portal_url,
        enabled=source.enabled,
        last_synced_at=source.last_synced_at,
        last_sync_status=source.last_sync_status,
        last_sync_message=source.last_sync_message,
        last_new_count=source.last_new_count or 0,
        last_total_count=source.last_total_count or 0,
        created_at=source.created_at,
        updated_at=source.updated_at,
    )


async def _get_source_or_404(source_id: str, db: AsyncSession) -> JobSource:
    try:
        source_uuid = uuid.UUID(source_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid job source id",
        )
    result = await db.execute(select(JobSource).where(JobSource.id == source_uuid))
    source = result.scalar_one_or_none()
    if source is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job source not found"
        )
    return source


@router.get("", response_model=List[JobSourceResponse])
async def list_job_sources(db: AsyncSession = Depends(get_db)):
    """List all subscribed job sources with their last sync status."""
    result = await db.execute(select(JobSource).order_by(JobSource.created_at))
    return [_source_response(s) for s in result.scalars().all()]


@router.post("/detect", response_model=JobSourceDetectResponse)
async def detect_job_source(
    request: JobSourceDetectRequest, db: AsyncSession = Depends(get_db)
):
    """Detect the ATS type behind a recruiting page URL."""
    detection = job_source_service.detect_ats_from_url(request.url)
    if detection is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Unrecognized recruiting page. Supported: Greenhouse "
                "(job-boards.greenhouse.io/...), Lever (jobs.lever.co/...), "
                "Ashby (jobs.ashbyhq.com/...), SmartRecruiters "
                "(careers.smartrecruiters.com/...)"
            ),
        )
    return JobSourceDetectResponse(**detection)


@router.post("", response_model=JobSourceResponse, status_code=status.HTTP_201_CREATED)
async def create_job_source(
    payload: JobSourceCreate, db: AsyncSession = Depends(get_db)
):
    """Subscribe to an ATS-backed recruiting page.

    Either pass a recruiting page URL (ATS auto-detected) or an
    explicit ats_type + org_key pair.
    """
    ats_type = payload.ats_type
    org_key = payload.org_key
    portal_url = payload.url

    if not ats_type or not org_key:
        if not payload.url:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Provide either a recruiting page URL or ats_type + org_key",
            )
        detection = job_source_service.detect_ats_from_url(payload.url)
        if detection is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not detect a supported ATS from the URL",
            )
        ats_type = detection["ats_type"]
        org_key = org_key or detection["org_key"]
        portal_url = portal_url or detection["portal_url"]

    if ats_type not in job_source_service.SUPPORTED_ATS_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported ATS type: {ats_type}",
        )

    duplicate = await db.execute(
        select(JobSource).where(
            JobSource.ats_type == ats_type,
            JobSource.org_key == org_key,
        )
    )
    if duplicate.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This job source is already subscribed",
        )

    name = payload.name or (org_key[:1].upper() + org_key[1:])
    source = JobSource(
        id=uuid.uuid4(),
        name=name,
        ats_type=ats_type,
        org_key=org_key,
        portal_url=portal_url,
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    logger.info(
        LogCategory.DATA, f"Subscribed job source: {name} ({ats_type}/{org_key})"
    )
    return _source_response(source)


@router.post("/seed-defaults", response_model=List[JobSourceResponse])
async def seed_default_job_sources(db: AsyncSession = Depends(get_db)):
    """Add the built-in verified sample sources (skips existing ones)."""
    await job_source_service.seed_default_sources(db)
    result = await db.execute(select(JobSource).order_by(JobSource.created_at))
    return [_source_response(s) for s in result.scalars().all()]


@router.patch("/{source_id}", response_model=JobSourceResponse)
async def update_job_source(
    source_id: str,
    payload: JobSourceUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Rename or enable/disable a job source."""
    source = await _get_source_or_404(source_id, db)
    if payload.name is not None:
        source.name = payload.name
    if payload.enabled is not None:
        source.enabled = payload.enabled
    await db.commit()
    await db.refresh(source)
    return _source_response(source)


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job_source(source_id: str, db: AsyncSession = Depends(get_db)):
    """Unsubscribe a job source (ingested jobs are kept)."""
    source = await _get_source_or_404(source_id, db)
    await db.delete(source)
    await db.commit()


@router.post("/{source_id}/sync", response_model=JobSourceSyncResponse)
async def sync_job_source(source_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch postings from one job source now."""
    source = await _get_source_or_404(source_id, db)
    result = await job_source_service.sync_job_source(db, source)
    return JobSourceSyncResponse(
        source_id=str(source.id),
        source_name=source.name,
        status=result.status,
        new_count=result.new_count,
        updated_count=result.updated_count,
        total_count=result.total_count,
        message=result.message,
    )


@router.post("/score", response_model=JobSourceScoreResponse)
async def score_feed_jobs(
    limit: int = 100, rescore: bool = False, db: AsyncSession = Depends(get_db)
):
    """Score feed jobs against the local resume.

    By default only unscored jobs are scored; pass rescore=true to
    recompute every feed job (e.g. after updating the resume).
    """
    from app.services import job_match_service

    if rescore:
        scored = await job_match_service.rescore_all_jobs(db, limit=max(limit, 500))
    else:
        scored, _resume_title = await job_match_service.score_unscored_jobs(
            db, limit=limit
        )
    resume = await job_match_service.get_scoring_resume(db)
    return JobSourceScoreResponse(
        scored_count=scored,
        resume_title=resume.title if resume else None,
    )


@router.post("/import", response_model=JobSourceImportResponse)
async def import_job_sources(
    payload: JobSourceImportRequest, db: AsyncSession = Depends(get_db)
):
    """Bulk-subscribe ATS job boards (deduped by ats_type + org_key).

    Sources arrive disabled so a large catalog import does not turn
    the scheduler loose on thousands of boards; enable selectively.
    """
    if payload.ats_type not in job_source_service.SUPPORTED_ATS_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported ATS type: {payload.ats_type}",
        )
    existing = await db.execute(select(JobSource))
    known = {(s.ats_type, s.org_key.lower()) for s in existing.scalars().all()}
    created = 0
    skipped = 0
    for org_key in payload.org_keys:
        org_key = org_key.strip()
        if not org_key:
            continue
        if (payload.ats_type, org_key.lower()) in known:
            skipped += 1
            continue
        db.add(
            JobSource(
                id=uuid.uuid4(),
                name=org_key[:1].upper() + org_key[1:],
                ats_type=payload.ats_type,
                org_key=org_key,
                enabled=payload.enabled,
            )
        )
        known.add((payload.ats_type, org_key.lower()))
        created += 1
    if created:
        await db.commit()
        logger.info(
            LogCategory.DATA,
            f"Imported {created} {payload.ats_type} job sources ({skipped} skipped)",
        )
    return JobSourceImportResponse(created=created, skipped=skipped)


@router.post("/search-catalog", response_model=JobSourceCatalogResponse)
async def search_catalog(payload: JobSourceCatalogRequest):
    """Search the bundled ATS board catalog (15k+ org tokens from the
    open-source job-board-aggregator dataset) by keyword."""
    import json
    from pathlib import Path

    catalog_path = Path(__file__).resolve().parent.parent / "data" / "ats_catalog.json"
    if not catalog_path.exists():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ATS catalog file not found",
        )
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    needle = payload.query.strip().lower()
    ats_types = (
        [payload.ats_type]
        if payload.ats_type
        else list(job_source_service.SUPPORTED_ATS_TYPES)
    )
    results = []
    for ats_type in ats_types:
        if ats_type not in catalog:
            continue
        for token in catalog[ats_type]:
            if not needle or needle in token.lower():
                results.append({"ats_type": ats_type, "org_key": token})
                if len(results) >= payload.limit:
                    return JobSourceCatalogResponse(
                        total=results.__len__(), results=results, truncated=True
                    )
    return JobSourceCatalogResponse(
        total=len(results), results=results, truncated=False
    )


@router.post("/sync-all", response_model=List[JobSourceSyncResponse])
async def sync_all_job_sources(db: AsyncSession = Depends(get_db)):
    """Fetch postings from every enabled job source now."""
    responses = []
    for source, result in await job_source_service.sync_all_enabled(db):
        responses.append(
            JobSourceSyncResponse(
                source_id=str(source.id),
                source_name=source.name,
                status=result.status,
                new_count=result.new_count,
                updated_count=result.updated_count,
                total_count=result.total_count,
                message=result.message,
            )
        )
    return responses


@router.post(
    "/log-application",
    response_model=JobSourceLogApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def log_application(
    payload: JobSourceLogApplicationRequest, db: AsyncSession = Depends(get_db)
):
    """Record an application submitted via the job browser.

    Links the feed JD matching the URL (creates a stub JD for pages
    not in the feed) and files a SUBMITTED application against the
    most recently updated resume.
    """
    from datetime import datetime, timezone

    from app.models.application_lite import Application, ApplicationStatus
    from app.models.resume_lite import Resume

    resume = (
        await db.execute(select(Resume).order_by(Resume.updated_at.desc()).limit(1))
    ).scalar_one_or_none()
    if resume is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Upload a resume first: applications require a resume link",
        )

    jd_result = await db.execute(
        select(JobDescription)
        .where(
            or_(
                JobDescription.url == payload.url,
                JobDescription.source_url == payload.url,
            )
        )
        .limit(1)
    )
    jd = jd_result.scalar_one_or_none()
    jd_created = jd is None
    if jd is None:
        jd = JobDescription(
            id=uuid.uuid4(),
            company=(payload.company or "Unknown")[:255],
            title=(payload.title or "Applied via Job Browser")[:255],
            description=payload.title or "Applied via Job Browser",
            url=payload.url,
            platform="manual",
        )
        db.add(jd)

    now = datetime.now(timezone.utc)
    application = Application(
        id=uuid.uuid4(),
        resume_id=resume.id,
        jd_id=jd.id,
        status=ApplicationStatus.SUBMITTED,
        platform="job-browser",
        source_url=payload.url,
        applied_date=now,
        submitted_manually_at=now,
    )
    db.add(application)
    await db.commit()

    logger.info(
        LogCategory.DATA,
        f"Logged job-browser application for {jd.company} / {jd.title}",
    )
    return JobSourceLogApplicationResponse(
        application_id=str(application.id),
        jd_id=str(jd.id),
        jd_created=jd_created,
        status=application.status,
        applied_at=now,
    )


@router.post("/{jd_id}/score-llm", response_model=JobDescriptionResponse)
async def score_jd_with_llm(
    jd_id: str,
    resume_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Re-score one job with the configured LLM (AI settings BYOK).

    Falls back to the latest resume when resume_id is omitted. The
    LLM score replaces match_score and is marked in match_detail.
    """
    import json as _json

    from app.models.resume_lite import Resume
    from app.services.ai_service_lite import ai_service

    try:
        jd_uuid = uuid.UUID(jd_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid jd id"
        )

    jd = (
        await db.execute(select(JobDescription).where(JobDescription.id == jd_uuid))
    ).scalar_one_or_none()
    if jd is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job description not found"
        )

    resume = (
        await db.execute(
            select(Resume)
            .where(
                Resume.id == uuid.UUID(resume_id)
                if resume_id
                else Resume.id.is_not(None)
            )
            .order_by(Resume.updated_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if resume is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Upload a resume first",
        )

    if not getattr(ai_service, "openai_client", None):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No AI provider configured — set an OpenAI key in AI settings first",
        )

    try:
        score = await ai_service.calculate_match_score(
            resume.content, jd.raw_text or jd.description
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"LLM scoring unavailable: {exc}",
        )

    detail = {}
    try:
        detail = _json.loads(jd.match_detail) if jd.match_detail else {}
    except ValueError:
        detail = {}
    detail.update({"llm_score": score, "method": "llm-v1"})
    jd.match_score = score
    jd.match_detail = _json.dumps(detail, ensure_ascii=False)
    await db.commit()
    await db.refresh(jd)

    from app.api.jds_lite import _jd_response

    return _jd_response(jd)


@router.get("/feed", response_model=List[JobDescriptionResponse])
async def job_feed(
    keyword: Optional[str] = None,
    source: Optional[str] = None,
    company: Optional[str] = None,
    remote: Optional[str] = None,
    sort: str = "newest",  # newest | match
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """Browse jobs ingested from ATS sources (newest or best match)."""
    query = select(JobDescription).where(JobDescription.source.is_not(None))
    if keyword:
        like = f"%{keyword}%"
        query = query.where(
            or_(
                JobDescription.title.ilike(like),
                JobDescription.company.ilike(like),
                JobDescription.description.ilike(like),
            )
        )
    if source:
        query = query.where(JobDescription.source.ilike(f"%{source}%"))
    if company:
        query = query.where(JobDescription.company.ilike(f"%{company}%"))
    if remote in ("remote", "hybrid", "onsite"):
        query = query.where(JobDescription.remote == remote)
    if sort == "match":
        query = query.order_by(
            JobDescription.match_score.desc().nullslast(),
            JobDescription.created_at.desc(),
        )
    else:
        query = query.order_by(JobDescription.created_at.desc())
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    from app.api.jds_lite import _jd_response

    return [_jd_response(jd) for jd in result.scalars().all()]
