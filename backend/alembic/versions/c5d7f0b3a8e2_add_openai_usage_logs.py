"""add openai_usage_logs table

Revision ID: c5d7f0b3a8e2
Revises: b2f6e8a4c9d1
Create Date: 2026-07-09 00:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5d7f0b3a8e2'
down_revision: Union[str, Sequence[str], None] = 'b2f6e8a4c9d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'openai_usage_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('feature', sa.String(length=30), nullable=False),
        sa.Column('model', sa.String(length=50), nullable=False),
        sa.Column('prompt_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('completion_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('estimated_cost_usd', sa.Float(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_openai_usage_logs_id'), 'openai_usage_logs', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_openai_usage_logs_id'), table_name='openai_usage_logs')
    op.drop_table('openai_usage_logs')
