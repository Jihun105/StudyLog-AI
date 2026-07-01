"""add quiz source post reference

Revision ID: 81b5a3a47d90
Revises: af3fe9b8ff13
Create Date: 2026-07-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '81b5a3a47d90'
down_revision: Union[str, Sequence[str], None] = 'af3fe9b8ff13'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('quizzes', sa.Column('source_post_id', sa.Integer(), nullable=True))
    op.add_column('quizzes', sa.Column('source_title', sa.String(length=255), nullable=True))
    op.create_foreign_key(
        'fk_quizzes_source_post_id',
        'quizzes', 'posts',
        ['source_post_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_quizzes_source_post_id', 'quizzes', type_='foreignkey')
    op.drop_column('quizzes', 'source_title')
    op.drop_column('quizzes', 'source_post_id')
