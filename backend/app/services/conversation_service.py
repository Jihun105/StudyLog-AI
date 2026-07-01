from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.models.conversation import Conversation, Message

HISTORY_LIMIT = 10


async def _get_owned_conversation(
    conversation_id: int,
    user_id: int,
    db: AsyncSession,
) -> Conversation:
    result = await db.execute(
        select(Conversation).filter(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()

    if conversation is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 대화입니다.")
    if conversation.user_id != user_id:
        raise HTTPException(status_code=403, detail="본인 대화가 아닙니다.")

    return conversation


async def get_or_create_conversation(
    conversation_id: int | None,
    user_id: int,
    query: str,
    db: AsyncSession,
) -> Conversation:
    if conversation_id is None:
        conversation = Conversation(user_id=user_id, title=query[:50])
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
        return conversation

    return await _get_owned_conversation(conversation_id, user_id, db)


async def list_conversations(user_id: int, db: AsyncSession) -> list[Conversation]:
    result = await db.execute(
        select(Conversation)
        .filter(Conversation.user_id == user_id)
        .order_by(Conversation.created_at.desc())
    )
    return list(result.scalars().all())


async def get_conversation_with_messages(
    conversation_id: int,
    user_id: int,
    db: AsyncSession,
) -> tuple[Conversation, list[Message]]:
    conversation = await _get_owned_conversation(conversation_id, user_id, db)

    result = await db.execute(
        select(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    messages = list(result.scalars().all())
    return conversation, messages


async def get_recent_messages(
    conversation_id: int,
    db: AsyncSession,
    limit: int = HISTORY_LIMIT,
) -> list[dict]:
    result = await db.execute(
        select(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    messages = list(result.scalars().all())
    messages.reverse()  # 오래된 순으로 정렬해서 반환
    return [{"role": m.role, "content": m.content} for m in messages]


async def save_message(
    conversation_id: int,
    role: str,
    content: str,
    db: AsyncSession,
) -> None:
    message = Message(conversation_id=conversation_id, role=role, content=content)
    db.add(message)
    await db.commit()
