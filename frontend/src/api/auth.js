import axios from "axios";

const BASE_URL = "http://localhost:8000";

// 회원가입 API 호출 함수
// username, email, password, nickname을 받아서 백엔드에 POST 요청
export const signup = async (username, email, password, nickname) => {
    const response = await axios.post(`${BASE_URL}/api/auth/signup`, {
        username,
        email,
        password,
        nickname,
    });
    // 응답 데이터를 반환 (생성된 유저 정보)
    return response.data;
}

// 로그인 API 호출 함수
// username과 password를 받아서 백엔드에 POST 요청을 보냄
export const login = async (username, password) => {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const response = await axios.post(`${BASE_URL}/api/auth/login`, formData);
    return response.data;
}