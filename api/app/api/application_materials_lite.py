"""Application material pack API for SyncHire Lite."""

from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.local_first_helpers import dump_json, get_by_id_or_404, load_json
from app.api.utils_lite import parse_uuid
from app.core.database_lite import get_db
from app.models.application_lite import Application
from app.models.application_material_lite import ApplicationMaterial
from app.models.candidate_profile_lite import CandidateProfile
from app.models.jd_lite import JobDescription
from app.models.resume_variant_lite import ResumeVariant
from app.schemas.schemas_lite import (
    ApplicationMaterialCreate,
    ApplicationMaterialResponse,
    ApplicationMaterialUpdate,
)

router = APIRouter(prefix="/application-materials", tags=["application-materials"])


def _material_response(material: ApplicationMaterial) -> ApplicationMaterialResponse:
    return ApplicationMaterialResponse(
        id=str(material.id),
        profile_id=str(material.profile_id),
        jd_id=str(material.jd_id),
        resume_variant_id=(
            str(material.resume_variant_id) if material.resume_variant_id else None
        ),
        application_id=(
            str(material.application_id) if material.application_id else None
        ),
        language=material.language,
        platform=material.platform,
        form_fields=load_json(material.form_fields_json),
        cover_letter=material.cover_letter,
        opening_message=material.opening_message,
        self_introduction=material.self_introduction,
        checklist=load_json(material.checklist_json),
        review_status=material.review_status,
        created_at=material.created_at,
        updated_at=material.updated_at,
    )


async def _validate_material_links(
    db: AsyncSession,
    material: ApplicationMaterialCreate,
) -> tuple[CandidateProfile, JobDescription]:
    profile = await get_by_id_or_404(
        db, CandidateProfile, material.profile_id, "profile_id"
    )
    jd = await get_by_id_or_404(db, JobDescription, material.jd_id, "jd_id")
    if material.resume_variant_id:
        variant = await get_by_id_or_404(
            db, ResumeVariant, material.resume_variant_id, "variant_id"
        )
        if variant.profile_id != profile.id or variant.jd_id != jd.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume variant does not match profile and job description",
            )
    if material.application_id:
        application = await get_by_id_or_404(
            db, Application, material.application_id, "application_id"
        )
        if application.jd_id != jd.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Application does not belong to job description",
            )
    return profile, jd


@router.post(
    "",
    response_model=ApplicationMaterialResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_application_material(
    material: ApplicationMaterialCreate, db: AsyncSession = Depends(get_db)
):
    """Create an application material pack for manual review."""
    profile, jd = await _validate_material_links(db, material)
    db_material = ApplicationMaterial(
        id=uuid4(),
        profile_id=profile.id,
        jd_id=jd.id,
        resume_variant_id=(
            parse_uuid(material.resume_variant_id, "variant_id")
            if material.resume_variant_id
            else None
        ),
        application_id=(
            parse_uuid(material.application_id, "application_id")
            if material.application_id
            else None
        ),
        language=material.language,
        platform=material.platform,
        form_fields_json=dump_json(material.form_fields),
        cover_letter=material.cover_letter,
        opening_message=material.opening_message,
        self_introduction=material.self_introduction,
        checklist_json=dump_json(material.checklist),
        review_status=material.review_status,
    )

    db.add(db_material)
    await db.commit()
    await db.refresh(db_material)
    return _material_response(db_material)


@router.get("", response_model=List[ApplicationMaterialResponse])
async def list_application_materials(
    profile_id: str | None = None,
    jd_id: str | None = None,
    application_id: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """List application material packs."""
    query = select(ApplicationMaterial)
    if profile_id:
        profile_uuid = parse_uuid(profile_id, "profile_id")
        query = query.where(ApplicationMaterial.profile_id == profile_uuid)
    if jd_id:
        jd_uuid = parse_uuid(jd_id, "jd_id")
        query = query.where(ApplicationMaterial.jd_id == jd_uuid)
    if application_id:
        application_uuid = parse_uuid(application_id, "application_id")
        query = query.where(ApplicationMaterial.application_id == application_uuid)
    query = (
        query.offset(skip).limit(limit).order_by(ApplicationMaterial.updated_at.desc())
    )
    result = await db.execute(query)
    return [_material_response(material) for material in result.scalars().all()]


@router.get("/{material_id}", response_model=ApplicationMaterialResponse)
async def get_application_material(
    material_id: str, db: AsyncSession = Depends(get_db)
):
    """Get an application material pack."""
    material = await get_by_id_or_404(
        db, ApplicationMaterial, material_id, "material_id"
    )
    return _material_response(material)


@router.put("/{material_id}", response_model=ApplicationMaterialResponse)
async def update_application_material(
    material_id: str,
    material: ApplicationMaterialUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an application material pack."""
    db_material = await get_by_id_or_404(
        db, ApplicationMaterial, material_id, "material_id"
    )
    updates = material.model_dump(exclude_unset=True)

    if "resume_variant_id" in updates and updates["resume_variant_id"]:
        variant = await get_by_id_or_404(
            db, ResumeVariant, updates["resume_variant_id"], "variant_id"
        )
        if (
            variant.profile_id != db_material.profile_id
            or variant.jd_id != db_material.jd_id
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume variant does not match profile and job description",
            )
        db_material.resume_variant_id = variant.id
        updates.pop("resume_variant_id")
    if "application_id" in updates and updates["application_id"]:
        application = await get_by_id_or_404(
            db, Application, updates["application_id"], "application_id"
        )
        if application.jd_id != db_material.jd_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Application does not belong to job description",
            )
        db_material.application_id = application.id
        updates.pop("application_id")

    json_fields = {
        "form_fields": "form_fields_json",
        "checklist": "checklist_json",
    }
    for field, value in updates.items():
        if field in json_fields:
            setattr(db_material, json_fields[field], dump_json(value))
        else:
            setattr(db_material, field, value)

    await db.commit()
    await db.refresh(db_material)
    return _material_response(db_material)


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application_material(
    material_id: str, db: AsyncSession = Depends(get_db)
):
    """Delete an application material pack."""
    material = await get_by_id_or_404(
        db, ApplicationMaterial, material_id, "material_id"
    )
    await db.delete(material)
    await db.commit()
    return None
