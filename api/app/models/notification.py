"""
Notification Model

Stores in-app notifications for users
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class NotificationType(str, enum.Enum):
    """Notification types."""

    SUCCESS = "success"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class Notification(Base):
    """Notification model for in-app notifications."""

    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type = Column(
        SQLEnum(NotificationType), nullable=False, default=NotificationType.INFO
    )
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    read = Column(Boolean, default=False, index=True)
    action_url = Column(String(500), nullable=True)
    metadata = Column(JSONB, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    read_at = Column(DateTime, nullable=True)

    # Relationship to user
    user = relationship("User", back_populates="notifications")

    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, type={self.type}, title={self.title}, read={self.read})>"
