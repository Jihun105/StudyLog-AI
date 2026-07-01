"""add quiz_type column and make options nullable

Revision ID: af3fe9b8ff13
Revises: bb7243571f75
Create Date: 2026-07-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'af3fe9b8ff13'
down_revision: Union[str, Sequence[str], None] = 'bb7243571f75'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 문제 유형(객관식/OX/빈칸) 컬럼 추가. 기존 행은 전부 객관식으로 만들어졌으므로 기본값 지정.
    op.add_column(
        'quizzes',
        sa.Column('quiz_type', sa.String(length=20), nullable=False, server_default='multiple_choice'),
    )
    # 빈칸 채우기 문제는 선택지가 없으므로 options를 nullable로 완화
    op.alter_column('quizzes', 'options', existing_type=sa.JSON(), nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('quizzes', 'options', existing_type=sa.JSON(), nullable=False)
    op.drop_column('quizzes', 'quiz_type')
