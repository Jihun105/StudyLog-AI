import { useEffect, useState } from "react";
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL ?? "http://localhost:8000";
const POLL_MS = 20000;

// /api/health는 일반 /api/ 경로라 점검모드 플래그가 켜져 있으면 nginx가 백엔드까지 가지도
// 않고 바로 503을 응답함 - 응답이 200이 아니거나(503) 아예 실패(백엔드가 완전히 죽은 경우
// nginx가 502를 주거나 요청 자체가 실패)하면 전부 "점검 중"으로 취급. 정상 서비스 중 아주
// 잠깐의 네트워크 오류로 오탐하는 것보다, 문제가 생겼을 때 빈 화면 대신 점검 페이지를
// 보여주는 쪽이 사용자 경험상 낫다고 판단
export function useMaintenanceStatus() {
  const [maintenanceOn, setMaintenanceOn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/health`);
        if (!cancelled) setMaintenanceOn(res.status !== 200);
      } catch (err) {
        if (!cancelled) setMaintenanceOn(true);
      }
    };

    check();
    const timer = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return maintenanceOn;
}
