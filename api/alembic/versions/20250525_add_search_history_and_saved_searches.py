"""add search history and saved searches

Revision ID: 20250525_add_search_history
Revises: 20250524_add_onboarding_fields
Create Date: 2025-05-25 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250525_add_search_history'
down_revision = '20250524_add_onboarding_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Create search_history table
    op.create_table(
        'search_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('search_type', sa.String(), nullable=False, server_default='resume'),
        sa.Column('filters', postgresql.JSONB(), nullable=True),
        sa.Column('result_count', sa.Integer(), server_default='0'),
        sa.Column('search_timestamp', sa.DateTime(), nullable=True),
        sa.Column('is_sensitive', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_search_history_user_id', 'search_history', ['user_id'])
    op.create_index('ix_search_history_search_timestamp', 'search_history', ['search_timestamp'])
    op.create_index('ix_search_history_user_timestamp', 'search_history', ['user_id', sa.text('search_timestamp DESC')], postgresql_using='btree')
    op.create_index('ix_search_history_user_type', 'search_history', ['user_id', 'search_type'])

    # Create saved_searches table
    op.create_table(
        'saved_searches',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('search_type', sa.String(), nullable=False, server_default='resume'),
        sa.Column('filters', postgresql.JSONB(), nullable=True),
        sa.Column('usage_count', sa.Integer(), server_default='0'),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('tags', postgresql.JSONB(), nullable=True),
        sa.Column('is_favorite', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_saved_searches_user_id', 'saved_searches', ['user_id'])
    op.create_index('ix_saved_searches_user_favorite', 'saved_searches', ['user_id', 'is_favorite'])
    op.create_index('ix_saved_searches_user_usage', 'saved_searches', ['user_id', sa.text('usage_count DESC')], postgresql_using='btree')

    # Create search_analytics table
    op.create_table(
        'search_analytics',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('search_term', sa.String(255), nullable=False),
        sa.Column('search_type', sa.String(), nullable=False),
        sa.Column('search_count', sa.Integer(), server_default='1'),
        sa.Column('last_searched_at', sa.DateTime(), nullable=True),
        sa.Column('avg_result_count', sa.Integer(), nullable=True),
        sa.Column('avg_search_duration', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_search_analytics_user_id', 'search_analytics', ['user_id'])
    op.create_index('ix_search_analytics_user_term', 'search_analytics', ['user_id', 'search_term'])
    op.create_index('ix_search_analytics_user_frequency', 'search_analytics', ['user_id', sa.text('search_count DESC')], postgresql_using='btree')


def downgrade():
    op.drop_table('search_analytics')
    op.drop_table('saved_searches')
    op.drop_table('search_history')