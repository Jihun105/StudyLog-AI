import axios from "axios";

const BASE_URL = "http://localhost:8000";

const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// 내 카테고리 트리 전체 조회
export const getCategories = async (token) => {
  const response = await axios.get(`${BASE_URL}/api/categories`, authHeader(token));
  return response.data;
};

// 카테고리 생성
export const createCategory = async (name, parentId = null, token) => {
  const response = await axios.post(
    `${BASE_URL}/api/categories`,
    { name, parent_id: parentId },
    authHeader(token)
  );
  return response.data;
};

// 카테고리 이름 수정
export const renameCategory = async (categoryId, name, token) => {
  const response = await axios.patch(
    `${BASE_URL}/api/categories/${categoryId}`,
    { name },
    authHeader(token)
  );
  return response.data;
};

// 카테고리 삭제
export const deleteCategory = async (categoryId, token) => {
  await axios.delete(`${BASE_URL}/api/categories/${categoryId}`, authHeader(token));
};