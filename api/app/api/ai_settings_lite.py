"""AI provider settings API for SyncHire Lite."""

from typing import List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.local_first_helpers import get_by_id_or_404
from app.core.database_lite import get_db
from app.models.ai_provider_settings_lite import AIProviderSettings
from app.schemas.schemas_lite import (
    AIProviderSettingsCreate,
    AIProviderSettingsResponse,
    AIProviderSettingsUpdate,
)

router = APIRouter(prefix="/ai-settings", tags=["ai-settings"])


def _api_key_ref_for(settings_id: UUID, provider: str) -> str:
    return f"local-secret://ai-provider-settings/{provider}/{settings_id}"


def _settings_response(
    settings: AIProviderSettings,
) -> AIProviderSettingsResponse:
    return AIProviderSettingsResponse(
        id=str(settings.id),
        provider=settings.provider,
        mode=settings.mode,
        display_name=settings.display_name,
        base_url=settings.base_url,
        model_name=settings.model_name,
        enabled=settings.enabled,
        send_confirmation_required=settings.send_confirmation_required,
        has_api_key=bool(settings.api_key_ref),
        created_at=settings.created_at,
        updated_at=settings.updated_at,
    )


@router.post(
    "",
    response_model=AIProviderSettingsResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_ai_settings(
    settings: AIProviderSettingsCreate, db: AsyncSession = Depends(get_db)
):
    """Create local AI provider settings without returning plaintext secrets."""
    settings_id = uuid4()
    api_key_ref = settings.api_key_ref
    if settings.api_key and not api_key_ref:
        api_key_ref = _api_key_ref_for(settings_id, settings.provider)

    db_settings = AIProviderSettings(
        id=settings_id,
        provider=settings.provider,
        mode=settings.mode.value,
        display_name=settings.display_name,
        base_url=settings.base_url,
        model_name=settings.model_name,
        api_key_ref=api_key_ref,
        enabled=settings.enabled,
        send_confirmation_required=settings.send_confirmation_required,
    )

    db.add(db_settings)
    await db.commit()
    await db.refresh(db_settings)
    return _settings_response(db_settings)


@router.get("", response_model=List[AIProviderSettingsResponse])
async def list_ai_settings(
    skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)
):
    """List local AI provider settings."""
    result = await db.execute(
        select(AIProviderSettings)
        .offset(skip)
        .limit(limit)
        .order_by(AIProviderSettings.updated_at.desc())
    )
    return [_settings_response(settings) for settings in result.scalars().all()]


@router.get("/{settings_id}", response_model=AIProviderSettingsResponse)
async def get_ai_settings(settings_id: str, db: AsyncSession = Depends(get_db)):
    """Get local AI provider settings."""
    settings = await get_by_id_or_404(
        db, AIProviderSettings, settings_id, "settings_id"
    )
    return _settings_response(settings)


@router.put("/{settings_id}", response_model=AIProviderSettingsResponse)
async def update_ai_settings(
    settings_id: str,
    settings: AIProviderSettingsUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update local AI provider settings without exposing plaintext secrets."""
    db_settings = await get_by_id_or_404(
        db, AIProviderSettings, settings_id, "settings_id"
    )
    updates = settings.model_dump(exclude_unset=True)

    if "api_key" in updates:
        api_key = updates.pop("api_key")
        db_settings.api_key_ref = (
            _api_key_ref_for(db_settings.id, db_settings.provider) if api_key else None
        )
    if "api_key_ref" in updates:
        db_settings.api_key_ref = updates.pop("api_key_ref")

    for field, value in updates.items():
        if field == "mode" and value is not None:
            db_settings.mode = value.value
        else:
            setattr(db_settings, field, value)

    await db.commit()
    await db.refresh(db_settings)
    return _settings_response(db_settings)


@router.delete("/{settings_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ai_settings(settings_id: str, db: AsyncSession = Depends(get_db)):
    """Delete local AI provider settings."""
    settings = await get_by_id_or_404(
        db, AIProviderSettings, settings_id, "settings_id"
    )
    await db.delete(settings)
    await db.commit()
    return None
