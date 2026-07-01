from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.quiz_service import generate_quiz, submit_attempt
from app.schemas.quiz import (
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizAttemptRequest,
    QuizAttemptResponse,
)
from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/quizzes", tags=["quizzes"])


@router.post("/generate", response_model=QuizGenerateResponse)
async def create_quiz(
    request: QuizGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quizzes = await generate_quiz(request.category_id, request.quiz_type, current_user.id, db)
    return {"quizzes": quizzes}


@router.post("/{quiz_id}/attempt", response_model=QuizAttemptResponse)
async def create_attempt(
    quiz_id: int,
    request: QuizAttemptRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await submit_attempt(quiz_id, request.user_answer, current_user.id, db)
