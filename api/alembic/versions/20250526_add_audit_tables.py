"""add audit tables for GDPR compliance

Revision ID: 20250526_add_audit_tables
Revises:
Create Date: 2026-05-26

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20250526_add_audit_tables"
down_revision = None  # Set this to the previous migration ID
branch_labels = None
depends_on = None


def upgrade():
    """Create audit tables for GDPR compliance."""

    # Create audit_logs table
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("resource_type", sa.String(), nullable=False),
        sa.Column("resource_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("old_values", postgresql.JSONB(), nullable=True),
        sa.Column("new_values", postgresql.JSONB(), nullable=True),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("request_id", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.Index("ix_audit_logs_user_id", "user_id"),
        sa.Index("ix_audit_logs_action", "action"),
        sa.Index("ix_audit_logs_resource_type", "resource_type"),
        sa.Index("ix_audit_logs_resource_id", "resource_id"),
        sa.Index("ix_audit_logs_timestamp", "timestamp"),
    )

    # Create data_retention_logs table
    op.create_table(
        "data_retention_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("resource_type", sa.String(), nullable=False),
        sa.Column("resource_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("retention_period_days", sa.String(), nullable=False),
        sa.Column("deletion_reason", sa.String(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "backup_deleted", sa.Boolean(), nullable=False, server_default="false"
        ),
        sa.Column("gdpr_request_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Index("ix_data_retention_logs_user_id", "user_id"),
    )

    # Create consent_logs table
    op.create_table(
        "consent_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("consent_type", sa.String(), nullable=False),
        sa.Column("granted", sa.Boolean(), nullable=False),
        sa.Column("granted_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("legal_basis", sa.String(), nullable=False),
        sa.Column("privacy_policy_version", sa.String(), nullable=False),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Index("ix_consent_logs_user_id", "user_id"),
    )

    # Add comments for documentation
    op.execute(
        "COMMENT ON TABLE audit_logs IS 'Audit trail for GDPR compliance - tracks all data access and modifications'"
    )
    op.execute(
        "COMMENT ON TABLE data_retention_logs IS 'Data retention and deletion tracking for GDPR Article 7(3)'"
    )
    op.execute(
        "COMMENT ON TABLE consent_logs IS 'User consent tracking for GDPR Article 7 compliance'"
    )


def downgrade():
    """Drop audit tables."""

    op.drop_table("consent_logs")
    op.drop_table("data_retention_logs")
    op.drop_table("audit_logs")
