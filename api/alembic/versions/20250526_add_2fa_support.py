"""Add 2FA support to users table

Revision ID: 20250526_add_2fa_support
Revises: 20250526_add_password_reset_tokens
Create Date: 2026-05-26 14:30:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY


# revision identifiers, used by Alembic.
revision = "20250526_add_2fa_support"
down_revision = "20250526_add_password_reset_tokens"
branch_labels = None
depends_on = None


def upgrade():
    # Add 2FA related columns to users table
    op.add_column(
        "users",
        sa.Column(
            "two_factor_enabled", sa.Boolean(), nullable=False, server_default="false"
        ),
    )
    op.add_column("users", sa.Column("two_factor_secret", sa.String(), nullable=True))
    op.add_column("users", sa.Column("backup_codes", ARRAY(sa.String()), nullable=True))
    op.add_column(
        "users",
        sa.Column("two_factor_enabled_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Create index for faster 2FA queries
    op.create_index("ix_users_two_factor_enabled", "users", ["two_factor_enabled"])


def downgrade():
    # Drop the index
    op.drop_index("ix_users_two_factor_enabled", table_name="users")

    # Remove 2FA columns from users table
    op.drop_column("users", "two_factor_enabled_at")
    op.drop_column("users", "backup_codes")
    op.drop_column("users", "two_factor_secret")
    op.drop_column("users", "two_factor_enabled")
