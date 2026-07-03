from pydantic import BaseModel
from typing import List, Optional

class CategoryCreateRequest(BaseModel):
    name: str
    parent_id: Optional[int] = None

# 드래그 앤 드롭으로 폴더 순서/위치를 바꿀 때 - 사용자 소유 카테고리 전체를 새 상태로 보냄
class CategoryReorderItem(BaseModel):
    id: int
    parent_id: Optional[int] = None
    order_index: int

class CategoryReorderRequest(BaseModel):
    items: List[CategoryReorderItem]

class CategoryResponse(BaseModel):
    id: int
    name: str
    parent_id: Optional[int]
    user_id: int

    class Config:
        from_attributes = True

# 트리 구조로 반환할 때 사용 (하위 카테고리 포함)
class CategoryTreeResponse(BaseModel):
    id: int
    name: str
    parent_id: Optional[int]
    children: List["CategoryTreeResponse"] = []

    class Config:
        from_attributes = True

CategoryTreeResponse.model_rebuild()