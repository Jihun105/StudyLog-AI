from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.todo import TodoCreateRequest, TodoUpdateRequest, TodoReorderRequest, TodoResponse
from app.services.todo_service import get_todos, create_todo, update_todo, toggle_todo, delete_todo, reorder_todos

router = APIRouter(prefix="/api/todos", tags=["todos"])


@router.get("", response_model=list[TodoResponse])
async def read_todos(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_todos(current_user.id, db)


@router.post("", response_model=TodoResponse, status_code=201)
async def write_todo(
    request: TodoCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await create_todo(request, current_user.id, db)


# 주의: "/{todo_id}" 보다 먼저 등록해야 함 (안 그러면 "reorder"가 todo_id로 매칭 시도됨)
@router.put("/reorder", response_model=list[TodoResponse])
async def reorder(
    request: TodoReorderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await reorder_todos(request.ordered_ids, current_user.id, db)


@router.put("/{todo_id}", response_model=TodoResponse)
async def modify_todo(
    todo_id: int,
    request: TodoUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await update_todo(todo_id, request, current_user.id, db)


@router.patch("/{todo_id}/toggle", response_model=TodoResponse)
async def toggle(
    todo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await toggle_todo(todo_id, current_user.id, db)


@router.delete("/{todo_id}", status_code=204)
async def remove_todo(
    todo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await delete_todo(todo_id, current_user.id, db)
