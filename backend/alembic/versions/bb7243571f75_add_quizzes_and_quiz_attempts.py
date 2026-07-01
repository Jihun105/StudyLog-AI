"""add quizzes and quiz_attempts

Revision ID: bb7243571f75
Revises: 25336541123f
Create Date: 2026-07-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bb7243571f75'
down_revision: Union[str, Sequence[str], None] = '25336541123f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # quizzes / quiz_attempts 테이블은 Base.metadata.create_all()이 자동 생성함
    # (conversations/messages와 동일한 프로젝트 컨벤션). 여기서는 인덱스만 명시적으로 생성.
    op.create_index(op.f('ix_quizzes_id'), 'quizzes', ['id'], unique=False)
    op.create_index(op.f('ix_quiz_attempts_id'), 'quiz_attempts', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_quiz_attempts_id'), table_name='quiz_attempts')
    op.drop_index(op.f('ix_quizzes_id'), table_name='quizzes')
