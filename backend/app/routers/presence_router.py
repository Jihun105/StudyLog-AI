from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.security import decode_access_token
from app.services.presence_service import presence_manager

router = APIRouter(prefix="/api/ws", tags=["presence"])


# 브라우저 네이티브 WebSocket API는 커스텀 헤더(Authorization)를 못 보내서, 토큰을
# 쿼리 파라미터로 받음. 로그인되어 있는 동안 앱이 열려있으면 이 연결을 계속 유지해서
# "지금 접속 중"으로 잡히게 함 - 관리자 대시보드가 이 목록을 조회함(presence_service).
@router.websocket("/presence")
async def presence_ws(websocket: WebSocket, token: str = Query(...)):
    payload = decode_access_token(token)
    if payload is None:
        await websocket.close(code=4401)
        return

    raw_user_id = payload.get("sub")
    if raw_user_id is None:
        await websocket.close(code=4401)
        return
    user_id = int(raw_user_id)

    await presence_manager.connect(user_id, websocket)
    try:
        while True:
            # 내용은 안 씀 - 연결이 살아있는지만 확인하는 용도(탭 닫힘/네트워크 끊김 시
            # 여기서 예외가 발생해서 finally로 빠짐)
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        presence_manager.disconnect(user_id, websocket)
