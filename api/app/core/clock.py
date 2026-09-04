"""Central clock for the backend.

`datetime.utcnow()` is deprecated (Python 3.12) and scheduled for removal;
`datetime.now(timezone.utc)` is the canonical replacement but returns an
AWARE datetime. This codebase stores and compares NAIVE UTC datetimes
(SQLAlchemy ``DateTime`` columns on SQLite/Postgres, ISO strings in JSON),
and mixing aware with naive values raises at comparison time.

Until the storage layer migrates to aware datetimes wholesale, every call
site goes through :func:`utcnow`, which returns exactly what
``datetime.utcnow()`` returned — naive UTC — with the deprecation gone and
the semantic decision documented in exactly one place.
"""

from datetime import datetime, timezone


def utcnow() -> datetime:
    """Current UTC time as a NAIVE datetime (drops tzinfo deliberately)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
