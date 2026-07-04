from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

PRIORITY_VALUES = ("low", "medium", "high")


class TodoCreateRequest(BaseModel):
    title: str
    due_date: Optional[date] = None
    priority: str = "medium"
    start_time: Optional[str] = None  # "HH:MM"
    end_time: Optional[str] = None  # "HH:MM" - 안 넣으면 서비스에서 시작 시간 + 1시간으로 채움
    memo: Optional[str] = None


class TodoUpdateRequest(BaseModel):
    title: str
    due_date: Optional[date] = None
    priority: str = "medium"
    start_time: Optional[str] = None  # "HH:MM"
    end_time: Optional[str] = None  # "HH:MM" - 안 넣으면 서비스에서 시작 시간 + 1시간으로 채움
    memo: Optional[str] = None


class TodoReorderRequest(BaseModel):
    ordered_ids: List[int]


class TodoResponse(BaseModel):
    id: int
    title: str
    is_done: bool
    due_date: Optional[date] = None
    priority: str
    position: int
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    memo: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
