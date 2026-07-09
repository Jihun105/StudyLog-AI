from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import get_current_admin_user
from app.models.user import User
from app.services.presence_service import presence_manager
from app.services.ai.usage_service import get_usage_summary

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
