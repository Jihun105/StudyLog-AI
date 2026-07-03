from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from app.models.post import Category
from app.schemas.category import CategoryCreateRequest

async def get_or_create_default_category(user_id: int, db: AsyncSession) -> Category:
    """사용자의 "기본" 카테고리를 반환. 없으면 새로 만듦.
    다른 폴더와 완전히 동일한 진짜 카테고리 row이고(이름변경/삭제 다 가능),
    is_default 플래그로만 "카테고리 선택 안 하고 쓴 글"의 기본 배정 대상임을 표시함.
    이름을 바꿔도 is_default는 그대로 유지되므로 계속 기본 배정 대상으로 동작함."""
    result = await db.execute(
        select(Category).filter(Category.user_id == user_id, Category.is_default == True)
    )
    default_category = result.scalar_one_or_none()
    if default_category is not None:
        return default_category

    default_category = Category(name="기본", parent_id=None, user_id=user_id, is_default=True)
    db.add(default_category)
    await db.commit()
    await db.refresh(default_category)
    return default_category

async def get_categories(user_id: int, db: AsyncSession) -> list:
    # 기본 카테고리가 없다면 먼저 만들어둠 (진짜 폴더이므로 아래 조회에 자연스럽게 포함됨)
    await get_or_create_default_category(user_id, db)

    # 최상위 카테고리만 가져오고, 하위 카테고리는 children으로 접근.
    # 정렬은 order_index 기준(드래그 앤 드롭으로 정한 순서) - 하위 카테고리 정렬은
    # Category.children relationship에 이미 order_by가 걸려 있어서 자동으로 적용됨
    result = await db.execute(
        select(Category)
        .options(
            selectinload(Category.children)
            .selectinload(Category.children)
            .selectinload(Category.children)
        )
        .filter(Category.user_id == user_id, Category.parent_id == None)
        .order_by(Category.order_index)
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

    # 새 폴더는 같은 부모 아래 형제들 맨 뒤에 추가되도록 order_index를 형제 수만큼으로 설정
    sibling_count_result = await db.execute(
        select(Category).filter(Category.user_id == user_id, Category.parent_id == request.parent_id)
    )
    order_index = len(sibling_count_result.scalars().all())

    new_category = Category(
        name=request.name,
        parent_id=request.parent_id,
        user_id=user_id,
        order_index=order_index,
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

async def reorder_categories(items: list, user_id: int, db: AsyncSession) -> list:
    """드래그 앤 드롭으로 바뀐 폴더 순서/위치를 한 번에 반영.
    items: [{id, parent_id, order_index}, ...] - 프론트엔드가 사용자 소유 카테고리 전체를
    새 상태로 재계산해서 통째로 보내줌(부분 diff 대신 전체 스냅샷 방식이라 상태 불일치 위험이 없음).
    """
    # 1) 소유권 확인 - 요청에 들어있는 id가 전부 이 사용자 것인지 검증
    result = await db.execute(select(Category).filter(Category.user_id == user_id))
    my_categories = {c.id: c for c in result.scalars().all()}

    proposed_parent = {}
    for item in items:
        if item["id"] not in my_categories:
            raise HTTPException(status_code=404, detail="존재하지 않는 카테고리가 포함되어 있습니다.")
        proposed_parent[item["id"]] = item.get("parent_id")

    # 2) 사이클/깊이 검증 - 제출된 parent_id 체인을 따라가며 자기 자신으로 되돌아오거나(순환),
    # 3단계를 초과하는 경우를 막음
    for item in items:
        category_id = item["id"]
        depth = 1
        current_id = proposed_parent.get(category_id)
        visited = {category_id}
        while current_id is not None:
            if current_id in visited:
                raise HTTPException(status_code=400, detail="폴더를 자기 자신의 하위로 이동할 수 없습니다.")
            visited.add(current_id)
            depth += 1
            if depth > 3:
                raise HTTPException(status_code=400, detail="카테고리는 최대 3단계 까지만 만들 수 있습니다.")
            # 제출된 목록에 있으면 그 값을 쓰고, 없으면(이번에 안 움직인 카테고리) DB에 저장된 값을 씀
            current_id = proposed_parent.get(current_id, my_categories.get(current_id).parent_id if current_id in my_categories else None)

    # 3) 검증 통과 - 실제로 반영
    for item in items:
        category = my_categories[item["id"]]
        category.parent_id = item.get("parent_id")
        category.order_index = item.get("order_index", 0)

    await db.commit()
    return list(my_categories.values())

async def get_category_subtree_ids(category_id: int, user_id: int, db: AsyncSession) -> list[int]:
    """category_id 자신 + 모든 하위 카테고리 id를 재귀적으로 모아서 반환."""
    ids = [category_id]
    result = await db.execute(
        select(Category.id).filter(Category.parent_id == category_id, Category.user_id == user_id)
    )
    for child_id in result.scalars().all():
        ids.extend(await get_category_subtree_ids(child_id, user_id, db))
    return ids

async def get_category_path(category_id: int, db: AsyncSession) -> str:
    """카테고리 ID -> '머신러닝 > 선형대수 > 기초개념' 형태 문자열"""
    parts = []
    current_id = category_id
    while current_id is not None:
        result = await db.execute(select(Category).filter(Category.id == current_id))
        category = result.scalar_one_or_none()
        if category is None:
            break
        parts.append(category.name)
        current_id = category.parent_id

    return " > ".join(reversed(parts))