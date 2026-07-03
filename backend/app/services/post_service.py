import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from app.models.post import Post, Tag
from app.models.user import User
from app.schemas.post import PostCreateRequest, PostUpdateRequest
from app.services.category_service import get_category_subtree_ids, get_or_create_default_category
from app.utils.blocknote import extract_text_from_blocknote

def strip_html(html: str) -> str:
    return re.sub(r'<[^>]+>', '', html or '')

async def get_posts(page: int, limit: int, db: AsyncSession, keyword: str = None, tags: list[str] = None, current_user_id: int = None, category_id: int = None, include_subcategories: bool = False) -> dict:
    offset = (page - 1) * limit

    # include_subcategories가 True면 상위 폴더 선택 시 하위 폴더의 노트까지 포함(재귀 조회),
    # 기본값(False)이면 정확히 그 카테고리에 속한 노트만
    subtree_ids = None
    if category_id is not None and category_id != 0 and include_subcategories:
        subtree_ids = await get_category_subtree_ids(category_id, current_user_id, db)

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
        elif subtree_ids is not None:
            query = query.where(Post.category_id.in_(subtree_ids))
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
        elif subtree_ids is not None:
            count_query = count_query.where(Post.category_id.in_(subtree_ids))
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
                "preview": extract_text_from_blocknote(post.content)[:100],
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
        "category_id": post.category_id,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
    }

async def create_post(request: PostCreateRequest, current_user: User, db: AsyncSession) -> dict:
    # 카테고리를 고르지 않고 쓴 글은 "카테고리 없음" 상태로 두지 않고, 실제 폴더인
    # 사용자의 "기본" 카테고리로 자동 배정함 (다른 폴더와 동일하게 취급되는 진짜 폴더)
    category_id = request.category_id
    if category_id is None:
        default_category = await get_or_create_default_category(current_user.id, db)
        category_id = default_category.id

    new_post = Post(
        title=request.title,
        content=request.content,
        user_id=current_user.id,
        category_id=category_id
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
    if request.category_id is None:
        default_category = await get_or_create_default_category(current_user.id, db)
        post.category_id = default_category.id
    else:
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

async def move_post(post_id: int, category_id: int | None, current_user: User, db: AsyncSession) -> dict:
    """노트를 드래그해서 다른 폴더로 옮길 때 쓰는 가벼운 업데이트 - 카테고리만 바꿈.
    카테고리를 명시적으로 안 주면(None) 다른 흐름과 동일하게 "기본" 카테고리로 배정."""
    result = await db.execute(select(Post).filter(Post.id == post_id))
    post = result.scalar_one_or_none()

    if post is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 게시글입니다.")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")

    if category_id is None:
        default_category = await get_or_create_default_category(current_user.id, db)
        post.category_id = default_category.id
    else:
        post.category_id = category_id

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

async def get_all_tags(db: AsyncSession, user_id: int = None, category_id: int = None, include_subcategories: bool = False) -> list[str]:
    query = select(Tag).join(Tag.posts)

    if user_id:
        query = query.where(Post.user_id == user_id)

    # get_posts와 동일한 규칙: 상위 폴더 + include_subcategories=True면 하위 폴더 노트의 태그까지 포함
    if category_id is not None:
        if category_id == 0:
            query = query.where(Post.category_id == None)
        elif include_subcategories:
            subtree_ids = await get_category_subtree_ids(category_id, user_id, db)
            query = query.where(Post.category_id.in_(subtree_ids))
        else:
            query = query.where(Post.category_id == category_id)

    query = query.distinct().order_by(Tag.name)
    result = await db.execute(query)
    tags = result.scalars().all()
    return [tag.name for tag in tags]