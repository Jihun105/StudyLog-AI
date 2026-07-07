from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.event import EventCreateRequest, EventUpdateRequest, EventResponse
from app.services.event_service import get_events, create_event, update_event, delete_event

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=list[EventResponse])
async def read_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_events(current_user.id, db)


@router.post("", response_model=EventResponse, status_code=201)
async def write_event(
    request: EventCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await create_event(request, current_user.id, db)


@router.put("/{event_id}", response_model=EventResponse)
async def modify_event(
    event_id: int,
    request: EventUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await update_event(event_id, request, current_user.id, db)


@router.delete("/{event_id}", status_code=204)
async def remove_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await delete_event(event_id, current_user.id, db)
