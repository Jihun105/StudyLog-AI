from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.post import PostCreateRequest, PostUpdateRequest
from app.services.post_service import get_posts, get_post, create_post, update_post, delete_post
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/posts", tags=["posts"])

@router.get("")
async def read_posts(page: int = 1, limit: int = 10, db: AsyncSession = Depends(get_db)):
    return await get_posts(page, limit, db)

@router.get("/{post_id}")
async def read_post(post_id: int, db: AsyncSession = Depends(get_db)):
    return await get_post(post_id, db)

@router.post("", status_code=201)
async def write_post(
    request: PostCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await create_post(request, current_user, db)

@router.put("/{post_id}")
async def modify_post(
    post_id: int,
    request: PostUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
): 
    return await update_post(post_id, request, current_user, db)

@router.delete("/{post_id}", status_code=204)
async def remove_post(
    post_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await delete_post(post_id, current_user, db)