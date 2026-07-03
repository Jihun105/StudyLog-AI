from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class PostCreateRequest(BaseModel):
    title: str
    content: str
    tags: List[str] = []
    category_id: Optional[int] = None

class PostUpdateRequest(BaseModel):
    title: str
    content: str
    tags: List[str] = []
    category_id: Optional[int] = None

# 노트를 드래그해서 다른 폴더로 옮길 때 - 카테고리만 가볍게 변경 (제목/본문 등은 그대로)
class PostMoveRequest(BaseModel):
    category_id: Optional[int] = None

class PostListItem(BaseModel):
    id: int
    title: str
    preview: str
    nickname: str
    tags: List[str]
    created_at: datetime

    class Config:
        from_attributes = True

class PostListResponse(BaseModel):
    posts: List[PostListItem]
    total: int
    page: int
    limit: int

class PostDetailResponse(BaseModel):
    id: int
    title: str
    content: str
    nickname: str
    tags: List[str]
    category_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True