from fastapi import APIRouter, Depends, Query, BackgroundTasks
from app.services.ai.embedding_service import index_post, delete_post_index
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.post import PostCreateRequest, PostUpdateRequest
from app.services.post_service import get_posts, get_post, create_post, update_post, delete_post, get_all_tags
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/posts", tags=["posts"])

@router.get("")
async def read_posts(
    page: int = 1,
    limit: int = 10,
    keyword: Optional[str] = None,
    tags: Optional[List[str]] = Query(None),
    category_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  
):
    return await get_posts(page, limit, db, keyword, tags, current_user.id, category_id)

@router.get("/tags/all")
async def read_all_tags(
    category_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # 인증 추가
):
    return await get_all_tags(db, current_user.id, category_id)

@router.get("/{post_id}")
async def read_post(post_id: int, db: AsyncSession = Depends(get_db)):
    return await get_post(post_id, db)

@router.post("", status_code=201)
async def write_post(
    request: PostCreateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = await create_post(request, current_user, db)
    background_tasks.add_task(
        index_post,
        post_id=post["id"],
        user_id=current_user.id,
        title=post["title"],
        content=post["content"],
        category_path=post.get("category_path", ""),
    )
    return post

@router.put("/{post_id}")
async def modify_post(
    post_id: int,
    request: PostUpdateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = await update_post(post_id, request, current_user, db)
    background_tasks.add_task(
        index_post,
        post_id=post["id"],
        user_id=current_user.id,
        title=post["title"],
        content=post["content"],
        category_path=post.get("category_path", ""),
    )
    return post

@router.delete("/{post_id}", status_code=204)
async def remove_post(
    post_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await delete_post(post_id, current_user, db)
    background_tasks.add_task(delete_post_index, post_id=post_id)

