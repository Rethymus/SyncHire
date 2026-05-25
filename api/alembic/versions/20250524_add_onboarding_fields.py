"""add onboarding fields

Revision ID: 20250524_add_onboarding_fields
Revises: 20250521_performance_indexes
Create Date: 2026-05-24 23:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250524_add_onboarding_fields'
down_revision = '20250521_performance_indexes'
branch_labels = None
depends_on = None


def upgrade():
    # Add onboarding fields to users table
    op.add_column('users', sa.Column('is_onboarded', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('users', sa.Column('onboarding_completed_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    # Remove onboarding fields from users table
    op.drop_column('users', 'onboarding_completed_at')
    op.drop_column('users', 'is_onboarded')
