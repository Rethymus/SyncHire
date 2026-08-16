"""
Companies API - Lightweight Version

The domestic recruiting-site radar: a curated company directory where
public article titles ("XX 2027届秋招正式启动") act as hiring signals
that pin companies to the top with a dated batch badge.
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.local_first_helpers import dump_json, load_json
from app.core.database_lite import get_db
from app.core.logger import LogCategory, logger
from app.models.company_directory import CompanyDirectoryEntry
from app.schemas.schemas_lite import (
    CompanyCreate,
    CompanyImportRequest,
    CompanyImportResponse,
    CompanyResponse,
    CompanyUpdate,
    ManualSignalRequest,
    SignalDetectRequest,
    SignalDetectResponse,
)
from app.services import hiring_signal_service

router = APIRouter(prefix="/companies", tags=["companies"])


def _company_response(entry: CompanyDirectoryEntry) -> CompanyResponse:
    return CompanyResponse(
        id=str(entry.id),
        name=entry.name,
        aliases=load_json(entry.aliases),
        career_url=entry.career_url,
        career_type=entry.career_type or "both",
        industry=entry.industry,
        verified=bool(entry.verified),
        signal_batch=entry.signal_batch,
        signal_title=entry.signal_title,
        signal_url=entry.signal_url,
        signal_detected_at=entry.signal_detected_at,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


async def _get_entry_or_404(entry_id: str, db: AsyncSession):
    try:
        entry_uuid = uuid.UUID(entry_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid company id"
        )
    entry = (
        await db.execute(
            select(CompanyDirectoryEntry).where(CompanyDirectoryEntry.id == entry_uuid)
        )
    ).scalar_one_or_none()
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Company not found"
        )
    return entry


@router.get("", response_model=List[CompanyResponse])
async def list_companies(
    keyword: Optional[str] = None,
    has_signal: Optional[bool] = None,
    career_type: Optional[str] = None,
    industry: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Directory ordered by latest signal first (the 'radar' view)."""
    query = select(CompanyDirectoryEntry)
    if keyword:
        like = f"%{keyword}%"
        query = query.where(
            CompanyDirectoryEntry.name.ilike(like)
            | CompanyDirectoryEntry.aliases.ilike(like)
        )
    if has_signal is True:
        query = query.where(CompanyDirectoryEntry.signal_batch.is_not(None))
    elif has_signal is False:
        query = query.where(CompanyDirectoryEntry.signal_batch.is_(None))
    if career_type in ("campus", "social", "both"):
        query = query.where(CompanyDirectoryEntry.career_type == career_type)
    if industry:
        query = query.where(CompanyDirectoryEntry.industry == industry)
    query = query.order_by(
        CompanyDirectoryEntry.signal_detected_at.desc().nullslast(),
        CompanyDirectoryEntry.name.asc(),
    )
    entries = (await db.execute(query)).scalars().all()
    return [_company_response(e) for e in entries]


@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(payload: CompanyCreate, db: AsyncSession = Depends(get_db)):
    """Add a company to the directory."""
    entry = CompanyDirectoryEntry(
        id=uuid.uuid4(),
        name=payload.name,
        aliases=dump_json(payload.aliases or [payload.name]),
        career_url=payload.career_url,
        career_type=payload.career_type,
        industry=payload.industry,
        verified=False,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    logger.info(LogCategory.DATA, f"Added company to directory: {payload.name}")
    return _company_response(entry)


@router.patch("/{entry_id}", response_model=CompanyResponse)
async def update_company(
    entry_id: str, payload: CompanyUpdate, db: AsyncSession = Depends(get_db)
):
    entry = await _get_entry_or_404(entry_id, db)
    if payload.name is not None:
        entry.name = payload.name
    if payload.career_url is not None:
        entry.career_url = payload.career_url
        entry.verified = False  # re-verify after URL change
    if payload.aliases is not None:
        entry.aliases = dump_json(payload.aliases)
    if payload.career_type is not None:
        entry.career_type = payload.career_type
    if payload.industry is not None:
        entry.industry = payload.industry
    if payload.verified is not None:
        entry.verified = payload.verified
    await db.commit()
    await db.refresh(entry)
    return _company_response(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(entry_id: str, db: AsyncSession = Depends(get_db)):
    entry = await _get_entry_or_404(entry_id, db)
    await db.delete(entry)
    await db.commit()


@router.post("/seed-defaults", response_model=List[CompanyResponse])
async def seed_default_companies(db: AsyncSession = Depends(get_db)):
    """Insert the built-in verified company seed (skips existing)."""
    created = await hiring_signal_service.seed_companies(db)
    if created:
        logger.info(LogCategory.DATA, f"Seeded {created} companies")
    return await list_companies(db=db)


@router.post("/import", response_model=CompanyImportResponse)
async def import_companies(
    payload: CompanyImportRequest, db: AsyncSession = Depends(get_db)
):
    """Bulk-import companies (deduped by canonical name).

    Designed for large curated lists (e.g. top-N rankings): existing
    names are skipped untouched, so re-running an import is safe.
    """
    existing = (await db.execute(select(CompanyDirectoryEntry))).scalars().all()
    known = {e.name for e in existing}

    created = 0
    skipped = 0
    for item in payload.companies:
        if item.name in known:
            skipped += 1
            continue
        db.add(
            CompanyDirectoryEntry(
                id=uuid.uuid4(),
                name=item.name,
                aliases=dump_json(item.aliases or [item.name]),
                career_url=item.career_url,
                industry=item.industry,
                verified=item.verified,
            )
        )
        known.add(item.name)
        created += 1

    if created:
        await db.commit()
        logger.info(
            LogCategory.DATA, f"Imported {created} companies ({skipped} skipped)"
        )
    return CompanyImportResponse(created=created, skipped=skipped)


@router.post("/detect-signal", response_model=SignalDetectResponse)
async def detect_signal(
    payload: SignalDetectRequest, db: AsyncSession = Depends(get_db)
):
    """Scan an article title (or fetch it from a URL) for hiring signals.

    Matching companies get pinned with the batch label and now-date.
    """
    title = (payload.title or "").strip()
    if not title and payload.url:
        title = (await hiring_signal_service.fetch_article_title(payload.url)) or ""
    if not title:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide a title or a URL whose page exposes a title",
        )

    signals = await hiring_signal_service.apply_signal(db, title, url=payload.url)
    if not signals:
        return SignalDetectResponse(matched=[], used_title=title)

    by_id = {
        str(e.id): e
        for e in (await db.execute(select(CompanyDirectoryEntry))).scalars().all()
    }
    matched = [
        _company_response(by_id[s.company_id]) for s in signals if s.company_id in by_id
    ]
    return SignalDetectResponse(matched=matched, used_title=title)


@router.post("/{entry_id}/signal", response_model=CompanyResponse)
async def set_manual_signal(
    entry_id: str, payload: ManualSignalRequest, db: AsyncSession = Depends(get_db)
):
    """Pin a hiring signal on one company by hand."""
    from datetime import datetime, timezone

    entry = await _get_entry_or_404(entry_id, db)
    entry.signal_batch = payload.batch
    entry.signal_title = payload.title
    entry.signal_url = payload.url
    # Optional backdated detection (e.g. importing curated lists);
    # defaults to now so manual pins sort to the top
    entry.signal_detected_at = payload.detected_at or datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(entry)
    return _company_response(entry)


@router.delete("/{entry_id}/signal", response_model=CompanyResponse)
async def clear_signal(entry_id: str, db: AsyncSession = Depends(get_db)):
    """Clear a company's hiring signal."""
    entry = await _get_entry_or_404(entry_id, db)
    entry.signal_batch = None
    entry.signal_title = None
    entry.signal_url = None
    entry.signal_detected_at = None
    await db.commit()
    await db.refresh(entry)
    return _company_response(entry)
