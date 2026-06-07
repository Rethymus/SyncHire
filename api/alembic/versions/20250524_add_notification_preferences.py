"""add notification preferences

Revision ID: 20250524_add_notification_preferences
Revises: 20250524_add_onboarding_fields
Create Date: 2026-05-24 23:45:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20250524_add_notification_preferences"
down_revision: Union[str, None] = "20250524_add_onboarding_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add notification preferences column
    op.add_column(
        "users",
        sa.Column(
            "notification_preferences",
            postgresql.JSONB(
                nullable=True,
                default={
                    "email_enabled": True,
                    "application_status_updates": True,
                    "interview_reminders": True,
                    "weekly_digest": False,
                    "job_recommendations": True,
                    "profile_views": True,
                    "notification_frequency": "immediate",
                },
            ),
        ),
    )

    # Add email tracking columns
    op.add_column(
        "users",
        sa.Column(
            "email_unsubscribed", sa.Boolean(), nullable=False, server_default="false"
        ),
    )
    op.add_column(
        "users", sa.Column("email_unsubscribed_at", sa.DateTime(), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column(
            "email_bounced", sa.Boolean(), nullable=False, server_default="false"
        ),
    )
    op.add_column("users", sa.Column("email_bounced_at", sa.DateTime(), nullable=True))

    # Update existing users with default preferences
    op.execute("""
        UPDATE users
        SET notification_preferences = '{
            "email_enabled": true,
            "application_status_updates": true,
            "interview_reminders": true,
            "weekly_digest": false,
            "job_recommendations": true,
            "profile_views": true,
            "notification_frequency": "immediate"
        }'::jsonb
        WHERE notification_preferences IS NULL
    """)


def downgrade() -> None:
    # Remove email tracking columns
    op.drop_column("users", "email_bounced_at")
    op.drop_column("users", "email_bounced")
    op.drop_column("users", "email_unsubscribed_at")
    op.drop_column("users", "email_unsubscribed")

    # Remove notification preferences column
    op.drop_column("users", "notification_preferences")
