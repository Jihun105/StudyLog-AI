from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.db.database import Base


class Event(Base):
    """할 일(Todo)과는 별개인 '일정' - 체크박스 없이 시작일~종료일로 여러 날에 걸쳐 표시됨.
    달력 보기에서 이 Event들만 막대(bar) 형태로 이어서 보여줌."""

    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)  # start_date와 같으면 하루짜리 일정
    # 자유 입력 카테고리가 아니라, 프론트에서 고정된 8개 색상 중 하나를 직접 고른 값이 저장됨
    # (예: "blue", "rose" 등) - 컬럼/DB는 그대로 두고 의미만 "카테고리 문자열" -> "색상 키"로 바뀜
    category = Column(String(50), nullable=True)
    memo = Column(Text, nullable=True)  # 일정 등록 후 나중에 추가할 수 있는 세부사항
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
