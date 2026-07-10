import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL ?? "http://localhost:8000";

const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// 지금 앱을 켜놓고 있는(웹소켓 연결 중인) 사용자 목록
export const getOnlineUsers = async (token) => {
  const response = await axios.get(`${BASE_URL}/api/admin/online-users`, authHeader(token));
  return response.data;
};

// 이번 달 기능별(임베딩/채팅/퀴즈) OpenAI 예상 사용량/비용
export const getUsageSummary = async (token) => {
  const response = await axios.get(`${BASE_URL}/api/admin/usage-summary`, authHeader(token));
  return response.data;
};

// 소개 페이지 문의 폼으로 들어온 문의 목록 (안 읽은 것부터, 최신순)
export const getContacts = async (token) => {
  const response = await axios.get(`${BASE_URL}/api/admin/contacts`, authHeader(token));
  return response.data;
};

export const markContactRead = async (contactId, token) => {
  const response = await axios.patch(`${BASE_URL}/api/admin/contacts/${contactId}/read`, {}, authHeader(token));
  return response.data;
};

// 점검모드 현재 상태 + 켜기/끄기
export const getMaintenanceStatus = async (token) => {
  const response = await axios.get(`${BASE_URL}/api/admin/maintenance`, authHeader(token));
  return response.data;
};

export const setMaintenanceMode = async (enabled, token) => {
  const response = await axios.post(
    `${BASE_URL}/api/admin/maintenance/${enabled ? "on" : "off"}`,
    {},
    authHeader(token)
  );
  return response.data;
};

// http(s)://... 형태의 BASE_URL을 ws(s)://...로 바꿔줌. 프로덕션 빌드에서는
// REACT_APP_API_URL이 빈 문자열(동일 출처)이라 현재 페이지 주소 기준으로 구성
export const getPresenceWsUrl = (token) => {
  const path = "/api/ws/presence";
  const base = BASE_URL
    ? BASE_URL.replace(/^http/, "ws")
    : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;
  return `${base}${path}?token=${encodeURIComponent(token)}`;
};
