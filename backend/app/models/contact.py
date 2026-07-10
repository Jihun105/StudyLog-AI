from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.database import Base


class Contact(Base):
    """소개 페이지의 문의 폼으로 들어온 문의. 로그인 여부와 무관하게 누구나 제출할 수 있어서
    user_id는 없음(방문자 이메일/이름을 직접 입력받음). 이메일 알림 대신 관리자 대시보드의
    '문의함'에서 is_read로 안 읽은 문의를 구분해 확인하는 방식으로 운영."""

    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, nullable=False, server_default="0")
    created_at = Column(DateTime, server_default=func.now())
