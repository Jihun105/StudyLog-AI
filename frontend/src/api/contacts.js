import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL ?? "http://localhost:8000";

// 소개 페이지의 문의 폼 제출 - 로그인 여부와 무관하게 누구나 호출 가능한 공개 엔드포인트라
// 토큰을 넘기지 않음
export const submitContact = async ({ name, email, message }) => {
  const response = await axios.post(`${BASE_URL}/api/contacts`, { name, email, message });
  return response.data;
};
