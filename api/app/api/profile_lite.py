"""Candidate profile API for SyncHire Lite."""

from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.local_first_helpers import dump_json, get_by_id_or_404, load_json
from app.core.database_lite import get_db
from app.core.logger import LogCategory, logger
from app.models.candidate_profile_item_lite import CandidateProfileItem
from app.models.candidate_profile_lite import CandidateProfile
from app.schemas.schemas_lite import (
    CandidateProfileCreate,
    CandidateProfileItemCreate,
    CandidateProfileItemResponse,
    CandidateProfileItemUpdate,
    CandidateProfileResponse,
    CandidateProfileUpdate,
)

router = APIRouter(prefix="/profile", tags=["candidate-profile"])
items_router = APIRouter(prefix="/profile/items", tags=["candidate-profile-items"])


def _profile_response(profile: CandidateProfile) -> CandidateProfileResponse:
    return CandidateProfileResponse(
        id=str(profile.id),
        display_name=profile.display_name,
        target_title=profile.target_title,
        email=profile.email,
        phone=profile.phone,
        location=profile.location,
        links=load_json(profile.links_json),
        summary=profile.summary,
        privacy_settings=load_json(profile.privacy_settings_json),
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


def _item_response(item: CandidateProfileItem) -> CandidateProfileItemResponse:
    return CandidateProfileItemResponse(
        id=str(item.id),
        profile_id=str(item.profile_id),
        item_type=item.item_type,
        title=item.title,
        organization=item.organization,
        role=item.role,
        start_date=item.start_date,
        end_date=item.end_date,
        description=item.description,
        highlights=load_json(item.highlights_json),
        skills=load_json(item.skills_json),
        metrics=load_json(item.metrics_json),
        visibility=item.visibility,
        sort_order=item.sort_order,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.post(
    "", response_model=CandidateProfileResponse, status_code=status.HTTP_201_CREATED
)
async def create_profile(
    profile: CandidateProfileCreate, db: AsyncSession = Depends(get_db)
):
    """Create a local candidate profile."""
    profile_id = uuid4()
    db_profile = CandidateProfile(
        id=profile_id,
        display_name=profile.display_name,
        target_title=profile.target_title,
        email=profile.email,
        phone=profile.phone,
        location=profile.location,
        links_json=dump_json(profile.links),
        summary=profile.summary,
        privacy_settings_json=dump_json(profile.privacy_settings),
    )

    db.add(db_profile)
    await db.commit()
    await db.refresh(db_profile)

    logger.info(LogCategory.DATA, f"Created candidate profile: {profile_id}")
    return _profile_response(db_profile)


@router.get("", response_model=List[CandidateProfileResponse])
async def list_profiles(
    skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)
):
    """List local candidate profiles."""
    result = await db.execute(
        select(CandidateProfile)
        .offset(skip)
        .limit(limit)
        .order_by(CandidateProfile.updated_at.desc())
    )
    return [_profile_response(profile) for profile in result.scalars().all()]


@router.get("/{profile_id}", response_model=CandidateProfileResponse)
async def get_profile(profile_id: str, db: AsyncSession = Depends(get_db)):
    """Get a local candidate profile."""
    profile = await get_by_id_or_404(db, CandidateProfile, profile_id, "profile_id")
    return _profile_response(profile)


@router.put("/{profile_id}", response_model=CandidateProfileResponse)
async def update_profile(
    profile_id: str,
    profile: CandidateProfileUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a local candidate profile."""
    db_profile = await get_by_id_or_404(db, CandidateProfile, profile_id, "profile_id")
    updates = profile.model_dump(exclude_unset=True)

    for field in (
        "display_name",
        "target_title",
        "email",
        "phone",
        "location",
        "summary",
    ):
        if field in updates:
            setattr(db_profile, field, updates[field])
    if "links" in updates:
        db_profile.links_json = dump_json(updates["links"])
    if "privacy_settings" in updates:
        db_profile.privacy_settings_json = dump_json(updates["privacy_settings"])

    await db.commit()
    await db.refresh(db_profile)
    return _profile_response(db_profile)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(profile_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a local candidate profile and its dependent facts."""
    profile = await get_by_id_or_404(db, CandidateProfile, profile_id, "profile_id")
    await db.delete(profile)
    await db.commit()
    return None


@items_router.post(
    "",
    response_model=CandidateProfileItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_profile_item(
    item: CandidateProfileItemCreate, db: AsyncSession = Depends(get_db)
):
    """Create a reusable candidate profile item."""
    profile = await get_by_id_or_404(
        db, CandidateProfile, item.profile_id, "profile_id"
    )
    item_id = uuid4()
    db_item = CandidateProfileItem(
        id=item_id,
        profile_id=profile.id,
        item_type=item.item_type.value,
        title=item.title,
        organization=item.organization,
        role=item.role,
        start_date=item.start_date,
        end_date=item.end_date,
        description=item.description,
        highlights_json=dump_json(item.highlights),
        skills_json=dump_json(item.skills),
        metrics_json=dump_json(item.metrics),
        visibility=item.visibility.value,
        sort_order=item.sort_order,
    )

    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return _item_response(db_item)


@items_router.get("", response_model=List[CandidateProfileItemResponse])
async def list_profile_items(
    profile_id: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """List reusable candidate profile items."""
    query = select(CandidateProfileItem)
    if profile_id:
        profile = await get_by_id_or_404(db, CandidateProfile, profile_id, "profile_id")
        query = query.where(CandidateProfileItem.profile_id == profile.id)
    query = (
        query.offset(skip)
        .limit(limit)
        .order_by(
            CandidateProfileItem.sort_order, CandidateProfileItem.updated_at.desc()
        )
    )
    result = await db.execute(query)
    return [_item_response(item) for item in result.scalars().all()]


@items_router.get("/{item_id}", response_model=CandidateProfileItemResponse)
async def get_profile_item(item_id: str, db: AsyncSession = Depends(get_db)):
    """Get a reusable candidate profile item."""
    item = await get_by_id_or_404(db, CandidateProfileItem, item_id, "item_id")
    return _item_response(item)


@items_router.put("/{item_id}", response_model=CandidateProfileItemResponse)
async def update_profile_item(
    item_id: str,
    item: CandidateProfileItemUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a reusable candidate profile item."""
    db_item = await get_by_id_or_404(db, CandidateProfileItem, item_id, "item_id")
    updates = item.model_dump(exclude_unset=True)

    enum_fields = {"item_type", "visibility"}
    json_fields = {
        "highlights": "highlights_json",
        "skills": "skills_json",
        "metrics": "metrics_json",
    }
    for field, value in updates.items():
        if field in json_fields:
            setattr(db_item, json_fields[field], dump_json(value))
        elif field in enum_fields:
            setattr(db_item, field, value.value)
        else:
            setattr(db_item, field, value)

    await db.commit()
    await db.refresh(db_item)
    return _item_response(db_item)


@items_router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile_item(item_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a reusable candidate profile item."""
    item = await get_by_id_or_404(db, CandidateProfileItem, item_id, "item_id")
    await db.delete(item)
    await db.commit()
    return None
