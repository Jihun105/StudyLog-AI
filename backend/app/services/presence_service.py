import logging
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class PresenceManager:
    """지금 앱을 켜놓고 있는(웹소켓 연결이 살아있는) 사용자 목록을 메모리에만 들고 있는
    매니저. 단일 백엔드 인스턴스 기준(서버를 여러 대로 늘리면 Redis pub/sub 등으로
    공유해야 함 - 지금 규모에선 불필요). 사용자당 여러 탭/기기를 열 수 있으니
    user_id -> 웹소켓 집합으로 관리하고, 마지막 연결이 끊길 때만 "오프라인"으로 취급."""

    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        sockets = self._connections.get(user_id)
        if not sockets:
            return
        sockets.discard(websocket)
        if not sockets:
            self._connections.pop(user_id, None)

    def get_online_user_ids(self) -> list[int]:
        return list(self._connections.keys())


presence_manager = PresenceManager()
