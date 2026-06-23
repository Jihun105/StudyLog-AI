from pydantic import BaseModel
from datetime import datetime
from typing import List

class PostCreateRequest(BaseModel):
    title: str
    content: str
    tags: List[str] = []

class PostUpdateRequest(BaseModel):
    title: str
    content: str
    tags: List[str] = []

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
    created_at: datetime
    updated_at:datetime
    
    class Config: 
        from_attributes = True