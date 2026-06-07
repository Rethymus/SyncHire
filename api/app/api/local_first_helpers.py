"""Shared helpers for SyncHire lite local-first API routers."""

import json
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.utils_lite import parse_uuid


def dump_json(value: Any) -> str | None:
    """Serialize structured API data into SQLite text columns."""
    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False)


def load_json(raw: str | None, default: Any = None) -> Any:
    """Decode JSON text while tolerating older non-JSON lite records."""
    if raw in (None, ""):
        return default
    try:
        return json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return default


async def get_by_id_or_404(
    db: AsyncSession, model: type, value: str, field_name: str = "id"
):
    """Load a model by UUID and return client-facing errors."""
    object_id = parse_uuid(value, field_name)
    result = await db.execute(select(model).where(model.id == object_id))
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{field_name.replace('_id', '').replace('_', ' ').title()} not found",
        )
    return item
