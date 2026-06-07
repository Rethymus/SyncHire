"""
AI provider settings model for local-first operation.

The lite product may use local AI, deterministic fallback generation, or a
user-approved cloud provider. Plaintext API keys are not persisted in this
table; only a local reference is stored.
"""

from sqlalchemy import Boolean, Column, DateTime, String, UUID
from sqlalchemy.sql import func

from app.core.database_lite import Base


class AIProviderSettings(Base):
    """Local AI provider configuration metadata."""

    __tablename__ = "ai_provider_settings"

    id = Column(UUID, primary_key=True)
    provider = Column(String(100), nullable=False)
    mode = Column(String(30), default="fallback", nullable=False)
    display_name = Column(String(255))
    base_url = Column(String(500))
    model_name = Column(String(100))
    api_key_ref = Column(String(500))
    enabled = Column(Boolean, default=False, nullable=False)
    send_confirmation_required = Column(Boolean, default=True, nullable=False)
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
        return f"<AIProviderSettings(id={self.id}, provider={self.provider})>"
