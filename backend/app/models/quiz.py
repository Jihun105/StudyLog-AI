from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    quiz_type = Column(String(20), nullable=False, server_default="multiple_choice")  # multiple_choice | ox | blank
    question = Column(Text, nullable=False)
    options = Column(JSON, nullable=True)  # 객관식: ["선택지1", ...4개], OX: ["O", "X"], 빈칸: null
    answer = Column(String(255), nullable=False)  # 객관식/OX는 options 중 하나, 빈칸은 정답 텍스트
    explanation = Column(Text, nullable=True)
    source_post_id = Column(Integer, ForeignKey("posts.id", ondelete="SET NULL"), nullable=True)  # 출처 글 (GPT 판단, 매칭 실패시 null)
    source_title = Column(String(255), nullable=True)  # GPT가 답한 원본 제목 (글이 삭제돼도 표시용으로 남겨둠)
    created_at = Column(DateTime, server_default=func.now())

    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    user_answer = Column(String(255), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    # 추후 스페이스드 리피티션: next_review_at 컬럼 추가 예정

    quiz = relationship("Quiz", back_populates="attempts")
