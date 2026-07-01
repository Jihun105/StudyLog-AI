import json
import logging
import random
import re
from datetime import datetime, timedelta
from openai import AsyncOpenAI
from sqlalchemy import select, delete, exists
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.core.config import settings
from app.models.post import Post, Category
from app.models.quiz import Quiz, QuizAttempt
from app.utils.blocknote import extract_text_from_blocknote

logger = logging.getLogger(__name__)

openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

QUESTION_COUNT = 5
CONTENT_CHAR_LIMIT = 8000
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
    "blank": (
        "빈칸 채우기 문제로 만들어줘. 각 문제는 question(문장 속 핵심 단어나 구절 자리를 ___로 표시), "
        "options는 null, answer(빈칸에 들어갈 정답 단어/구절), explanation(정답 설명) 필드를 가진 JSON 객체로 만들어줘."
    ),
}


async def _get_category_subtree_ids(category_id: int, user_id: int, db: AsyncSession) -> list[int]:
    ids = [category_id]
    result = await db.execute(
        select(Category.id).filter(Category.parent_id == category_id, Category.user_id == user_id)
    )
    for child_id in result.scalars().all():
        ids.extend(await _get_category_subtree_ids(child_id, user_id, db))
    return ids


async def _collect_notes_text(category_id: int | None, user_id: int, db: AsyncSession) -> tuple[str, dict[str, int]]:
    """
    반환값: (GPT에 넘길 노트 텍스트, {제목: post_id} 매핑)
    매핑은 나중에 GPT가 답한 출처 제목을 실제 post_id로 역추적하는 데 사용.
    """
    query = select(Post).filter(Post.user_id == user_id).order_by(Post.created_at.desc())

    if category_id is not None:
        if category_id == 0:
            query = query.filter(Post.category_id == None)
        else:
            subtree_ids = await _get_category_subtree_ids(category_id, user_id, db)
            query = query.filter(Post.category_id.in_(subtree_ids))

    result = await db.execute(query)
    posts = result.scalars().all()

    if not posts:
        raise HTTPException(status_code=404, detail="해당 카테고리에 작성된 글이 없습니다.")

    chunks = []
    title_to_post_id = {}
    total_len = 0
    for post in posts:
        text = f"[{post.title}]\n{extract_text_from_blocknote(post.content)}"
        if total_len + len(text) > CONTENT_CHAR_LIMIT:
            break
        chunks.append(text)
        title_to_post_id[post.title] = post.id
        total_len += len(text)

    return "\n\n---\n\n".join(chunks), title_to_post_id


def _normalize_answer(text: str) -> str:
    """빈칸 채우기 채점용 정규화: 공백 제거 + 소문자화"""
    return re.sub(r"\s+", "", text or "").strip().lower()


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


async def generate_quiz(category_id: int | None, quiz_type: str, user_id: int, db: AsyncSession) -> list[Quiz]:
    if quiz_type not in QUIZ_TYPE_INSTRUCTIONS:
        raise HTTPException(status_code=400, detail="지원하지 않는 문제 유형입니다.")

    await _cleanup_stale_quizzes(user_id, db)

    notes_text, title_to_post_id = await _collect_notes_text(category_id, user_id, db)

    system_prompt = (
        f"너는 사용자의 공부 노트를 기반으로 퀴즈를 만드는 AI야. "
        f"아래 노트 내용을 참고해서 문제 {QUESTION_COUNT}개를 만들어줘.\n"
        f"{QUIZ_TYPE_INSTRUCTIONS[quiz_type]}\n"
        "추가로 각 문제는 source_title 필드도 포함해줘 — 그 문제의 근거가 된 노트의 제목을, "
        "아래 [노트 내용]에 있는 대괄호 안 제목([제목] 형태)과 정확히 똑같은 문자열로 적어줘. "
        "여러 노트 내용이 섞인 문제면 가장 핵심적인 노트 하나만 골라줘.\n"
        '{"quizzes": [...]} 형태의 JSON으로만 응답해. 다른 말은 절대 덧붙이지 마.\n\n'
        f"[노트 내용]\n{notes_text}"
    )

    response = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": system_prompt}],
        response_format={"type": "json_object"},
    )

    try:
        parsed = json.loads(response.choices[0].message.content)
        raw_quizzes = parsed["quizzes"]
    except (json.JSONDecodeError, KeyError, TypeError):
        logger.exception("[quiz] GPT 응답 파싱 실패")
        raise HTTPException(status_code=502, detail="퀴즈 생성에 실패했습니다. 다시 시도해주세요.")

    stored_category_id = category_id if category_id not in (None, 0) else None

    quizzes = []
    for item in raw_quizzes:
        options = item.get("options")

        # 객관식은 GPT가 정답을 특정 위치에 몰아서 낼 수 있으니, 응답을 받은 뒤 우리 쪽에서 한 번 더 섞음
        if quiz_type == "multiple_choice" and options:
            options = list(options)
            random.shuffle(options)

        source_title = item.get("source_title")
        # GPT가 답한 제목이 실제 수집한 노트 제목과 정확히 일치할 때만 post_id 연결 (실패해도 제목 텍스트는 남김)
        source_post_id = title_to_post_id.get(source_title) if source_title else None

        quiz = Quiz(
            user_id=user_id,
            category_id=stored_category_id,
            quiz_type=quiz_type,
            question=item["question"],
            options=options,
            answer=item["answer"],
            explanation=item.get("explanation"),
            source_post_id=source_post_id,
            source_title=source_title,
        )
        db.add(quiz)
        quizzes.append(quiz)

    await db.commit()
    for quiz in quizzes:
        await db.refresh(quiz)

    logger.info(
        "[quiz] user_id=%s category_id=%s quiz_type=%s -> %d문제 생성 (출처 매칭 %d/%d)",
        user_id, category_id, quiz_type, len(quizzes),
        sum(1 for q in quizzes if q.source_post_id), len(quizzes),
    )
    return quizzes


async def submit_attempt(quiz_id: int, user_answer: str, user_id: int, db: AsyncSession) -> dict:
    result = await db.execute(select(Quiz).filter(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()

    if quiz is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 퀴즈입니다.")
    if quiz.user_id != user_id:
        raise HTTPException(status_code=403, detail="본인 퀴즈가 아닙니다.")

    if quiz.quiz_type == "blank":
        # 빈칸 채우기는 자유 텍스트라 공백/대소문자 차이는 정답으로 인정
        is_correct = _normalize_answer(user_answer) == _normalize_answer(quiz.answer)
    else:
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
