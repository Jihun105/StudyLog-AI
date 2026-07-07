from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.category import CategoryCreateRequest, CategoryUpdateRequest, CategoryResponse, CategoryTreeResponse, CategoryReorderRequest
from app.services.category_service import get_categories, create_category, delete_category, update_category, reorder_categories
from app.services.ai.embedding_service import delete_post_index

router = APIRouter(prefix="/api/categories", tags=["categories"])

# 내 카테고리 트리 전체 조회
@router.get("", response_model=list[CategoryTreeResponse])
async def read_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await get_categories(current_user.id, db)

# 카테고리 생성
@router.post("", response_model=CategoryResponse, status_code=201)
async def write_category(
    request: CategoryCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await create_category(request, current_user.id, db)

# 카테고리 이름 수정 / 색상 변경 (둘 다 선택 필드라 보낸 것만 반영됨)
@router.patch("/{category_id}", response_model=CategoryResponse)
async def edit_category(
    category_id: int,
    request: CategoryUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await update_category(category_id, current_user.id, db, name=request.name, color=request.color)

# 카테고리 삭제 (하위 폴더 + 그 안의 노트까지 전부 같이 삭제됨)
@router.delete("/{category_id}", status_code=204)
async def remove_category(
    category_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deleted_post_ids = await delete_category(category_id, current_user.id, db)
    for post_id in deleted_post_ids:
        background_tasks.add_task(delete_post_index, post_id=post_id)

# 드래그 앤 드롭으로 바뀐 폴더 순서/위치를 한 번에 반영 (전체 스냅샷 방식)
@router.put("/reorder", response_model=list[CategoryResponse])
async def reorder_category_tree(
    request: CategoryReorderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = [item.model_dump() for item in request.items]
    return await reorder_categories(items, current_user.id, db)