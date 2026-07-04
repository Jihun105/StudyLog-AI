"""add end_time column to todos

Revision ID: b7d4e0a91c23
Revises: a1b2c3d4e5f6
Create Date: 2026-07-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7d4e0a91c23'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('todos', sa.Column('end_time', sa.String(length=5), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('todos', 'end_time')
