import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPost } from "../api/posts";
import { getCategories } from "../api/categories";
import { useAuth } from "../context/AuthContext";
import RichTextEditor from "../components/RichTextEditor";

// 트리 구조 카테고리를 flat 배열로 변환 (드롭다운용)
// depth에 따라 들여쓰기 표시
function flattenCategories(categories, depth = 0) {
  const result = [];
  for (const cat of categories) {
    result.push({ id: cat.id, name: cat.name, depth });
    if (cat.children && cat.children.length > 0) {
      result.push(...flattenCategories(cat.children, depth + 1));
    }
  }
  return result;
}

function PostCreatePage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [categoryId, setCategoryId] = useState(null);  // 선택된 카테고리 ID
  const [categories, setCategories] = useState([]);     // flat 카테고리 목록
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();

  // 카테고리 목록 불러오기
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories(token);
        setCategories(flattenCategories(data));
      } catch (error) {
        console.error("카테고리 불러오기 실패", error);
      }
    };
    fetchCategories();
  }, []);

  const handleCreate = async () => {
    if (!title || !content) {
      setErrorMessage("제목과 내용을 입력해주세요.");
      return;
    }
    if (!token) {
      setErrorMessage("로그인이 필요합니다.");
      return;
    }
    const tags = tagInput.split(",").map((tag) => tag.trim()).filter((tag) => tag);
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await createPost(title, content, tags, token, categoryId);
      navigate(`/posts/${data.id}`);
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || "게시글 작성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">글쓰기</h1>
      <div className="bg-white rounded-lg shadow p-8">
        {errorMessage && (
          <div className="bg-red-50 text-red-500 px-4 py-3 rounded mb-4 text-sm">{errorMessage}</div>
        )}

        {/* 카테고리 선택 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
          <select
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">기본 (미분류)</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {"　".repeat(cat.depth)}📁 {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* 제목 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="제목을 입력하세요"
          />
        </div>

        {/* 내용 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
          <RichTextEditor
            content={content}
            onChange={setContent}
          />
        </div>

        {/* 태그 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">태그</label>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="쉼표로 구분하여 입력하세요 (예: 딥러닝, NLP)"
          />
        </div>

        <div className="flex justify-between">
          <button onClick={() => navigate("/")} className="text-gray-500 hover:text-gray-700">
            취소
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className={`px-6 py-2 rounded text-white font-medium ${
              loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {loading ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PostCreatePage;