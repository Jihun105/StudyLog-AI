from pydantic import BaseModel
from typing import List, Optional

QUIZ_TYPES = ("multiple_choice", "ox")


class QuizGenerateRequest(BaseModel):
    # None = 전체 노트, 0 = 미분류, 그 외 = 해당 카테고리 + 하위 카테고리 전체
    # post_ids가 지정되면 category_id는 무시하고 지정된 글들로만 퀴즈를 생성함
    category_id: Optional[int] = None
    # "multiple_choice"(객관식) | "ox"(OX)
    quiz_type: str = "multiple_choice"
    # 사용자가 직접 검색해서 고른 글 id 목록 (지정 시 category_id보다 우선)
    post_ids: Optional[List[int]] = None


class QuizQuestion(BaseModel):
    id: int
    quiz_type: str
    question: str
    options: Optional[List[str]] = None
    source_post_id: Optional[int] = None  # 출처 글 id (매칭 안 되면 null)
    source_title: Optional[str] = None  # 출처 글 제목 (GPT 판단, 참고용)

    class Config:
        from_attributes = True


class QuizGenerateResponse(BaseModel):
    quizzes: List[QuizQuestion]


class QuizAttemptRequest(BaseModel):
    user_answer: str


class QuizAttemptResponse(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: Optional[str] = None
