from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class EventCreateRequest(BaseModel):
    title: str
    start_date: date
    end_date: date
    category: Optional[str] = None
    memo: Optional[str] = None


class EventUpdateRequest(BaseModel):
    title: str
    start_date: date
    end_date: date
    category: Optional[str] = None
    memo: Optional[str] = None


class EventResponse(BaseModel):
    id: int
    title: str
    start_date: date
    end_date: date
    category: Optional[str] = None
    memo: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
