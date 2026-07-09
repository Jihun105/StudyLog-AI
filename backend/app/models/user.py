from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    nickname = Column(String(50), unique=True, nullable=False)
    profile_image = Column(String(255), nullable=True)
    # 관리자 대시보드(접속 현황/OpenAI 사용량 등) 접근 권한. 일반 회원가입으로는 절대
    # true가 될 수 없고, DB에서 직접 켜야 함(별도 관리자 계정 체계가 아니라 기존 계정에
    # 플래그만 얹는 방식으로 결정함)
    is_admin = Column(Boolean, nullable=False, server_default="0")
    created_at = Column(DateTime, server_default=func.now())
# server_default : 데이터베이스(DB) 레벨에서 해당 컬럼의 기본값(DEFAULT)을 지정하는 설정

# from sqlalchemy.sql import func
# 데이터베이스가 자체적으로 제공하는 COUNT, SUM, AVG, MAX, MIN 같은 함수나, 현재 시간을 구하는 NOW() 같은 함수들을 편하게 호출할 수 있게 해줍니다.