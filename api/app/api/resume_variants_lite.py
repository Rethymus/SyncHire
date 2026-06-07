"""Resume variant API for SyncHire Lite."""

from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.local_first_helpers import dump_json, get_by_id_or_404, load_json
from app.api.utils_lite import parse_uuid
from app.core.database_lite import get_db
from app.models.application_lite import Application
from app.models.candidate_profile_lite import CandidateProfile
from app.models.candidate_role_card_lite import CandidateRoleCard
from app.models.jd_lite import JobDescription
from app.models.resume_variant_lite import ResumeVariant
from app.schemas.schemas_lite import (
    ResumeVariantCreate,
    ResumeVariantResponse,
    ResumeVariantUpdate,
)

router = APIRouter(prefix="/resume-variants", tags=["resume-variants"])


def _variant_response(variant: ResumeVariant) -> ResumeVariantResponse:
    return ResumeVariantResponse(
        id=str(variant.id),
        profile_id=str(variant.profile_id),
        role_card_id=str(variant.role_card_id) if variant.role_card_id else None,
        jd_id=str(variant.jd_id),
        application_id=str(variant.application_id) if variant.application_id else None,
        title=variant.title,
        language=variant.language,
        template_id=variant.template_id,
        content_markdown=variant.content_markdown,
        content_json=load_json(variant.content_json),
        match_score=variant.match_score,
        keyword_hits=load_json(variant.keyword_hits_json),
        gap_warnings=load_json(variant.gap_warnings_json),
        generation_rationale=variant.generation_rationale,
        ai_provider=variant.ai_provider,
        ai_model=variant.ai_model,
        status=variant.status,
        created_at=variant.created_at,
        updated_at=variant.updated_at,
    )


async def _validate_variant_links(
    db: AsyncSession,
    profile_id: str,
    jd_id: str,
    role_card_id: str | None = None,
    application_id: str | None = None,
) -> tuple[CandidateProfile, JobDescription]:
    profile = await get_by_id_or_404(db, CandidateProfile, profile_id, "profile_id")
    jd = await get_by_id_or_404(db, JobDescription, jd_id, "jd_id")

    if role_card_id:
        role_card = await get_by_id_or_404(
            db, CandidateRoleCard, role_card_id, "role_card_id"
        )
        if role_card.profile_id != profile.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role card does not belong to profile",
            )
    if application_id:
        application = await get_by_id_or_404(
            db, Application, application_id, "application_id"
        )
        if application.jd_id != jd.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Application does not belong to job description",
            )

    return profile, jd


@router.post(
    "", response_model=ResumeVariantResponse, status_code=status.HTTP_201_CREATED
)
async def create_resume_variant(
    variant: ResumeVariantCreate, db: AsyncSession = Depends(get_db)
):
    """Create a JD-specific resume variant."""
    profile, jd = await _validate_variant_links(
        db,
        variant.profile_id,
        variant.jd_id,
        variant.role_card_id,
        variant.application_id,
    )
    role_card_id = (
        parse_uuid(variant.role_card_id, "role_card_id")
        if variant.role_card_id
        else None
    )
    application_id = (
        parse_uuid(variant.application_id, "application_id")
        if variant.application_id
        else None
    )

    db_variant = ResumeVariant(
        id=uuid4(),
        profile_id=profile.id,
        role_card_id=role_card_id,
        jd_id=jd.id,
        application_id=application_id,
        title=variant.title,
        language=variant.language,
        template_id=variant.template_id,
        content_markdown=variant.content_markdown,
        content_json=dump_json(variant.content_json),
        match_score=variant.match_score,
        keyword_hits_json=dump_json(variant.keyword_hits),
        gap_warnings_json=dump_json(variant.gap_warnings),
        generation_rationale=variant.generation_rationale,
        ai_provider=variant.ai_provider,
        ai_model=variant.ai_model,
        status=variant.status,
    )

    db.add(db_variant)
    await db.commit()
    await db.refresh(db_variant)
    return _variant_response(db_variant)


@router.get("", response_model=List[ResumeVariantResponse])
async def list_resume_variants(
    profile_id: str | None = None,
    jd_id: str | None = None,
    application_id: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """List JD-specific resume variants."""
    query = select(ResumeVariant)
    if profile_id:
        profile_uuid = parse_uuid(profile_id, "profile_id")
        query = query.where(ResumeVariant.profile_id == profile_uuid)
    if jd_id:
        jd_uuid = parse_uuid(jd_id, "jd_id")
        query = query.where(ResumeVariant.jd_id == jd_uuid)
    if application_id:
        application_uuid = parse_uuid(application_id, "application_id")
        query = query.where(ResumeVariant.application_id == application_uuid)
    query = query.offset(skip).limit(limit).order_by(ResumeVariant.updated_at.desc())
    result = await db.execute(query)
    return [_variant_response(variant) for variant in result.scalars().all()]


@router.get("/{variant_id}", response_model=ResumeVariantResponse)
async def get_resume_variant(variant_id: str, db: AsyncSession = Depends(get_db)):
    """Get a JD-specific resume variant."""
    variant = await get_by_id_or_404(db, ResumeVariant, variant_id, "variant_id")
    return _variant_response(variant)


@router.put("/{variant_id}", response_model=ResumeVariantResponse)
async def update_resume_variant(
    variant_id: str,
    variant: ResumeVariantUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a JD-specific resume variant."""
    db_variant = await get_by_id_or_404(db, ResumeVariant, variant_id, "variant_id")
    updates = variant.model_dump(exclude_unset=True)

    if "role_card_id" in updates and updates["role_card_id"]:
        role_card = await get_by_id_or_404(
            db, CandidateRoleCard, updates["role_card_id"], "role_card_id"
        )
        if role_card.profile_id != db_variant.profile_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role card does not belong to profile",
            )
        db_variant.role_card_id = role_card.id
        updates.pop("role_card_id")
    if "application_id" in updates and updates["application_id"]:
        application = await get_by_id_or_404(
            db, Application, updates["application_id"], "application_id"
        )
        if application.jd_id != db_variant.jd_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Application does not belong to job description",
            )
        db_variant.application_id = application.id
        updates.pop("application_id")

    json_fields = {
        "content_json": "content_json",
        "keyword_hits": "keyword_hits_json",
        "gap_warnings": "gap_warnings_json",
    }
    for field, value in updates.items():
        if field in json_fields:
            setattr(db_variant, json_fields[field], dump_json(value))
        else:
            setattr(db_variant, field, value)

    await db.commit()
    await db.refresh(db_variant)
    return _variant_response(db_variant)


@router.delete("/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume_variant(variant_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a JD-specific resume variant."""
    variant = await get_by_id_or_404(db, ResumeVariant, variant_id, "variant_id")
    await db.delete(variant)
    await db.commit()
    return None
