"""add OAuth accounts table

Revision ID: 20250526_add_oauth_accounts
Revises: 20250526_add_user_onboarding
Create Date: 2025-05-26 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250526_add_oauth_accounts'
down_revision = '20250526_add_user_onboarding'
branch_labels = None
depends_on = None


def upgrade():
    # Create oauth_accounts table
    op.create_table(
        'oauth_accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('provider', sa.String(), nullable=False),
        sa.Column('provider_user_id', sa.String(), nullable=False),
        sa.Column('access_token', sa.String(), nullable=True),
        sa.Column('refresh_token', sa.String(), nullable=True),
        sa.Column('account_info', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    )

    # Create indexes for OAuth account lookups
    op.create_index(op.f('ix_oauth_accounts_user_id'), 'oauth_accounts', ['user_id'], unique=False)
    op.create_index(op.f('ix_oauth_accounts_provider'), 'oauth_accounts', ['provider'], unique=False)

    # Create composite unique constraint for provider + provider_user_id
    op.create_unique_constraint('uq_oauth_provider_user_id', 'oauth_accounts', ['provider', 'provider_user_id'])


def downgrade():
    # Drop the oauth_accounts table
    op.drop_table('oauth_accounts')

    # Drop indexes
    op.drop_index(op.f('ix_oauth_accounts_user_id'), table_name='oauth_accounts')
    op.drop_index(op.f('ix_oauth_accounts_provider'), table_name='oauth_accounts')