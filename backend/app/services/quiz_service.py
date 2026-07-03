import asyncio
import json
import logging
import random
from datetime import datetime, timedelta
from openai import AsyncOpenAI
from sqlalchemy import select, delete, exists
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.core.config import settings
from app.models.post import Post
from app.models.quiz import Quiz, QuizAttempt
from app.services.category_service import get_category_subtree_ids
from app.utils.blocknote import extract_text_from_blocknote

logger = logging.getLogger(__name__)

openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

QUESTION_COUNT = 10
MAX_SOURCE_NOTES = 5  # 한 번에 문제를 뽑아올 노트 수 상한 (직접 선택 시에도 동일하게 적용)
PER_NOTE_CHAR_LIMIT = 4000  # 노트 하나당 GPT에 넘기는 최대 글자 수 (비용 고정용)
STALE_QUIZ_DAYS = 30  # 이 기간 넘도록 한 번도 안 푼 퀴즈는 정리 대상

QUIZ_TYPE_INSTRUCTIONS = {
    "multiple_choice": (
        "4지선다 객관식 문제로 만들어줘. 각 문제는 question(문제), "
        "options(선택지 문자열 4개짜리 배열, 정답 위치는 매번 무작위로 섞어줘), "
        "answer(options 중 정답과 정확히 일치하는 문자열), explanation(정답 설명) 필드를 가진 JSON 객체로 만들어줘."
    ),
    "ox": (
        "OX(참/거짓 판별) 문제로 만들어줘. 각 문제는 question(참 또는 거짓을 판단할 수 있는 서술형 문장), "
        'options는 ["O", "X"] 고정, answer는 "O" 또는 "X" 중 하나, explanation(정답 설명) 필드를 가진 JSON 객체로 만들어줘.'
    ),
}


async def _collect_candidate_posts(
    category_id: int | None, post_ids: list[int] | None, user_id: int, db: AsyncSession
) -> list[Post]:
    """퀴즈를 뽑아올 후보 노트 목록을 가져옴.
    post_ids가 있으면(사용자가 직접 글을 선택한 경우) 그 글들만 후보로 삼고,
    없으면 기존처럼 카테고리(+하위 전체)/미분류/전체 기준으로 후보를 모음."""
    if post_ids:
        result = await db.execute(
            select(Post).filter(Post.user_id == user_id, Post.id.in_(post_ids))
        )
        return result.scalars().all()

    query = select(Post).filter(Post.user_id == user_id).order_by(Post.created_at.desc())
    if category_id is not None:
        if category_id == 0:
            query = query.filter(Post.category_id == None)
        else:
            subtree_ids = await get_category_subtree_ids(category_id, user_id, db)
            query = query.filter(Post.category_id.in_(subtree_ids))

    result = await db.execute(query)
    return result.scalars().all()


def _distribute_question_counts(total: int, note_count: int) -> list[int]:
    """total개의 문제를 note_count개의 글에 최대한 고르게 분배.
    예: 5문제를 노트 3개에 나누면 -> [2, 2, 1]. 나머지는 앞쪽 글부터 하나씩 더 받음."""
    base, remainder = divmod(total, note_count)
    return [base + 1 if i < remainder else base for i in range(note_count)]


async def _generate_questions_for_post(post: Post, quiz_type: str, count: int) -> list[dict]:
    """글 하나의 내용만 가지고 GPT를 한 번 호출해서 문제 count개를 만듦.
    (여러 글을 8000자로 뭉쳐서 한 번에 뽑던 기존 방식 대신 글 단위로 나눠서 뽑기 때문에,
    출처가 100% 확정적이고 - 기존의 GPT 자기 보고 + 텍스트 매칭 방식이 필요 없음 -
    글 하나하나의 내용을 온전히 활용할 수 있음)"""
    text = extract_text_from_blocknote(post.content)[:PER_NOTE_CHAR_LIMIT]

    system_prompt = (
        f"너는 사용자의 공부 노트를 기반으로 퀴즈를 만드는 AI야. "
        f"아래는 '{post.title}'라는 노트의 내용이야. 이 노트 내용만 참고해서 문제 {count}개를 만들어줘.\n"
        f"{QUIZ_TYPE_INSTRUCTIONS[quiz_type]}\n"
        '{"quizzes": [...]} 형태의 JSON으로만 응답해. 다른 말은 절대 덧붙이지 마.\n\n'
        f"[노트 내용]\n{text}"
    )

    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": system_prompt}],
            response_format={"type": "json_object"},
        )
        parsed = json.loads(response.choices[0].message.content)
        return parsed["quizzes"][:count]
    except (json.JSONDecodeError, KeyError, TypeError, IndexError):
        logger.exception("[quiz] post_id=%s GPT 응답 파싱 실패 - 이 글은 건너뜀", post.id)
        return []


async def _cleanup_stale_quizzes(user_id: int, db: AsyncSession) -> int:
    """STALE_QUIZ_DAYS일 넘도록 한 번도 안 푼(QuizAttempt가 없는) 퀴즈를 정리"""
    cutoff = datetime.utcnow() - timedelta(days=STALE_QUIZ_DAYS)
    has_attempt = exists().where(QuizAttempt.quiz_id == Quiz.id)

    stmt = delete(Quiz).where(
        Quiz.user_id == user_id,
        Quiz.created_at < cutoff,
        ~has_attempt,
    )
    result = await db.execute(stmt)
    await db.commit()

    if result.rowcount:
        logger.info("[quiz] user_id=%s: 시도 기록 없는 %d개월 이상 지난 퀴즈 %d개 정리", user_id, STALE_QUIZ_DAYS // 30, result.rowcount)

    return result.rowcount


async def generate_quiz(
    category_id: int | None, quiz_type: str, user_id: int, db: AsyncSession, post_ids: list[int] | None = None
) -> list[Quiz]:
    if quiz_type not in QUIZ_TYPE_INSTRUCTIONS:
        raise HTTPException(status_code=400, detail="지원하지 않는 문제 유형입니다.")

    await _cleanup_stale_quizzes(user_id, db)

    candidates = await _collect_candidate_posts(category_id, post_ids, user_id, db)
    if not candidates:
        detail = "선택한 글이 없습니다." if post_ids else "해당 카테고리에 작성된 글이 없습니다."
        raise HTTPException(status_code=404, detail=detail)

    # 총 QUESTION_COUNT개의 문제를 최대 MAX_SOURCE_NOTES개의 글에서 뽑음. 후보가 더 많으면
    # 랜덤으로 MAX_SOURCE_NOTES개를 고르고, 더 적으면(예: 3개) 있는 글들로 문제를 나눠서 채움
    # (직접 글을 선택한 경우엔 프론트에서 이미 MAX_SOURCE_NOTES개 이하로 제한해서 넘어옴)
    selected = random.sample(candidates, min(MAX_SOURCE_NOTES, len(candidates)))
    counts = _distribute_question_counts(QUESTION_COUNT, len(selected))

    # 글 단위로 GPT 호출을 병렬 실행 (최대 MAX_SOURCE_NOTES개, 순차 호출보다 훨씬 빠름)
    results = await asyncio.gather(
        *[_generate_questions_for_post(post, quiz_type, count) for post, count in zip(selected, counts)]
    )

    # 직접 글을 골라서 낸 경우엔 특정 카테고리에 묶이지 않으므로 category_id는 저장하지 않음
    stored_category_id = category_id if (not post_ids and category_id not in (None, 0)) else None

    quizzes = []
    for post, raw_items in zip(selected, results):
        for item in raw_items:
            options = item.get("options")

            # 객관식은 GPT가 정답을 특정 위치에 몰아서 낼 수 있으니, 응답을 받은 뒤 우리 쪽에서 한 번 더 섞음
            if quiz_type == "multiple_choice" and options:
                options = list(options)
                random.shuffle(options)

            quiz = Quiz(
                user_id=user_id,
                category_id=stored_category_id,
                quiz_type=quiz_type,
                question=item["question"],
                options=options,
                answer=item["answer"],
                explanation=item.get("explanation"),
                source_post_id=post.id,  # 글 단위로 생성하므로 출처가 100% 확정적
                source_title=post.title,
            )
            db.add(quiz)
            quizzes.append(quiz)

    if not quizzes:
        raise HTTPException(status_code=502, detail="퀴즈 생성에 실패했습니다. 다시 시도해주세요.")

    await db.commit()
    for quiz in quizzes:
        await db.refresh(quiz)

    logger.info(
        "[quiz] user_id=%s category_id=%s post_ids=%s quiz_type=%s -> 글 %d개에서 %d문제 생성",
        user_id, category_id, post_ids, quiz_type, len(selected), len(quizzes),
    )
    return quizzes


async def submit_attempt(quiz_id: int, user_answer: str, user_id: int, db: AsyncSession) -> dict:
    result = await db.execute(select(Quiz).filter(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()

    if quiz is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 퀴즈입니다.")
    if quiz.user_id != user_id:
        raise HTTPException(status_code=403, detail="본인 퀴즈가 아닙니다.")

    is_correct = user_answer.strip() == quiz.answer.strip()

    attempt = QuizAttempt(
        user_id=user_id,
        quiz_id=quiz_id,
        user_answer=user_answer,
        is_correct=is_correct,
    )
    db.add(attempt)
    await db.commit()

    return {
        "is_correct": is_correct,
        "correct_answer": quiz.answer,
        "explanation": quiz.explanation,
    }
