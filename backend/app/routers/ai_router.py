from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.ai.graph_service import chat
from app.services.conversation_service import get_or_create_conversation, get_recent_messages
from app.core.dependencies import get_current_user
from app.core.limiter import limiter
from app.db.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/ai", tags=["ai"])

class ChatRequest(BaseModel):
    query: str
    conversation_id: int | None = None

@router.post("/chat")
@limiter.limit("10/minute")
async def chat_endpoint(
    request: Request,
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = await get_or_create_conversation(
        body.conversation_id, current_user.id, body.query, db
    )
    history = await get_recent_messages(conversation.id, db)

    answer = await chat(
        query=body.query,
        user_id=current_user.id,
        conversation_id=conversation.id,
        history=history,
        db=db,
    )
    return {"conversation_id": conversation.id, "answer": answer}
