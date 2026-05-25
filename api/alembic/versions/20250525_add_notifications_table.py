"""add notifications table

Revision ID: 20250525_add_notifications_table
Revises: 20250524_add_notification_preferences
Create Date: 2026-05-25 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

# revision identifiers, used by Alembic.
revision = '20250525_add_notifications_table'
down_revision = '20250524_add_notification_preferences'
branch_labels = None
depends_on = None


def upgrade():
    """Create notifications table."""
    op.create_table(
        'notifications',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.Enum('success', 'info', 'warning', 'error', name='notificationtype'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('read', sa.Boolean(), default=False, nullable=False),
        sa.Column('action_url', sa.String(500), nullable=True),
        sa.Column('metadata', JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('read_at', sa.DateTime(), nullable=True),
    )

    # Create indexes for better query performance
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_read', 'notifications', ['read'])
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])


def downgrade():
    """Drop notifications table."""
    op.drop_table('notifications')
    # Drop the enum type
    op.execute('DROP TYPE IF EXISTS notificationtype')
