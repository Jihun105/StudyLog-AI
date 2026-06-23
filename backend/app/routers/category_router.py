from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.category import CategoryCreateRequest, CategoryResponse, CategoryTreeResponse
from app.services.category_service import get_categories, create_category, delete_category, rename_category

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

# 카테고리 이름 수정
@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int, 
    request: CategoryCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await rename_category(category_id, request.name, current_user.id, db)

# 카테고리 삭제
@router.delete("/{category_id}", status_code=204)
async def remove_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await delete_category(category_id, current_user.id, db)