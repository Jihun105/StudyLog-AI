from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException
from app.models.user import User
from app.schemas.user import SignupRequest
from app.core.security import hash_password, verify_password, create_access_token


async def create_user(request: SignupRequest, db: AsyncSession) -> User:
    # 비밀번호 정책 검증
    request.validate_password()

    if (await db.execute(select(User).filter(User.username == request.username))).scalar_one_or_none():
        # scalar_one_or_none() : 결과가 1개면 그 객체 반환 없으면 None 반환
        raise HTTPException(status_code=409, detail="이미 사용 중인 아이디입니다.")
    if (await db.execute(select(User).filter(User.email == request.email))).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다.")
    if (await db.execute(select(User).filter(User.nickname == request.nickname))).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="이미 사용 중인 닉네임입니다.")

    new_user = User(
        username=request.username,
        email=request.email,
        password_hash=hash_password(request.password),
        nickname=request.nickname
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


async def authenticate_user(username: str, password: str, db: AsyncSession) -> dict:
    result = await db.execute(select(User).filter(User.username == username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

    access_token = create_access_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "nickname": user.nickname
        }
    }