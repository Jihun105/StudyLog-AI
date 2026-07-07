import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL ?? "http://localhost:8000";

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

// 카테고리 이름 수정 / 색상 변경 공통 - 보낸 필드만 반영됨 ({name}만, {color}만, 둘 다 등)
export const updateCategory = async (categoryId, updates, token) => {
  const response = await axios.patch(
    `${BASE_URL}/api/categories/${categoryId}`,
    updates,
    authHeader(token)
  );
  return response.data;
};

// 카테고리 이름 수정
export const renameCategory = async (categoryId, name, token) =>
  updateCategory(categoryId, { name }, token);

// 카테고리 색상 변경 - color를 null/빈 문자열로 보내면 색상 없앰(기본 회색으로)
export const updateCategoryColor = async (categoryId, color, token) =>
  updateCategory(categoryId, { color: color || "" }, token);

// 카테고리 삭제
export const deleteCategory = async (categoryId, token) => {
  await axios.delete(`${BASE_URL}/api/categories/${categoryId}`, authHeader(token));
};

// 드래그 앤 드롭으로 바뀐 폴더 순서/위치를 한 번에 반영
// items: [{ id, parent_id, order_index }, ...] - 사용자 소유 카테고리 전체 스냅샷
export const reorderCategories = async (items, token) => {
  const response = await axios.put(
    `${BASE_URL}/api/categories/reorder`,
    { items },
    authHeader(token)
  );
  return response.data;
};