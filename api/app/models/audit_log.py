"""
Audit Log Model for GDPR Compliance

This model tracks all data access and modifications for compliance requirements.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class AuditAction(str, enum.Enum):
    """Types of auditable actions."""

    CREATE = "CREATE"
    READ = "READ"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    EXPORT = "EXPORT"
    AUTH_LOGIN = "AUTH_LOGIN"
    AUTH_LOGOUT = "AUTH_LOGOUT"
    AUTH_FAILED = "AUTH_FAILED"
    PASSWORD_CHANGE = "PASSWORD_CHANGE"
    PASSWORD_RESET = "PASSWORD_RESET"
    DATA_DOWNLOAD = "DATA_DOWNLOAD"
    DATA_DELETION = "DATA_DELETION"
    CONSENT_GRANTED = "CONSENT_GRANTED"
    CONSENT_REVOKED = "CONSENT_REVOKED"


class ResourceType(str, enum.Enum):
    """Types of resources that can be audited."""

    USER = "user"
    RESUME = "resume"
    JD = "jd"
    APPLICATION = "application"
    NOTIFICATION = "notification"
    SEARCH = "search"
    INTERVIEW = "interview"
    OAUTH_ACCOUNT = "oauth_account"


class AuditLog(Base):
    """
    Audit log for tracking all data access and modifications.

    This table maintains a comprehensive audit trail for GDPR compliance,
    including:
    - Who accessed data (user_id)
    - What action was performed (action)
    - What resource was affected (resource_type, resource_id)
    - What changed (old_values, new_values)
    - When and where (timestamp, ip_address, user_agent)
    """

    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), nullable=True, index=True
    )  # nullable for system actions
    action = Column(String, nullable=False, index=True)  # AuditAction enum
    resource_type = Column(String, nullable=False, index=True)  # ResourceType enum
    resource_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    # Track data changes
    old_values = Column(JSONB, nullable=True)  # Previous state for UPDATE/DELETE
    new_values = Column(JSONB, nullable=True)  # New state for CREATE/UPDATE

    # Request metadata
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    request_id = Column(String, nullable=True)  # For tracing related logs

    # Additional context
    description = Column(Text, nullable=True)  # Human-readable description
    request_metadata = Column(
        JSONB, nullable=True
    )  # Additional context (renamed from metadata to avoid SQLAlchemy conflict)

    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])


class DataRetentionLog(Base):
    """
    Track data retention and deletion activities for GDPR Article 7(3) compliance.
    """

    __tablename__ = "data_retention_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    resource_type = Column(String, nullable=False)
    resource_id = Column(UUID(as_uuid=True), nullable=False)

    # Retention policy
    retention_period_days = Column(
        String, nullable=False
    )  # e.g., "30", "365", "indefinite"
    deletion_reason = Column(
        String, nullable=False
    )  # "gdpr_request", "policy_expiry", "user_request"

    # Deletion tracking
    deleted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    deleted_by = Column(UUID(as_uuid=True), nullable=True)  # User or system ID
    backup_deleted = Column(Boolean, default=False)  # Whether backups were also deleted

    # Compliance
    gdpr_request_id = Column(String, nullable=True)  # Link to specific GDPR request

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ConsentLog(Base):
    """
    Track user consent for GDPR Article 7 compliance.
    """

    __tablename__ = "consent_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Consent details
    consent_type = Column(
        String, nullable=False
    )  # "marketing", "analytics", "data_processing"
    granted = Column(Boolean, nullable=False)

    # Timestamps
    granted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    revoked_at = Column(DateTime, nullable=True)

    # Legal basis
    legal_basis = Column(
        String, nullable=False
    )  # "consent", "contract", "legal_obligation"
    privacy_policy_version = Column(
        String, nullable=False
    )  # Version of policy accepted

    # Request metadata
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
