import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL ?? "http://localhost:8000";

const authHeader = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// 대화 목록 조회 (최신순)
export const getConversations = async (token) => {
  const response = await axios.get(`${BASE_URL}/api/conversations`, authHeader(token));
  return response.data.conversations;
};

// 특정 대화의 전체 메시지 히스토리 조회
export const getConversationMessages = async (conversationId, token) => {
  const response = await axios.get(
    `${BASE_URL}/api/conversations/${conversationId}/messages`,
    authHeader(token)
  );
  return response.data;
};

// AI에게 질문 전송 (멀티턴 대화, conversationId 없으면 새 대화 생성)
export const sendChatMessage = async (query, conversationId, token) => {
  const response = await axios.post(
    `${BASE_URL}/api/ai/chat`,
    { query, conversation_id: conversationId ?? null },
    authHeader(token)
  );
  return response.data;
};
