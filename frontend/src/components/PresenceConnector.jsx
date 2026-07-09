import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { getPresenceWsUrl } from "../api/admin";

// 화면에 아무것도 그리지 않는 컴포넌트 - 로그인되어 있는 동안 백그라운드에서 웹소켓
// 연결을 계속 유지해서, 관리자 대시보드의 "지금 접속 중" 목록에 잡히게 함.
// App.js에서 페이지 전환과 무관하게 항상 마운트되어 있는 위치(AuthProvider 안,
// Routes 밖)에 둬야 페이지를 옮겨다녀도 연결이 끊기지 않음.
function PresenceConnector() {
  const { token } = useAuth();
  const socketRef = useRef(null);
  const retryTimerRef = useRef(null);

  useEffect(() => {
    if (!token) return undefined;

    let stopped = false;

    const connect = () => {
      if (stopped) return;
      const socket = new WebSocket(getPresenceWsUrl(token));
      socketRef.current = socket;

      socket.onclose = () => {
        if (stopped) return;
        // 네트워크 순단/서버 재시작 등으로 끊겨도 몇 초 뒤 자동 재연결 시도
        retryTimerRef.current = setTimeout(connect, 5000);
      };
      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(retryTimerRef.current);
      socketRef.current?.close();
    };
  }, [token]);

  return null;
}

export default PresenceConnector;
