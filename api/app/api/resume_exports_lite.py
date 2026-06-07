"""Resume export API for SyncHire Lite."""

from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.local_first_helpers import get_by_id_or_404
from app.api.utils_lite import parse_uuid
from app.core.database_lite import get_db
from app.models.resume_export_lite import ResumeExport
from app.models.resume_variant_lite import ResumeVariant
from app.schemas.schemas_lite import (
    ResumeExportCreate,
    ResumeExportResponse,
    ResumeExportUpdate,
)

router = APIRouter(prefix="/resume-exports", tags=["resume-exports"])


def _export_response(export: ResumeExport) -> ResumeExportResponse:
    return ResumeExportResponse(
        id=str(export.id),
        resume_variant_id=str(export.resume_variant_id),
        export_format=export.export_format,
        file_path=export.file_path,
        file_name=export.file_name,
        checksum=export.checksum,
        byte_size=export.byte_size,
        status=export.status,
        created_at=export.created_at,
        updated_at=export.updated_at,
    )


@router.post(
    "", response_model=ResumeExportResponse, status_code=status.HTTP_201_CREATED
)
async def create_resume_export(
    export: ResumeExportCreate, db: AsyncSession = Depends(get_db)
):
    """Create a resume export record."""
    variant = await get_by_id_or_404(
        db, ResumeVariant, export.resume_variant_id, "variant_id"
    )
    db_export = ResumeExport(
        id=uuid4(),
        resume_variant_id=variant.id,
        export_format=export.export_format,
        file_path=export.file_path,
        file_name=export.file_name,
        checksum=export.checksum,
        byte_size=export.byte_size,
        status=export.status,
    )

    db.add(db_export)
    await db.commit()
    await db.refresh(db_export)
    return _export_response(db_export)


@router.get("", response_model=List[ResumeExportResponse])
async def list_resume_exports(
    resume_variant_id: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """List resume export records."""
    query = select(ResumeExport)
    if resume_variant_id:
        variant_uuid = parse_uuid(resume_variant_id, "variant_id")
        query = query.where(ResumeExport.resume_variant_id == variant_uuid)
    query = query.offset(skip).limit(limit).order_by(ResumeExport.updated_at.desc())
    result = await db.execute(query)
    return [_export_response(export) for export in result.scalars().all()]


@router.get("/{export_id}", response_model=ResumeExportResponse)
async def get_resume_export(export_id: str, db: AsyncSession = Depends(get_db)):
    """Get a resume export record."""
    export = await get_by_id_or_404(db, ResumeExport, export_id, "export_id")
    return _export_response(export)


@router.put("/{export_id}", response_model=ResumeExportResponse)
async def update_resume_export(
    export_id: str,
    export: ResumeExportUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a resume export record."""
    db_export = await get_by_id_or_404(db, ResumeExport, export_id, "export_id")
    for field, value in export.model_dump(exclude_unset=True).items():
        setattr(db_export, field, value)

    await db.commit()
    await db.refresh(db_export)
    return _export_response(db_export)


@router.delete("/{export_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume_export(export_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a resume export record."""
    export = await get_by_id_or_404(db, ResumeExport, export_id, "export_id")
    await db.delete(export)
    await db.commit()
    return None
