from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import get_current_admin_user
from app.models.user import User
from app.schemas.contact import ContactResponse
from app.services.presence_service import presence_manager
from app.services.ai.usage_service import get_usage_summary
from app.services.contact_service import get_contacts, mark_contact_read
from app.services.maintenance_service import is_maintenance_on, enable_maintenance, disable_maintenance

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/online-users")
async def read_online_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    online_ids = presence_manager.get_online_user_ids()
    if not online_ids:
        return {"count": 0, "users": []}

    result = await db.execute(select(User).where(User.id.in_(online_ids)))
    users = result.scalars().all()
    return {
        "count": len(users),
        "users": [{"id": u.id, "username": u.username, "nickname": u.nickname} for u in users],
    }


@router.get("/usage-summary")
async def read_usage_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    return await get_usage_summary(db)


@router.get("/contacts", response_model=list[ContactResponse])
async def read_contacts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    return await get_contacts(db)


@router.patch("/contacts/{contact_id}/read", response_model=ContactResponse)
async def read_contact_mark_as_read(
    contact_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    return await mark_contact_read(contact_id, db)


# 점검모드 - nginx가 실제 차단을 담당하고, 여기는 관리자 대시보드에서 켜고 끄는 토글 API.
# /api/admin/ 경로는 nginx에서 점검모드 중에도 항상 우회되도록 예외 처리되어 있어서
# (frontend/nginx.conf 참고) 점검모드가 켜진 상태에서도 관리자는 이 API로 다시 끌 수 있음
@router.get("/maintenance")
async def read_maintenance_status(current_user: User = Depends(get_current_admin_user)):
    return {"enabled": is_maintenance_on()}


@router.post("/maintenance/on")
async def turn_on_maintenance(current_user: User = Depends(get_current_admin_user)):
    enable_maintenance()
    return {"enabled": True}


@router.post("/maintenance/off")
async def turn_off_maintenance(current_user: User = Depends(get_current_admin_user)):
    disable_maintenance()
    return {"enabled": False}
