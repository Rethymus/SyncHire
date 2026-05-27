"""
Extension Models

Provides interfaces for future cloud platform integrations and third-party services.
These are designed to be optional extensions that users can enable if needed.
"""

from datetime import datetime
from sqlalchemy import Column, DateTime, Text, String, UUID, Boolean
from sqlalchemy.sql import func

from app.core.database_lite import Base


class Extension(Base):
    """Extension registration for platform integrations."""

    __tablename__ = "extensions"

    id = Column(UUID, primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    display_name = Column(String(255), nullable=False)
    description = Column(Text)
    version = Column(String(50))
    enabled = Column(Boolean, default=False, nullable=False)
    config = Column(Text)  # JSON-encoded configuration
    last_sync = Column(DateTime(timezone=True))
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self):
        return f"<Extension(id={self.id}, name={self.name}, enabled={self.enabled})>"


class IntegrationLog(Base):
    """Log of integration activities for auditing."""

    __tablename__ = "integration_logs"

    id = Column(UUID, primary_key=True)
    extension_id = Column(UUID)
    action = Column(String(100), nullable=False)  # sync, backup, export, etc.
    status = Column(String(50), nullable=False)  # success, failure, pending
    details = Column(Text)  # JSON-encoded details
    timestamp = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self):
        return f"<IntegrationLog(id={self.id}, action={self.action}, status={self.status})>"
