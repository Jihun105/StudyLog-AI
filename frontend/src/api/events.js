import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL ?? "http://localhost:8000";

const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// 내 일정 목록 조회 (할 일과는 별개 - 체크박스 없이 시작일~종료일로 여러 날에 걸쳐 표시됨)
export const getEvents = async (token) => {
  const response = await axios.get(`${BASE_URL}/api/events`, authHeader(token));
  return response.data;
};

// 일정 생성
export const createEvent = async (title, startDate, endDate, category, token, memo = null) => {
  const response = await axios.post(
    `${BASE_URL}/api/events`,
    { title, start_date: startDate, end_date: endDate, category, memo },
    authHeader(token)
  );
  return response.data;
};

// 일정 수정
export const updateEvent = async (eventId, title, startDate, endDate, category, token, memo = null) => {
  const response = await axios.put(
    `${BASE_URL}/api/events/${eventId}`,
    { title, start_date: startDate, end_date: endDate, category, memo },
    authHeader(token)
  );
  return response.data;
};

// 일정 삭제
export const deleteEvent = async (eventId, token) => {
  const response = await axios.delete(`${BASE_URL}/api/events/${eventId}`, authHeader(token));
  return response.data;
};
