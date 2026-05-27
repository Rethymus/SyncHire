"""
Lightweight Database Configuration for SQLite

This module provides SQLite-based database setup for local-first operation,
replacing the PostgreSQL-based system with a simpler, zero-config solution.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import MetaData
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
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.execute("PRAGMA synchronous=NORMAL")
        await conn.execute("PRAGMA cache_size=-64000")  # 64MB cache
        await conn.execute("PRAGMA temp_store=MEMORY")

        # Import all models to ensure they're registered with Base
        from app.models import resume, jd, application  # noqa: F401

        # Create all tables
        await conn.run_sync(Base.metadata.create_all)


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
    return settings.DATABASE_PATH.stat().st_size if settings.DATABASE_PATH.exists() else 0
