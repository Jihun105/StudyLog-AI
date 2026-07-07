import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL ?? "http://localhost:8000";

// 토큰이 필요한 요청에는 Authorization 헤더를 붙여야 함
// 매번 헤더를 직접 작성하는 대신, 토큰을 받아서 헤더 객체를 만들어주는 함수를 만듬
const authHeader = (token) => ({
    headers: {
        Authorization: `Bearer ${token}`,
    },
});

// 게시글 목록 조회
// page와 limit으로 페이지네이션을 지원
export const getPosts = async (page = 1, limit = 10, keyword = null, tags = null, token = null, categoryId = null, includeSubcategories = false, sortBy = null) => {
  const response = await axios.get(`${BASE_URL}/api/posts`, {
    params: { page, limit, keyword, tags, category_id: categoryId, include_subcategories: includeSubcategories, sort_by: sortBy },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    paramsSerializer: (params) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, v));
        } else {
          searchParams.append(key, value);
        }
      });
      return searchParams.toString();
    },
  });
  return response.data;
};

// 게시글 상세 조회
// postId로 특정 게시글 하나를 가져옵니다.
export const getPost = async (postId) => {
    const response = await axios.get(`${BASE_URL}/api/posts/${postId}`);
    return response.data;
};

// 게시글 작성 (인증 필요)
// token을 받아서 Authorization 헤더에 붙입니다.
export const createPost = async (title, content, tags, token, categoryId = null) => {
  const response = await axios.post(
    `${BASE_URL}/api/posts`,
    { title, content, tags, category_id: categoryId },
    authHeader(token)
  );
  return response.data;
};

// 게시글 수정 (인증 필요)
// token을 받아서 Authorization 헤더에 붙임
export const updatePost = async (postId, title, content, tags, token, categoryId = null) => {
  const response = await axios.put(
    `${BASE_URL}/api/posts/${postId}`,
    { title, content, tags, category_id: categoryId },
    authHeader(token)
  );
  return response.data;
};


// 노트를 드래그해서 다른 폴더로 옮길 때 - 카테고리만 가볍게 변경 (인증 필요)
export const movePost = async (postId, categoryId, token) => {
  const response = await axios.patch(
    `${BASE_URL}/api/posts/${postId}/category`,
    { category_id: categoryId },
    authHeader(token)
  );
  return response.data;
};

// 게시글 삭제 (인증 필요)
export const deletePost = async (postId, token) => {
    const response = await axios.delete(
        `${BASE_URL}/api/posts/${postId}`,
        authHeader(token)
    );
    return response.data;
}

// 카테고리 없는(미분류) 노트를 한 번에 전부 삭제 (인증 필요)
export const deleteUncategorizedPosts = async (token) => {
  const response = await axios.delete(`${BASE_URL}/api/posts/uncategorized`, authHeader(token));
  return response.data;
};

export const getAllTags = async (token, categoryId = null, includeSubcategories = false) => {
  const response = await axios.get(`${BASE_URL}/api/posts/tags/all`, {
    params: { category_id: categoryId, include_subcategories: includeSubcategories },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
};

// 제목이 아니라 노트 "내용"의 의미로 찾는 AI(RAG) 검색 (인증 필요)
export const searchSemanticPosts = async (query, token, limit = 8) => {
  const response = await axios.get(`${BASE_URL}/api/posts/search/semantic`, {
    params: { q: query, limit },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
};