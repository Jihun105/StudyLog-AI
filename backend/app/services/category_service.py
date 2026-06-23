from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from app.models.post import Category
from app.schemas.category import CategoryCreateRequest

async def get_categories(user_id: int, db: AsyncSession) -> list:
    # 최상위 카테고리만 가져오고, 하위 카테고리는 children으로 접근
    result = await db.execute(
        select(Category)
        .options(
            selectinload(Category.children)
            .selectinload(Category.children)
            .selectinload(Category.children)
        )
        .filter(Category.user_id == user_id, Category.parent_id == None)
        .order_by(Category.name)
    )
    return result.scalars().all()

async def get_depth(category_id: int, db: AsyncSession) -> int:
    depth = 1
    current_id = category_id
    while True:
        result = await db.execute(select(Category).filter(Category.id == current_id))
        category = result.scalar_one_or_none()
        if category is None or category.parent_id is None:
            break
        depth += 1
        current_id = category.parent_id
    return depth

async def create_category(request: CategoryCreateRequest, user_id: int, db: AsyncSession) -> Category:
    # 3단계 깊이 제한 체크
    if request.parent_id:
        parent_result = await db.execute(
            select(Category).filter(Category.id == request.parent_id, Category.user_id == user_id)
        )
        parent = parent_result.scalar_one_or_none()
        if parent is None:
            raise HTTPException(status_code=404, detail="부모 카테고리가 존재하지 않습니다.")
        
        # 부모의 깊이를 계산해서 3단계 초과 여부 확인
        depth = await get_depth(parent.id, db)
        if depth >= 3:
            raise HTTPException(status_code=400, detail="카테고리는 최대 3단계 까지만 만들 수 있습니다.")
        
    new_category = Category(
        name=request.name,
        parent_id=request.parent_id,
        user_id=user_id
    )
    db.add(new_category)
    await db.commit()
    await db.refresh(new_category)
    return new_category

async def delete_category(category_id: int, user_id: int, db: AsyncSession) -> None:
    result = await db.execute(
        select(Category).filter(Category.id == category_id, Category.user_id == user_id)
    )
    category = result.scalar_one_or_none()

    if category is None:
        raise HTTPException(status_code=404, detail="카테고리가 존재하지 않습니다.")
    
    # ON DELETE CASCADE로 하위 카테고리도 자동 삭제
    await db.delete(category)
    await db.commit()

async def rename_category(category_id: int, name: str, user_id: int, db: AsyncSession) -> Category:
    result = await db.execute(
        select(Category).filter(Category.id == category_id, Category.user_id == user_id)
    )
    category = result.scalar_one_or_none()

    if category is None:
        raise HTTPException(status_code=404, detail="카테고리가 존재하지 않습니다.")
    
    category.name = name
    await db.commit()
    await db.refresh(category)
    return category