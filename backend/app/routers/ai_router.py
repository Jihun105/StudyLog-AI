from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.services.ai.rag_service import ask
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/ai", tags=["ai"])

class ChatRequest(BaseModel):
    query: str

@router.post("/chat")
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    answer = ask(request.query, current_user.id)
    return {"answer": answer}