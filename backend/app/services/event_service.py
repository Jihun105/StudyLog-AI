from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException
from app.models.event import Event
from app.schemas.event import EventCreateRequest, EventUpdateRequest


def _validate_range(start_date, end_date) -> None:
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="종료일은 시작일보다 빠를 수 없습니다.")


async def get_events(user_id: int, db: AsyncSession) -> list[Event]:
    result = await db.execute(
        select(Event).filter(Event.user_id == user_id).order_by(Event.start_date)
    )
    return result.scalars().all()


async def create_event(request: EventCreateRequest, user_id: int, db: AsyncSession) -> Event:
    _validate_range(request.start_date, request.end_date)

    event = Event(
        user_id=user_id,
        title=request.title,
        start_date=request.start_date,
        end_date=request.end_date,
        category=request.category,
        memo=request.memo,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


async def _get_owned_event(event_id: int, user_id: int, db: AsyncSession) -> Event:
    result = await db.execute(select(Event).filter(Event.id == event_id))
    event = result.scalar_one_or_none()

    if event is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 일정입니다.")
    if event.user_id != user_id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    return event


async def update_event(event_id: int, request: EventUpdateRequest, user_id: int, db: AsyncSession) -> Event:
    _validate_range(request.start_date, request.end_date)

    event = await _get_owned_event(event_id, user_id, db)
    event.title = request.title
    event.start_date = request.start_date
    event.end_date = request.end_date
    event.category = request.category
    event.memo = request.memo
    await db.commit()
    await db.refresh(event)
    return event


async def delete_event(event_id: int, user_id: int, db: AsyncSession) -> None:
    event = await _get_owned_event(event_id, user_id, db)
    await db.delete(event)
    await db.commit()
