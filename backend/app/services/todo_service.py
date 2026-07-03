from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func as sa_func
from fastapi import HTTPException
from app.models.todo import Todo
from app.schemas.todo import TodoCreateRequest, TodoUpdateRequest, PRIORITY_VALUES


def _validate_priority(priority: str) -> None:
    if priority not in PRIORITY_VALUES:
        raise HTTPException(status_code=400, detail="우선순위는 low/medium/high 중 하나여야 합니다.")


async def get_todos(user_id: int, db: AsyncSession) -> list[Todo]:
    result = await db.execute(
        select(Todo).filter(Todo.user_id == user_id).order_by(Todo.position, Todo.created_at)
    )
    return result.scalars().all()


async def create_todo(request: TodoCreateRequest, user_id: int, db: AsyncSession) -> Todo:
    _validate_priority(request.priority)

    # 새 항목은 항상 맨 뒤에 추가 (기존 최대 position + 1)
    result = await db.execute(select(sa_func.max(Todo.position)).filter(Todo.user_id == user_id))
    max_position = result.scalar()
    next_position = (max_position + 1) if max_position is not None else 0

    todo = Todo(
        user_id=user_id,
        title=request.title,
        due_date=request.due_date,
        priority=request.priority,
        start_time=request.start_time,
        memo=request.memo,
        position=next_position,
    )
    db.add(todo)
    await db.commit()
    await db.refresh(todo)
    return todo


async def _get_owned_todo(todo_id: int, user_id: int, db: AsyncSession) -> Todo:
    result = await db.execute(select(Todo).filter(Todo.id == todo_id))
    todo = result.scalar_one_or_none()

    if todo is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 할 일입니다.")
    if todo.user_id != user_id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    return todo


async def update_todo(todo_id: int, request: TodoUpdateRequest, user_id: int, db: AsyncSession) -> Todo:
    _validate_priority(request.priority)

    todo = await _get_owned_todo(todo_id, user_id, db)
    todo.title = request.title
    todo.due_date = request.due_date
    todo.priority = request.priority
    todo.start_time = request.start_time
    todo.memo = request.memo
    await db.commit()
    await db.refresh(todo)
    return todo


async def toggle_todo(todo_id: int, user_id: int, db: AsyncSession) -> Todo:
    todo = await _get_owned_todo(todo_id, user_id, db)
    todo.is_done = not todo.is_done
    await db.commit()
    await db.refresh(todo)
    return todo


async def delete_todo(todo_id: int, user_id: int, db: AsyncSession) -> None:
    todo = await _get_owned_todo(todo_id, user_id, db)
    await db.delete(todo)
    await db.commit()


async def reorder_todos(ordered_ids: list[int], user_id: int, db: AsyncSession) -> list[Todo]:
    """요청으로 넘어온 순서대로 position을 재부여. 본인 소유가 아닌 id는 무시."""
    result = await db.execute(select(Todo).filter(Todo.user_id == user_id, Todo.id.in_(ordered_ids)))
    todos_by_id = {todo.id: todo for todo in result.scalars().all()}

    for position, todo_id in enumerate(ordered_ids):
        todo = todos_by_id.get(todo_id)
        if todo:
            todo.position = position

    await db.commit()
    return await get_todos(user_id, db)
