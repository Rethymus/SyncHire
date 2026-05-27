"""
Password Reset Token Model

Stores password reset tokens for user authentication recovery.
"""

from sqlalchemy import Column, DateTime, Boolean, String, UUID
from sqlalchemy.sql import func

from app.core.database import Base


class PasswordResetToken(Base):
    """Password reset token model"""

    __tablename__ = "password_reset_tokens"

    id = Column(UUID, primary_key=True)
    user_id = Column(UUID, nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self):
        return f"<PasswordResetToken(id={self.id}, user_id={self.user_id}, token={self.token[:8]}...)>"
