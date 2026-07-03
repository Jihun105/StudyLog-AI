import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL ?? "http://localhost:8000";

const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// 내 프로필 조회
export const getMyProfile = async (token) => {
  const response = await axios.get(`${BASE_URL}/api/users/me`, authHeader(token));
  return response.data;
};

// 프로필 수정 (닉네임/이메일/프로필 사진 - 필요한 필드만 넘기면 됨, 나머지는 그대로 유지)
export const updateMyProfile = async (payload, token) => {
  const response = await axios.patch(
    `${BASE_URL}/api/users/me`,
    payload,
    authHeader(token)
  );
  return response.data;
};

// 비밀번호 변경
export const changeMyPassword = async ({ current_password, new_password }, token) => {
  await axios.post(
    `${BASE_URL}/api/users/me/password`,
    { current_password, new_password },
    authHeader(token)
  );
};

// 회원 탈퇴
export const deleteMyAccount = async (token) => {
  await axios.delete(`${BASE_URL}/api/users/me`, authHeader(token));
};
