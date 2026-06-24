import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPosts, getAllTags } from "../api/posts";
import { useAuth } from "../context/AuthContext";
import {
  Search, SlidersHorizontal, FileText, BrainCircuit, Database,
  Play, Plus
} from "lucide-react";
import Sidebar from "../components/Sidebar";

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
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await getAllTags(token, selectedCategoryId);
        setAllTags(tags);
        setSelectedTags([]);
      } catch (error) {}
    };
    fetchTags();
  }, [selectedCategoryId]);

  const fetchPosts = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const categoryParam =
        selectedCategoryId === null ? null
        : selectedCategoryId === -1 ? 0
        : selectedCategoryId;

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

  useEffect(() => { fetchPosts(); }, [page, keyword, selectedTags, selectedCategoryId]);

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

  const handleSelectCategory = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setPage(1);
    setInputKeyword("");
    setKeyword(null);
    setSelectedTags([]);
  };

  const totalPages = Math.ceil(total / limit);

  return (
  <>
    <Sidebar
      selectedCategoryId={selectedCategoryId}
      onSelectCategory={handleSelectCategory}
    />
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* 상단 헤더 */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>All Notes</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-green-50 text-green-600 text-xs font-medium px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            AI Status: Online
          </div>
          <button
            onClick={() => navigate("/posts/create")}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Play size={14} fill="white" /> New Post
          </button>
        </div>
      </div>

      <div className="px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          Welcome back, Learner.
        </h1>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 p-6 flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-gray-800">{total}</div>
              <div className="text-sm text-gray-400 mt-1">Total Posts</div>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6 flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-gray-800">0</div>
              <div className="text-sm text-gray-400 mt-1">Quizzes Taken</div>
            </div>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <BrainCircuit size={20} className="text-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6 flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-gray-800">0</div>
              <div className="text-sm text-gray-400 mt-1">Vectors Embedded</div>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Database size={20} className="text-green-500" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex-1 min-w-64 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={inputKeyword}
              onChange={(e) => setInputKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search your knowledge base..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 border border-gray-200 bg-white text-gray-600 text-sm px-4 py-2.5 rounded-lg hover:bg-gray-50"
          >
            <SlidersHorizontal size={14} /> Category
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagToggle(tag)}
              className={`text-sm px-3 py-2 rounded-full border transition-colors ${
                selectedTags.includes(tag)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
              }`}
            >
              # {tag}
            </button>
          ))}
        </div>

        {(keyword || selectedTags.length > 0) && (
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
            <span>검색 결과 {total}건</span>
            <button onClick={handleReset} className="text-blue-500 hover:underline">초기화</button>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Recent Notes</h2>
          <button className="text-sm text-blue-600 hover:underline">View All →</button>
        </div>

        {loading && (
          <div className="text-center text-gray-400 py-12">불러오는 중...</div>
        )}

        {errorMessage && (
          <div className="bg-red-50 text-red-500 px-4 py-3 rounded-lg mb-4 text-sm">{errorMessage}</div>
        )}

        {!loading && posts.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <div className="font-medium text-gray-500">
              {keyword || selectedTags.length > 0
                ? "검색 결과가 없습니다."
                : "아직 작성된 게시글이 없습니다."}
            </div>
            <button
              onClick={() => navigate("/posts/create")}
              className="mt-4 text-blue-600 text-sm hover:underline flex items-center gap-1 mx-auto"
            >
              <Plus size={14} /> 첫 번째 노트 작성하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {posts.map((post) => (
              <div
                key={post.id}
                onClick={() => navigate(`/posts/${post.id}`)}
                className="bg-white rounded-xl border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-blue-100 transition-all"
              >
                <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <FileText size={12} />
                  <span>{post.category_id ? `카테고리 ${post.category_id}` : "기본"}</span>
                </div>
                <h3 className="text-base font-semibold text-gray-800 mb-2 line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {post.preview}
                </p>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full"
                    >
                      # {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  p === page
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  </>
);
}

export default HomePage;