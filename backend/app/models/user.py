from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    nickname = Column(String(50), unique=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
# server_default : 데이터베이스(DB) 레벨에서 해당 컬럼의 기본값(DEFAULT)을 지정하는 설정

# from sqlalchemy.sql import func
# 데이터베이스가 자체적으로 제공하는 COUNT, SUM, AVG, MAX, MIN 같은 함수나, 현재 시간을 구하는 NOW() 같은 함수들을 편하게 호출할 수 있게 해줍니다.