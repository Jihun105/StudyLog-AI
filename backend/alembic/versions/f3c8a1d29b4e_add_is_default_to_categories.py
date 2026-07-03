"""add is_default column to categories + backfill uncategorized posts into a real default category

Revision ID: f3c8a1d29b4e
Revises: e7a9c3f21b6d
Create Date: 2026-07-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3c8a1d29b4e'
down_revision: Union[str, Sequence[str], None] = 'e7a9c3f21b6d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'categories',
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    bind = op.get_bind()

    # 카테고리 없이 작성된(category_id IS NULL) 글이 있는 사용자별로 "기본" 카테고리를
    # 실제 폴더(카테고리 row)로 만들어주고, 그 글들을 전부 이 카테고리로 옮김.
    # ("기본"이 하드코딩된 화면 요소가 아니라 이름변경/삭제가 가능한 진짜 폴더가 되도록 하는 마이그레이션)
    user_ids = bind.execute(
        sa.text("SELECT DISTINCT user_id FROM posts WHERE category_id IS NULL")
    ).fetchall()

    for (user_id,) in user_ids:
        existing = bind.execute(
            sa.text(
                "SELECT id FROM categories WHERE user_id = :uid AND is_default = TRUE LIMIT 1"
            ),
            {"uid": user_id},
        ).fetchone()

        if existing:
            default_id = existing[0]
        else:
            result = bind.execute(
                sa.text(
                    "INSERT INTO categories (name, parent_id, user_id, is_default) "
                    "VALUES ('기본', NULL, :uid, TRUE)"
                ),
                {"uid": user_id},
            )
            default_id = result.lastrowid

        bind.execute(
            sa.text(
                "UPDATE posts SET category_id = :cid WHERE user_id = :uid AND category_id IS NULL"
            ),
            {"cid": default_id, "uid": user_id},
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('categories', 'is_default')
