from pydantic import BaseModel
from datetime import datetime
from typing import List


class ConversationListItem(BaseModel):
    id: int
    title: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationListResponse(BaseModel):
    conversations: List[ConversationListItem]


class MessageItem(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationMessagesResponse(BaseModel):
    conversation_id: int
    title: str
    messages: List[MessageItem]
