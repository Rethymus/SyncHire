"""add password reset tokens table

Revision ID: 20250526_add_password_reset_tokens
Revises: 20250525_add_notifications_table
Create Date: 2026-05-26

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20250526_add_password_reset_tokens"
down_revision = "20250525_add_notifications_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create password_reset_tokens table
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="password_reset_tokens_user_id_fkey"
        ),
        sa.PrimaryKeyConstraint("id", name="password_reset_tokens_pkey"),
        sa.UniqueConstraint("token", name="password_reset_tokens_token_key"),
    )
    op.create_index(
        "password_reset_tokens_user_id_idx", "password_reset_tokens", ["user_id"]
    )
    op.create_index(
        "password_reset_tokens_expires_at_idx", "password_reset_tokens", ["expires_at"]
    )

    # Add comment for table
    op.execute(
        "COMMENT ON TABLE password_reset_tokens IS 'Password reset tokens for user authentication recovery'"
    )


def downgrade() -> None:
    op.drop_index(
        "password_reset_tokens_expires_at_idx", table_name="password_reset_tokens"
    )
    op.drop_index(
        "password_reset_tokens_user_id_idx", table_name="password_reset_tokens"
    )
    op.drop_table("password_reset_tokens")
