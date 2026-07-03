import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getPosts, getAllTags } from "../api/posts";
import { getCategories } from "../api/categories";
import { useAuth } from "../context/AuthContext";
import {
  Search, SlidersHorizontal, FileText,
  Play, Plus, Folder
} from "lucide-react";
import SidebarLayout from "../components/SidebarLayout";

// 카테고리 id로 이름 찾기 (트리 재귀 탐색)
function findCategoryName(categories, id) {
  for (const category of categories) {
    if (category.id === id) return category.name;
    if (category.children?.length > 0) {
      const found = findCategoryName(category.children, id);
      if (found) return found;
    }
  }
  return null;
}

// 카테고리 id로 노드(children 포함) 찾기 (트리 재귀 탐색)
function findCategoryNode(categories, id) {
  for (const category of categories) {
    if (category.id === id) return category;
    if (category.children?.length > 0) {
      const found = findCategoryNode(category.children, id);
      if (found) return found;
    }
  }
  return null;
}

function HomePage() {
  const { t } = useTranslation();
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
  const [categories, setCategories] = useState([]);
  const [searchParams] = useSearchParams();
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => {
    const categoryParam = searchParams.get("category");
    return categoryParam !== null ? Number(categoryParam) : null;
  });

  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTags = async () => {
      try {
        // 상위 폴더를 선택하면(검색 여부와 무관하게) 하위 폴더 노트의 태그까지 항상 함께 보여줌
        const tags = await getAllTags(token, selectedCategoryId, true);
        setAllTags(tags);
        setSelectedTags([]);
      } catch (error) {}
    };
    fetchTags();
  }, [selectedCategoryId]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories(token);
        setCategories(data);
      } catch (error) {}
    };
    fetchCategories();
  }, [token]);

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
        categoryParam,
        Boolean(keyword) // 상위 폴더에서 검색할 땐 하위 폴더의 노트까지 함께 검색
      );
      setPosts(data.posts);
      setTotal(data.total);
    } catch (error) {
      setErrorMessage(t("postDetail.loadFailed"));
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

  // 지금 보고 있는 폴더에서 글쓰기를 누르면 그 폴더가 선택된 채로 작성 페이지로 이동
  // (전체보기/기본일 땐 카테고리 없이 이동 - 작성 페이지 기본값이 "기본")
  const handleCreatePost = () => {
    if (selectedCategoryId !== null && selectedCategoryId !== -1) {
      navigate(`/posts/create?category=${selectedCategoryId}`);
    } else {
      navigate("/posts/create");
    }
  };

  const totalPages = Math.ceil(total / limit);

  // 선택된 카테고리에 하위 폴더가 있으면 노트 대신 하위 폴더를 먼저 보여주고,
  // 하위 폴더가 없는(리프) 카테고리거나 전체보기일 땐 노트를 바로 보여줌
  // "기본"(-1)은 실제 카테고리는 아니지만 항상 최상위에 고정되어 있고, 실제로 생성된
  // 최상위 카테고리들을 화면상 그 하위 폴더처럼 보여줌
  const selectedCategoryNode =
    selectedCategoryId !== null && selectedCategoryId !== -1
      ? findCategoryNode(categories, selectedCategoryId)
      : null;
  const subCategories =
    selectedCategoryId === -1 ? categories : (selectedCategoryNode?.children || []);

  return (
  <SidebarLayout
    selectedCategoryId={selectedCategoryId}
    onSelectCategory={handleSelectCategory}
  >
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      {/* 상단 헤더 */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-8 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
          <button onClick={() => handleSelectCategory(null)} className="hover:text-blue-600 dark:hover:text-blue-400">
            {t("notes.allNotes")}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            {t("common.aiStatusOnline")}
          </div>
          <button
            onClick={handleCreatePost}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Play size={14} fill="white" /> {t("notes.newPost")}
          </button>
        </div>
      </div>

      <div className="px-8 py-8">
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={inputKeyword}
            onChange={(e) => setInputKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("notes.searchPlaceholder")}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm px-4 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <SlidersHorizontal size={14} /> {t("notes.category")}
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagToggle(tag)}
              className={`text-sm px-3 py-2 rounded-full border transition-colors ${
                selectedTags.includes(tag)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
              }`}
            >
              # {tag}
            </button>
          ))}
        </div>

        {(keyword || selectedTags.length > 0) && (
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-500 dark:text-gray-400">
            <span>{t("notes.searchResults", { count: total })}</span>
            <button onClick={handleReset} className="text-blue-500 dark:text-blue-400 hover:underline">{t("notes.reset")}</button>
          </div>
        )}

        {subCategories.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">{t("notes.subfolders")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {subCategories.map((child) => (
                <button
                  key={child.id}
                  onClick={() => handleSelectCategory(child.id)}
                  className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 text-left hover:border-blue-200 dark:hover:border-blue-500/40 hover:shadow-sm transition-all"
                >
                  <Folder size={16} className="text-blue-500 dark:text-blue-400 shrink-0" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{child.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t("notes.recentNotes")}</h2>
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{t("notes.viewAll")} →</button>
        </div>

        {loading && (
          <div className="text-center text-gray-400 dark:text-gray-500 py-12">{t("common.loading")}</div>
        )}

        {errorMessage && (
          <div className="bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{errorMessage}</div>
        )}

        {!loading && posts.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 py-16">
            <FileText size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <div className="font-medium text-gray-500 dark:text-gray-400">
              {keyword || selectedTags.length > 0
                ? t("notes.noSearchResults")
                : t("notes.noPostsYet")}
            </div>
            <button
              onClick={handleCreatePost}
              className="mt-4 text-blue-600 dark:text-blue-400 text-sm hover:underline flex items-center gap-1 mx-auto"
            >
              <Plus size={14} /> {t("notes.writeFirstNote")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {posts.map((post) => (
              <div
                key={post.id}
                onClick={() => navigate(`/posts/${post.id}`)}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 cursor-pointer hover:shadow-md hover:border-blue-100 dark:hover:border-blue-500/40 transition-all"
              >
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-1">
                  <FileText size={12} />
                  <span>{post.category_id ? (findCategoryName(categories, post.category_id) || t("notes.categoryPrefix")) : t("notes.uncategorized")}</span>
                </div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2 line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-gray-400 dark:text-gray-500 text-sm mb-4 line-clamp-2">
                  {post.preview}
                </p>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-full"
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
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  </SidebarLayout>
);
}

export default HomePage;
