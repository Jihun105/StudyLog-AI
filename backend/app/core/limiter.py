from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.security import decode_access_token


def get_user_id_or_ip(request: Request) -> str:
    """
    로그인한 유저는 user_id 기준으로, 토큰이 없거나 유효하지 않으면 IP 기준으로 rate limit을 건다.
    같은 IP를 여러 명이 공유해도(예: 같은 와이파이) 사용자별로 공평하게 제한하기 위함.
    """
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        payload = decode_access_token(token)
        if payload and payload.get("sub"):
            return f"user:{payload['sub']}"
    return get_remote_address(request)


limiter = Limiter(key_func=get_user_id_or_ip)
