"""Small helpers shared by local-first API routers."""

from uuid import UUID

from fastapi import HTTPException, status


def parse_uuid(value: str, field_name: str = "id") -> UUID:
    """Parse a request UUID and return a client error instead of a server 500."""
    try:
        return UUID(str(value))
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        )
