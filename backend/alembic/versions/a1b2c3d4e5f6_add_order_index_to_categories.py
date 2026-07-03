"""add order_index column to categories + backfill by current alphabetical order

Revision ID: a1b2c3d4e5f6
Revises: f3c8a1d29b4e
Create Date: 2026-07-03 01:00:00.000000

"""
from typing import Sequence, Union
from collections import defaultdict

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f3c8a1d29b4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'categories',
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
    )

    bind = op.get_bind()

    # 기존 카테고리들은 전부 order_index=0으로 깔리므로, 지금까지 화면에 보이던 순서
    # (같은 부모 밑에서 이름순 정렬)를 그대로 유지하도록 형제 그룹별로 0, 1, 2... 값을 채워줌.
    # 이후로는 드래그 앤 드롭으로 이 값을 자유롭게 바꿀 수 있음.
    rows = bind.execute(
        sa.text("SELECT id, user_id, parent_id FROM categories")
    ).fetchall()

    groups = defaultdict(list)
    for row_id, user_id, parent_id in rows:
        groups[(user_id, parent_id)].append(row_id)

    # 그룹 내 정렬은 기존에 화면에서 쓰던 이름순과 맞추기 위해 name도 같이 가져와 정렬
    name_by_id = {
        row_id: name
        for row_id, name in bind.execute(sa.text("SELECT id, name FROM categories")).fetchall()
    }

    for (user_id, parent_id), ids in groups.items():
        ids_sorted = sorted(ids, key=lambda cid: name_by_id.get(cid, ""))
        for index, category_id in enumerate(ids_sorted):
            bind.execute(
                sa.text("UPDATE categories SET order_index = :idx WHERE id = :cid"),
                {"idx": index, "cid": category_id},
            )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('categories', 'order_index')
