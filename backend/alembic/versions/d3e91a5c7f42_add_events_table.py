"""add events table (no-op)

Revision ID: d3e91a5c7f42
Revises: c8f2a4d63e17
Create Date: 2026-07-07 00:00:00.000000

이 프로젝트는 새 테이블을 항상 앱 시작 시 Base.metadata.create_all()로 자동 생성하고,
Alembic 마이그레이션은 "기존" 테이블에 컬럼을 추가/변경할 때만 사용해왔음(다른 마이그레이션
파일들을 보면 create_table 호출이 전혀 없음). events 테이블도 새 테이블이라 create_all이
알아서 만들어주므로, 여기서 또 create_table을 하면 배포 스크립트가 "docker compose up"(백엔드
기동 -> create_all 실행) 다음에 "alembic upgrade head"를 실행하는 순서상 테이블이 이미 있어서
실패함. 그래서 이 리비전은 리비전 체인만 이어주는 no-op으로 둠.
"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = 'd3e91a5c7f42'
down_revision: Union[str, Sequence[str], None] = 'c8f2a4d63e17'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema. (no-op - events 테이블은 Base.metadata.create_all()이 생성함)"""
    pass


def downgrade() -> None:
    """Downgrade schema. (no-op)"""
    pass
