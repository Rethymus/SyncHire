"""
Lightweight Database Configuration for SQLite

This module provides SQLite-based database setup for local-first operation,
replacing the PostgreSQL-based system with a simpler, zero-config solution.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import MetaData, text
from sqlalchemy.engine import Connection
from app.core.config_lite import get_lite_settings

settings = get_lite_settings()

# Metadata with consistent naming convention
metadata = MetaData(
    naming_convention={
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }
)

Base = declarative_base(metadata=metadata)

# SQLite async engine with optimized settings
# Note: SQLite doesn't support connection pooling like PostgreSQL
engine = create_async_engine(
    settings.async_database_url,
    echo=settings.DEBUG,
    # SQLite-specific optimizations
    connect_args={
        "check_same_thread": False,  # Allow multi-threaded access
    },
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


def _sqlite_column_exists(conn: Connection, table_name: str, column_name: str) -> bool:
    rows = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
    return any(row[1] == column_name for row in rows)


def _sqlite_table_exists(conn: Connection, table_name: str) -> bool:
    result = conn.execute(
        text("SELECT name FROM sqlite_master WHERE type='table' AND name=:table"),
        {"table": table_name},
    )
    return result.scalar_one_or_none() is not None


def _add_column_if_missing(
    conn: Connection, table_name: str, column_name: str, definition: str
) -> None:
    if _sqlite_table_exists(conn, table_name) and not _sqlite_column_exists(
        conn, table_name, column_name
    ):
        conn.execute(
            text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}")
        )


def _run_lite_schema_migrations(conn: Connection) -> None:
    """Apply additive SQLite migrations for existing local lite databases."""
    additive_columns = {
        "job_descriptions": {
            "platform": "VARCHAR(50) NOT NULL DEFAULT 'manual'",
            "source_url": "TEXT",
            "raw_text": "TEXT",
            "parsed_json": "TEXT",
            "language": "VARCHAR(20) NOT NULL DEFAULT 'auto'",
            "deadline": "DATETIME",
            "notes": "TEXT",
        },
        "applications": {
            "resume_variant_id": "CHAR(32)",
            "materials_id": "CHAR(32)",
            "platform": "VARCHAR(50) NOT NULL DEFAULT 'manual'",
            "source_url": "TEXT",
            "submitted_manually_at": "DATETIME",
            "next_action": "VARCHAR(255)",
            "next_action_at": "DATETIME",
            "contact_name": "VARCHAR(255)",
            "contact_channel": "VARCHAR(255)",
            "timeline_json": "TEXT",
        },
    }

    for table_name, columns in additive_columns.items():
        for column_name, definition in columns.items():
            _add_column_if_missing(conn, table_name, column_name, definition)


async def get_db() -> AsyncSession:
    """
    Database session dependency.

    Provides a transactional scope for database operations.
    Automatically commits on success, rolls back on error.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """
    Initialize database tables.

    Creates all tables defined in the models.
    Should be called on application startup.

    For SQLite, this also enables performance optimizations:
    - WAL mode for better concurrency
    - Optimizations for single-user local access
    """
    async with engine.begin() as conn:
        # Enable SQLite performance optimizations
        await conn.execute(text("PRAGMA journal_mode=WAL"))
        await conn.execute(text("PRAGMA synchronous=NORMAL"))
        await conn.execute(text("PRAGMA cache_size=-64000"))  # 64MB cache
        await conn.execute(text("PRAGMA temp_store=MEMORY"))

        # Import all models to ensure they're registered with Base
        from app.models import (  # noqa: F401
            ai_provider_settings_lite,
            application_lite,
            application_material_lite,
            candidate_profile_item_lite,
            candidate_profile_lite,
            candidate_role_card_lite,
            extensions,
            jd_lite,
            local_profile,
            resume_export_lite,
            resume_lite,
            resume_variant_lite,
        )

        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_run_lite_schema_migrations)


async def close_db() -> None:
    """
    Close database connections.

    Should be called on application shutdown.
    """
    await engine.dispose()


def get_db_path() -> str:
    """Get the current database file path."""
    return str(settings.DATABASE_PATH)


def get_db_size() -> int:
    """Get database file size in bytes."""
    return (
        settings.DATABASE_PATH.stat().st_size if settings.DATABASE_PATH.exists() else 0
    )
