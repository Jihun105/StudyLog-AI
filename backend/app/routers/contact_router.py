from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.limiter import limiter
from app.schemas.contact import ContactCreateRequest, ContactResponse
from app.services.contact_service import create_contact

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


# 소개 페이지의 문의 폼 - 로그인 여부와 무관하게 누구나 제출 가능(비회원 방문자도 문의할 수 있어야 함).
# 로그인 없이 누구나 두드릴 수 있는 공개 엔드포인트라 스팸/봇 남용 방지로 IP 기준 rate limit을 건다.
@router.post("", response_model=ContactResponse, status_code=201)
@limiter.limit("5/minute")
async def submit_contact(
    request: Request,
    body: ContactCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    return await create_contact(body, db)
