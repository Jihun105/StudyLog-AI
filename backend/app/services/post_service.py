from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from app.models.post import Post, Tag
from app.models.user import User
from app.schemas.post import PostCreateRequest, PostUpdateRequest

async def get_posts(page: int, limit: int, db: AsyncSession, keyword: str = None, tags: list[str] = None, current_user_id: int = None, category_id: int = None) -> dict:
    offset = (page - 1) * limit

    query = (
        select(Post)
        .options(selectinload(Post.tags), selectinload(Post.user))
        .order_by(Post.created_at.desc())
    )

    if current_user_id:
        query = query.where(Post.user_id == current_user_id)

    if keyword:
        query = query.where(Post.title.ilike(f"%{keyword}%"))

    if tags:
        query = query.where(Post.tags.any(Tag.name.in_(tags)))

    # 카테고리 필터 (중복 제거)
    if category_id is not None:
        if category_id == 0:
            query = query.where(Post.category_id == None)
        else:
            query = query.where(Post.category_id == category_id)

    count_query = select(Post)
    if current_user_id:
        count_query = count_query.where(Post.user_id == current_user_id)
    if keyword:
        count_query = count_query.where(Post.title.ilike(f"%{keyword}%"))
    if tags:
        count_query = count_query.join(Post.tags).where(Tag.name.in_(tags)).distinct()
    if category_id is not None:
        if category_id == 0:
            count_query = count_query.where(Post.category_id == None)
        else:
            count_query = count_query.where(Post.category_id == category_id)

    count_result = await db.execute(count_query)
    total = len(count_result.scalars().all())

    result = await db.execute(query.offset(offset).limit(limit))
    posts = result.scalars().all()

    return {
        "posts": [
            {
                "id": post.id,
                "title": post.title,
                "preview": post.content[:100],
                "nickname": post.user.nickname,
                "tags": [tag.name for tag in post.tags],
                "created_at": post.created_at,
                "category_id": post.category_id,
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
        user_id=current_user.id,
        category_id=request.category_id
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
    post.category_id = request.category_id

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

async def get_all_tags(db: AsyncSession) -> list[str]:
    # tags 테이블에서 전체 태그 이름을 알파벳/가나다 순으로 조회
    result = await db.execute(select(Tag).order_by(Tag.name))
    tags = result.scalars().all()
    return [tag.name for tag in tags]