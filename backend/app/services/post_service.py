from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from app.models.post import Post, Tag
from app.models.user import User
from app.schemas.post import PostCreateRequest, PostUpdateRequest

async def get_posts(page: int, limit:int, db: AsyncSession) -> dict:
    offset = (page -1) * limit

    result = await db.execute(
        select(Post)
        .options(selectinload(Post.tags), selectinload(Post.user))
        .offset(offset)
        .limit(limit)
        .order_by(Post.created_at.desc())
    )

    posts = result.scalars().all()

    count_result = await db.execute(select(Post))
    total = len(count_result.scalars().all())

    return {
        "posts": [
            {
                "id": post.id,
                "title": post.title,
                "preview": post.content[:100],
                "nickname": post.user.nickname,
                "tags": [tag.name for tag in post.tags],
                "created_at": post.created_at,
            }
            for post in posts
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }

async def get_post(post_id: int, db: AsyncSession) -> dict:
    result = await db.execute(
        select(Post)
        .options(selectinload(Post.tags), selectinload(Post.user))
        .filter(Post.id == post_id)
    )
    post = result.scalar_one_or_none()

    if post is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 게시글입니다.")
    
    return {
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "nickname": post.user.nickname,
        "tags": [tag.name for tag in post.tags],
        "created_at": post.created_at,
        "updated_at": post.updated_at,
    }

async def create_post(request: PostCreateRequest, current_user: User, db: AsyncSession) -> dict:
    new_post = Post(
        title=request.title,
        content=request.content,
        user_id=current_user.id
    )

    tags = []
    for tag_name in request.tags:
        result = await db.execute(select(Tag).filter(Tag.name == tag_name))
        tag = result.scalar_one_or_none()
        if tag is None:
            tag = Tag(name=tag_name)
            db.add(tag)
            await db.flush()
        tags.append(tag)

    new_post.tags = tags
    db.add(new_post)
    await db.commit()
    await db.refresh(new_post)

    return await get_post(new_post.id, db)

async def update_post(post_id: int, request: PostUpdateRequest, current_user: User, db: AsyncSession) -> dict:
    result = await db.execute(
        select(Post)
        .options(selectinload(Post.tags))
        .filter(Post.id == post_id)
    )
    post = result.scalar_one_or_none()

    if post is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 게시글입니다.")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")
    
    post.title = request.title
    post.content = request.content

    tags = []
    for tag_name in request.tags:
        result = await db.execute(select(Tag).filter(Tag.name == tag_name))
        tag = result.scalar_one_or_none()
        if tag is None:
            tag = Tag(name=tag_name)
            db.add(tag)
            await db.flush()
        tags.append(tag)

    post.tags = tags
    await db.commit()

    return await get_post(post_id, db)

async def delete_post(post_id: int, current_user: User, db: AsyncSession) -> None:
    result = await db.execute(select(Post).filter(Post.id == post_id))
    post = result.scalar_one_or_none()

    if post is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 게시글입니다.")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")
    
    await db.delete(post)
    await db.commit()
