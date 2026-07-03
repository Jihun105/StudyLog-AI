from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException
from app.models.user import User
from app.schemas.user import UpdateProfileRequest, ChangePasswordRequest
from app.core.security import hash_password, verify_password


async def update_profile(user: User, request: UpdateProfileRequest, db: AsyncSession) -> User:
    if request.nickname and request.nickname != user.nickname:
        existing = (await db.execute(
            select(User).filter(User.nickname == request.nickname)
        )).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="이미 사용 중인 닉네임입니다.")
        user.nickname = request.nickname

    if request.email and request.email != user.email:
        existing = (await db.execute(
            select(User).filter(User.email == request.email)
        )).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다.")
        user.email = request.email

    # profile_image는 이 요청에 실제로 포함된 경우에만 갱신 (닉네임/이메일만 바꿀 때는 그대로 유지)
    if request.profile_image is not None:
        user.profile_image = request.profile_image

    await db.commit()
    await db.refresh(user)
    return user


async def change_password(user: User, request: ChangePasswordRequest, db: AsyncSession) -> None:
    # 형식 검증 먼저 (가벼운 검증부터 처리)
    try:
        request.validate_new_password()
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not verify_password(request.current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="현재 비밀번호가 올바르지 않습니다.")

    user.password_hash = hash_password(request.new_password)
    await db.commit()


async def delete_account(user: User, db: AsyncSession) -> None:
    # posts/categories/conversations/quizzes 등은 DB의 ON DELETE CASCADE로 함께 정리됨
    await db.delete(user)
    await db.commit()
