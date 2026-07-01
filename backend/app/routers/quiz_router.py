from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.quiz_service import generate_quiz, submit_attempt
from app.schemas.quiz import (
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizAttemptRequest,
    QuizAttemptResponse,
)
from app.core.dependencies import get_current_user
from app.core.limiter import limiter
from app.db.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/quizzes", tags=["quizzes"])


@router.post("/generate", response_model=QuizGenerateResponse)
@limiter.limit("5/minute")
async def create_quiz(
    request: Request,
    body: QuizGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quizzes = await generate_quiz(body.category_id, body.quiz_type, current_user.id, db)
    return {"quizzes": quizzes}


@router.post("/{quiz_id}/attempt", response_model=QuizAttemptResponse)
async def create_attempt(
    quiz_id: int,
    request: QuizAttemptRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await submit_attempt(quiz_id, request.user_answer, current_user.id, db)
