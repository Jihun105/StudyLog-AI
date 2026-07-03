import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL ?? "http://localhost:8000";

// 노트 에디터에 삽입할 이미지 업로드 (인증 필요)
// 서버가 돌려주는 url은 "/api/uploads/files/..." 형태의 상대경로라 BASE_URL을 붙여서
// 어디서 렌더링되든(작성 화면/상세 화면/퀴즈 패널) 항상 백엔드를 가리키도록 함
export const uploadImage = async (file, token) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post(`${BASE_URL}/api/uploads/image`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });

  return `${BASE_URL}${response.data.url}`;
};
