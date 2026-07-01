from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.conversation_service import list_conversations, get_conversation_with_messages
from app.schemas.conversation import ConversationListResponse, ConversationMessagesResponse
from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("", response_model=ConversationListResponse)
async def read_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversations = await list_conversations(current_user.id, db)
    return {"conversations": conversations}


@router.get("/{conversation_id}/messages", response_model=ConversationMessagesResponse)
async def read_conversation_messages(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation, messages = await get_conversation_with_messages(
        conversation_id, current_user.id, db
    )
    return {
        "conversation_id": conversation.id,
        "title": conversation.title,
        "messages": messages,
    }
