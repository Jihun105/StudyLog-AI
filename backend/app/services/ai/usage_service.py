import logging
from datetime import datetime, timezone
from urllib.parse import urlparse

import pymysql
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.usage import OpenAIUsageLog

logger = logging.getLogger(__name__)

# 대략적인 가격표 (USD, 토큰 100만 개 기준). OpenAI 실제 청구서와 100% 일치하진 않는
# 추정치이고, 가격이 바뀌면 여기만 갱신하면 됨 (관리자 대시보드 표시 전용, 과금 자체와는 무관)
PRICING_PER_MILLION_TOKENS = {
    "text-embedding-3-small": {"input": 0.02, "output": 0.0},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
}


def _estimate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    price = PRICING_PER_MILLION_TOKENS.get(model, {"input": 0.0, "output": 0.0})
    return (prompt_tokens * price["input"] + completion_tokens * price["output"]) / 1_000_000


def record_usage(feature: str, model: str, prompt_tokens: int, completion_tokens: int = 0) -> None:
    """OpenAI 호출이 끝날 때마다 호출. 동기 함수라 async 서비스(chat/quiz)에서도,
    BackgroundTasks로 도는 동기 임베딩 코드에서도 그대로 쓸 수 있음(AsyncSession을
    새로 얻기 번거로운 곳이 많아 의도적으로 순수 pymysql 동기 커넥션을 짧게 열고 닫음).
    사용량 기록이 실패해도 실제 기능(임베딩/채팅/퀴즈 생성)에는 절대 영향 주면 안 되므로
    예외를 여기서 전부 삼킴."""
    try:
        cost = _estimate_cost(model, prompt_tokens, completion_tokens)
        # DATABASE_URL: mysql+aiomysql://user:pass@host:port/dbname -> pymysql이 이해할
        # 수 있는 순수 mysql:// 스킴으로 바꿔서 파싱
        parsed = urlparse(settings.DATABASE_URL.replace("mysql+aiomysql", "mysql"))
        conn = pymysql.connect(
            host=parsed.hostname,
            port=parsed.port or 3306,
            user=parsed.username,
            password=parsed.password,
            database=parsed.path.lstrip("/"),
            charset="utf8mb4",
        )
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO openai_usage_logs "
                    "(feature, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, created_at) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                    (
                        feature,
                        model,
                        prompt_tokens,
                        completion_tokens,
                        prompt_tokens + completion_tokens,
                        cost,
                        datetime.now(timezone.utc),
                    ),
                )
            conn.commit()
        finally:
            conn.close()
    except Exception:
        logger.exception("[usage] 사용량 기록 실패 (feature=%s, model=%s) - 무시하고 계속 진행", feature, model)


async def get_usage_summary(db: AsyncSession) -> dict:
    """관리자 대시보드용 - 이번 달 기능별 예상 비용 + 전체 합계."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(
            OpenAIUsageLog.feature,
            func.sum(OpenAIUsageLog.total_tokens).label("tokens"),
            func.sum(OpenAIUsageLog.estimated_cost_usd).label("cost"),
            func.count(OpenAIUsageLog.id).label("calls"),
        )
        .where(OpenAIUsageLog.created_at >= month_start)
        .group_by(OpenAIUsageLog.feature)
    )
    rows = result.all()

    by_feature = [
        {
            "feature": row.feature,
            "calls": row.calls,
            "total_tokens": int(row.tokens or 0),
            "estimated_cost_usd": round(float(row.cost or 0), 4),
        }
        for row in rows
    ]
    total_cost = round(sum(item["estimated_cost_usd"] for item in by_feature), 4)

    return {
        "month_start": month_start.date().isoformat(),
        "total_estimated_cost_usd": total_cost,
        "by_feature": by_feature,
    }
