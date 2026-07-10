from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from fastapi import HTTPException
from app.models.contact import Contact
from app.schemas.contact import ContactCreateRequest


async def create_contact(request: ContactCreateRequest, db: AsyncSession) -> Contact:
    contact = Contact(
        name=request.name,
        email=request.email,
        message=request.message,
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact


async def get_contacts(db: AsyncSession) -> list[Contact]:
    """관리자 대시보드용 - 최신순, 안 읽은 문의가 위로 오도록 정렬."""
    result = await db.execute(
        select(Contact).order_by(Contact.is_read.asc(), Contact.created_at.desc())
    )
    return result.scalars().all()


async def get_unread_count(db: AsyncSession) -> int:
    result = await db.execute(select(func.count(Contact.id)).where(Contact.is_read.is_(False)))
    return result.scalar_one()


async def mark_contact_read(contact_id: int, db: AsyncSession) -> Contact:
    result = await db.execute(select(Contact).filter(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 문의입니다.")

    contact.is_read = True
    await db.commit()
    await db.refresh(contact)
    return contact
