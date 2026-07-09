from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.database import get_db
from app.models.user import User
from app.core.security import decode_access_token

# 요청 헤더에서 Authorization: Bearer <토큰> 형태로 토큰을 자동으로 꺼내줌
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(
        token: str = Depends(oauth2_scheme),
        db: AsyncSession = Depends(get_db)
) -> User:
    # 토큰 검증 + 유저 조회 한 번에 처리
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="토큰이 유효하지 않습니다.")
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="토큰이 유효하지 않습니다.")
    
    result = await db.execute(select(User).filter(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=401, detail="존재하지 않는 유저입니다.")

    return user

# 관리자 대시보드 전용 - get_current_user로 정상 로그인은 확인하되, is_admin이 아니면
# 403으로 막음. 별도 관리자 계정 체계가 아니라 기존 계정에 얹은 플래그 방식이라
# 이 dependency 하나로 관리자 전용 라우트를 간단히 보호할 수 있음
async def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자만 접근할 수 있습니다.")
    return current_user