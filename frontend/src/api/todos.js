import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL ?? "http://localhost:8000";

const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// 내 할 일 목록 조회 (position 순)
export const getTodos = async (token) => {
  const response = await axios.get(`${BASE_URL}/api/todos`, authHeader(token));
  return response.data;
};

// 할 일 생성 (시작/종료 시간·메모는 선택 - 종료 시간을 안 넣으면 백엔드가 시작 시간+1시간으로 채움)
export const createTodo = async (title, dueDate, priority, token, startTime = null, memo = null, endTime = null) => {
  const response = await axios.post(
    `${BASE_URL}/api/todos`,
    { title, due_date: dueDate, priority, start_time: startTime, end_time: endTime, memo },
    authHeader(token)
  );
  return response.data;
};

// 할 일 수정 (제목/마감일/우선순위/시작·종료시간/메모)
export const updateTodo = async (todoId, title, dueDate, priority, startTime, endTime, memo, token) => {
  const response = await axios.put(
    `${BASE_URL}/api/todos/${todoId}`,
    { title, due_date: dueDate, priority, start_time: startTime, end_time: endTime, memo },
    authHeader(token)
  );
  return response.data;
};

// 완료 여부 토글
export const toggleTodo = async (todoId, token) => {
  const response = await axios.patch(`${BASE_URL}/api/todos/${todoId}/toggle`, null, authHeader(token));
  return response.data;
};

// 할 일 삭제
export const deleteTodo = async (todoId, token) => {
  const response = await axios.delete(`${BASE_URL}/api/todos/${todoId}`, authHeader(token));
  return response.data;
};

// 드래그 정렬 결과 반영 (전체 순서를 id 배열로 전달)
export const reorderTodos = async (orderedIds, token) => {
  const response = await axios.put(
    `${BASE_URL}/api/todos/reorder`,
    { ordered_ids: orderedIds },
    authHeader(token)
  );
  return response.data;
};
