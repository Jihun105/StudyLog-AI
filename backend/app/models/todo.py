from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.sql import func
from app.db.database import Base


class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    is_done = Column(Boolean, nullable=False, server_default="0")
    due_date = Column(Date, nullable=True)
    priority = Column(String(10), nullable=False, server_default="medium")  # low | medium | high
    position = Column(Integer, nullable=False, server_default="0")  # 드래그로 정한 정렬 순서
    start_time = Column(String(5), nullable=True)  # "HH:MM" 형태
    end_time = Column(String(5), nullable=True)  # "HH:MM" 형태 - 안 넣으면 서비스 레이어에서 시작+1시간으로 기본값 설정
    memo = Column(Text, nullable=True)  # 간략한 메모
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
