from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.db.database import Base


class OpenAIUsageLog(Base):
    """관리자 대시보드에서 'OpenAI 이번 달 예상 비용이 얼마인지' 보여주기 위한 자체 기록.
    OpenAI 실제 청구서와 100% 일치하진 않는 추정치이지만, 기능별(임베딩/채팅/퀴즈) 비용
    breakdown까지 볼 수 있어서 어디서 비용이 많이 나가는지 파악하는 용도로는 충분함.
    user_id는 넣지 않음 - "누가 얼마 썼는지"가 아니라 "전체 서비스가 얼마 쓰는지"가 목적."""

    __tablename__ = "openai_usage_logs"

    id = Column(Integer, primary_key=True, index=True)
    feature = Column(String(30), nullable=False)  # "embedding" | "chat" | "quiz"
    model = Column(String(50), nullable=False)
    prompt_tokens = Column(Integer, nullable=False, server_default="0")
    completion_tokens = Column(Integer, nullable=False, server_default="0")
    total_tokens = Column(Integer, nullable=False, server_default="0")
    estimated_cost_usd = Column(Float, nullable=False, server_default="0")
    created_at = Column(DateTime, server_default=func.now())
