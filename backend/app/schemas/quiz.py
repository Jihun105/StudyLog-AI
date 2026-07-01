from pydantic import BaseModel
from typing import List, Optional

QUIZ_TYPES = ("multiple_choice", "ox", "blank")


class QuizGenerateRequest(BaseModel):
    # None = 전체 노트, 0 = 미분류, 그 외 = 해당 카테고리 + 하위 카테고리 전체
    category_id: Optional[int] = None
    # "multiple_choice"(객관식) | "ox"(OX) | "blank"(빈칸 채우기)
    quiz_type: str = "multiple_choice"


class QuizQuestion(BaseModel):
    id: int
    quiz_type: str
    question: str
    options: Optional[List[str]] = None  # 빈칸형은 null
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
