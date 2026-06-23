from pydantic import BaseModel
from typing import List, Optional

class CategoryCreateRequest(BaseModel):
    name: str
    parent_id: Optional[int] = None

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