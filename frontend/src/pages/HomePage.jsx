import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPosts, getAllTags } from "../api/posts";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";

const stripHtml = (html) =>
  html
    ? html
        .replace(/<[^>]*>/g, " ")
        .replace(/<[^>]*$/, "")
        .replace(/\s+/g, " ")
        .trim()
    : "";

function HomePage() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [inputKeyword, setInputKeyword] = useState("");
  const [keyword, setKeyword] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  // 선택된 카테고리 ID (null: 전체, -1: 미분류, 숫자: 특정 카테고리)
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
  const fetchTags = async () => {
    try {
      // selectedCategoryId가 바뀔 때마다 해당 카테고리 태그만 불러옴
      const tags = await getAllTags(token, selectedCategoryId);
      setAllTags(tags);
      // 카테고리 바뀌면 선택된 태그 초기화
      setSelectedTags([]);
    } catch (error) {}
  };
  fetchTags();
}, [selectedCategoryId]); // selectedCategoryId 변경 시 실행

  const fetchPosts = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      // -1은 미분류 (category_id가 null인 글) → 백엔드에 0으로 보내서 처리
      // null은 전체 보기 → category_id 파라미터 안 보냄
      const categoryParam =
        selectedCategoryId === null ? null      // 전체: 필터 없음
        : selectedCategoryId === -1 ? 0         // 미분류: 특별값 0으로 전달
        : selectedCategoryId;                   // 특정 카테고리 ID

      const data = await getPosts(
        page, limit,
        keyword || null,
        selectedTags.length > 0 ? selectedTags : null,
        token,
        categoryParam
      );
      setPosts(data.posts);
      setTotal(data.total);
    } catch (error) {
      setErrorMessage("게시글을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [page, keyword, selectedTags, selectedCategoryId]);

  const handleSearch = () => {
    setPage(1);
    setKeyword(inputKeyword.trim() || null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleTagToggle = (tag) => {
    setPage(1);
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleReset = () => {
    setInputKeyword("");
    setKeyword(null);
    setSelectedTags([]);
    setPage(1);
  };

  // 카테고리 선택 시 검색/태그 초기화
  const handleSelectCategory = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setPage(1);
    setInputKeyword("");
    setKeyword(null);
    setSelectedTags([]);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex min-h-screen">
      {/* 사이드바 */}
      <Sidebar
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={handleSelectCategory}
      />

      {/* 메인 콘텐츠 */}
      <div className="flex-1 px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">공부 기록</h1>

        {/* 검색창 */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={inputKeyword}
            onChange={(e) => setInputKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="제목으로 검색..."
            className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            검색
          </button>
        </div>

        {/* 태그 필터 */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* 현재 필터 표시 + 초기화 */}
        {(keyword || selectedTags.length > 0) && (
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
            <span>검색 결과 {total}건</span>
            <button onClick={handleReset} className="text-blue-500 hover:underline">
              초기화
            </button>
          </div>
        )}

        {/* 로딩 */}
        {loading && (
          <div className="text-center text-gray-500 py-12">불러오는 중...</div>
        )}

        {/* 에러 */}
        {errorMessage && (
          <div className="bg-red-50 text-red-500 px-4 py-3 rounded mb-4">{errorMessage}</div>
        )}

        {/* 게시글 목록 */}
        {!loading && posts.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            {keyword || selectedTags.length > 0
              ? "검색 결과가 없습니다."
              : "아직 작성된 게시글이 없습니다."}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                onClick={() => navigate(`/posts/${post.id}`)}
                className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
              >
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{post.title}</h2>
                <p className="text-gray-500 text-sm mb-4 line-clamp-2">{stripHtml(post.preview)}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {post.tags.map((tag) => (
                    <span key={tag} className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{post.nickname}</span>
                  <span>{new Date(post.created_at).toLocaleDateString("ko-KR")}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-4 py-2 rounded ${
                  p === page
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;