import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getPosts, getAllTags, deletePost, searchSemanticPosts } from "../api/posts";
import { getCategories } from "../api/categories";
import { useAuth } from "../context/AuthContext";
import {
  Search, SlidersHorizontal, FileText,
  Play, Plus, Folder, X, ArrowUpDown, Check, Sparkles
} from "lucide-react";
import SidebarLayout, { SidebarSpacer } from "../components/SidebarLayout";
import { POST_DRAG_TYPE } from "../components/Sidebar";

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

// 정렬 기준 - 백엔드 sort_by 값과 1:1로 대응
const SORT_OPTIONS = [
  { value: "created_at", labelKey: "notes.sortCreated" },
  { value: "updated_at", labelKey: "notes.sortUpdated" },
  { value: "title", labelKey: "notes.sortTitle" },
];

// 정렬 기준을 고르는 드롭다운 - 카테고리 필터 버튼과 같은 자리에서 눌러 펼치는 방식.
// 다른 커스텀 드롭다운들(PriorityDropdown 등)과 동일하게 fixed 포지션 팝오버로 구현해서
// 스크롤 영역 안에서도 메뉴가 잘리지 않게 함
function SortDropdown({ value, onChange, t }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = () => setOpen(false);
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [open]);

  const current = SORT_OPTIONS.find((opt) => opt.value === value) || SORT_OPTIONS[0];

  const handleToggle = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left });
    setOpen((prev) => !prev);
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 text-sm px-4 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <ArrowUpDown size={14} /> {t(current.labelKey)}
      </button>
      {open && menuPos && (
        <div
          className="fixed z-[60] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700/60"
            >
              <span className="text-gray-700 dark:text-gray-200">{t(opt.labelKey)}</span>
              {opt.value === value && <Check size={13} className="text-blue-600 dark:text-blue-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  // 노트 카드를 드래그하는 동안 살짝 흐리게 표시해서 어떤 카드가 옮겨지고 있는지 보여줌
  const [draggingPostId, setDraggingPostId] = useState(null);
  // 노트 카드 우측 상단 X 버튼을 눌렀을 때 - 상세 페이지 들어가지 않고 바로 삭제할 수 있도록
  // 눌린 카드 밑에 "정말 삭제하시겠습니까?" 확인 팝업을 보여줌 (한 번에 하나만 열림)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  // 노트 정렬 기준 - 제목순 / 만든 날짜순 / 수정한 날짜순
  const [sortBy, setSortBy] = useState("created_at");

  // 제목 일치가 아니라 노트 "내용"의 의미로 찾는 AI(RAG) 검색 모드 - 켜져 있으면
  // 폴더/태그/정렬/페이지네이션과 무관하게 그 사용자의 전체 노트 중 관련도 순으로
  // 상위 몇 개만 보여줌 (지금 보고 있는 폴더에 갇히지 않고 어디 있는지 몰라도 찾을 수 있게)
  const [aiMode, setAiMode] = useState(false);
  const [aiResults, setAiResults] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSearched, setAiSearched] = useState(false);

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
        Boolean(keyword), // 상위 폴더에서 검색할 땐 하위 폴더의 노트까지 함께 검색
        sortBy
      );
      setPosts(data.posts);
      setTotal(data.total);
    } catch (error) {
      setErrorMessage(t("postDetail.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, [page, keyword, selectedTags, selectedCategoryId, sortBy]);

  // 사이드바에서 노트를 드래그해서 다른 폴더로 옮기면(Sidebar.jsx가 이 이벤트를 쏨),
  // 지금 보고 있는 목록도 최신 상태로 다시 불러옴
  useEffect(() => {
    const handlePostsChanged = () => fetchPosts();
    window.addEventListener("studylog:posts-changed", handlePostsChanged);
    return () => window.removeEventListener("studylog:posts-changed", handlePostsChanged);
  }, [page, keyword, selectedTags, selectedCategoryId, sortBy]);

  const handleSearch = () => {
    if (aiMode) {
      handleAiSearch();
      return;
    }
    setPage(1);
    setKeyword(inputKeyword.trim() || null);
  };

  const handleAiSearch = async () => {
    const q = inputKeyword.trim();
    if (!q) {
      setAiResults([]);
      setAiSearched(false);
      return;
    }
    setAiLoading(true);
    setAiSearched(true);
    setErrorMessage("");
    try {
      const data = await searchSemanticPosts(q, token, 8);
      setAiResults(data.posts);
    } catch (error) {
      setAiResults([]);
      setErrorMessage(t("postDetail.loadFailed"));
    } finally {
      setAiLoading(false);
    }
  };

  // AI 검색 모드를 켜고 끌 때 - 서로 다른 검색 결과가 섞여 보이지 않도록 반대쪽 상태를 정리
  const handleToggleAiMode = () => {
    setAiMode((prev) => !prev);
    setInputKeyword("");
    setKeyword(null);
    setAiResults([]);
    setAiSearched(false);
    setPage(1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleSortChange = (value) => {
    setPage(1);
    setSortBy(value);
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

  // 삭제 확인 팝업이 열려 있을 때 바깥을 클릭하면 닫힘 (팝업 자체 클릭은 막아둠 - 아래 JSX 참고)
  useEffect(() => {
    if (confirmDeleteId === null) return;
    const handleOutsideClick = () => setConfirmDeleteId(null);
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [confirmDeleteId]);

  // 미리보기 카드의 X 버튼 -> 확인 팝업에서 삭제를 누르면 실제로 삭제
  const handleDeleteNote = async (postId) => {
    try {
      await deletePost(postId, token);
      setConfirmDeleteId(null);
      fetchPosts();
    } catch (error) {
      alert(t("postDetail.deleteFailed"));
    }
  };

  const handleSelectCategory = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setPage(1);
    setInputKeyword("");
    setKeyword(null);
    setSelectedTags([]);
    // AI 검색은 폴더 구분 없이 전체 노트를 대상으로 하는 기능이라, 폴더를 클릭하면
    // 헷갈리지 않도록 일반 검색/목록 모드로 되돌림
    setAiMode(false);
    setAiResults([]);
    setAiSearched(false);
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

  // AI 검색 모드일 땐 일반 목록(posts/loading) 대신 별도로 관리하는 결과(aiResults/aiLoading)를 보여줌
  const displayPosts = aiMode ? aiResults : posts;
  const displayLoading = aiMode ? aiLoading : loading;

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

  // 특정 폴더를 보고 있을 땐 "최근 노트"라는 일반 문구 대신 그 폴더 이름을 보여줌
  // (전체보기일 땐 특정 폴더가 없으니 그대로 "최근 노트" 유지)
  const notesSectionTitle = selectedCategoryNode?.name || t("notes.recentNotes");

  return (
  <SidebarLayout
    selectedCategoryId={selectedCategoryId}
    onSelectCategory={handleSelectCategory}
  >
    <div className="flex-1 min-w-0 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      {/* 상단 헤더 */}
      <div className="sticky top-0 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 sm:px-8 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
          <SidebarSpacer />
          <button onClick={() => handleSelectCategory(null)} className="hover:text-blue-600 dark:hover:text-blue-400">
            {t("notes.allNotes")}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreatePost}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Play size={14} fill="white" /> {t("notes.newPost")}
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-8">
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={inputKeyword}
            onChange={(e) => setInputKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={aiMode ? t("notes.aiSearchPlaceholder") : t("notes.searchPlaceholder")}
            className="w-full pl-9 pr-28 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-900 dark:text-gray-100"
          />
          {/* 제목 일치 검색과 AI(의미 기반) 검색을 전환하는 토글 - 켜져 있으면 카테고리/태그/
              정렬/페이지네이션은 의미가 없어져서 아래 필터들을 통째로 숨김 */}
          <button
            type="button"
            onClick={handleToggleAiMode}
            title={t("notes.aiSearchHint")}
            className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors ${
              aiMode
                ? "bg-blue-600 text-white"
                : "text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700/60"
            }`}
          >
            <Sparkles size={13} /> {t("notes.aiSearchToggle")}
          </button>
        </div>

        {!aiMode && (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 text-sm px-4 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <SlidersHorizontal size={14} /> {t("notes.category")}
            </button>
            <SortDropdown value={sortBy} onChange={handleSortChange} t={t} />
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`text-sm px-3 py-2 rounded-full border transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
                }`}
              >
                # {tag}
              </button>
            ))}
          </div>
        )}

        {!aiMode && (keyword || selectedTags.length > 0) && (
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-500 dark:text-gray-400">
            <span>{t("notes.searchResults", { count: total })}</span>
            <button onClick={handleReset} className="text-blue-500 dark:text-blue-400 hover:underline">{t("notes.reset")}</button>
          </div>
        )}

        {aiMode && aiSearched && (
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-500 dark:text-gray-400">
            <span>{t("notes.searchResults", { count: aiResults.length })}</span>
            <button
              onClick={() => { setInputKeyword(""); setAiResults([]); setAiSearched(false); }}
              className="text-blue-500 dark:text-blue-400 hover:underline"
            >
              {t("notes.reset")}
            </button>
          </div>
        )}

        {!aiMode && subCategories.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">{t("notes.subfolders")}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {subCategories.map((child) => (
                <button
                  key={child.id}
                  onClick={() => handleSelectCategory(child.id)}
                  className="flex flex-col items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 text-center hover:border-blue-200 dark:hover:border-blue-500/40 hover:shadow-sm transition-all"
                >
                  <Folder size={18} className="text-blue-500 dark:text-blue-400 shrink-0" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate w-full">{child.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {aiMode ? t("notes.aiSearchResultsTitle") : notesSectionTitle}
          </h2>
          {!aiMode && (
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{t("notes.viewAll")} →</button>
          )}
        </div>

        {displayLoading && (
          <div className="text-center text-gray-400 dark:text-gray-500 py-12">{t("common.loading")}</div>
        )}

        {errorMessage && (
          <div className="bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{errorMessage}</div>
        )}

        {!displayLoading && displayPosts.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 py-16">
            {aiMode ? <Sparkles size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" /> : <FileText size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />}
            <div className="font-medium text-gray-500 dark:text-gray-400">
              {aiMode
                ? (aiSearched ? t("notes.aiSearchEmpty") : t("notes.aiSearchPrompt"))
                : (keyword || selectedTags.length > 0
                  ? t("notes.noSearchResults")
                  : t("notes.noPostsYet"))}
            </div>
            {!aiMode && (
              <button
                onClick={handleCreatePost}
                className="mt-4 text-blue-600 dark:text-blue-400 text-sm hover:underline flex items-center gap-1 mx-auto"
              >
                <Plus size={14} /> {t("notes.writeFirstNote")}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {displayPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => navigate(`/posts/${post.id}`)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData(POST_DRAG_TYPE, String(post.id));
                  setDraggingPostId(post.id);
                }}
                onDragEnd={() => setDraggingPostId(null)}
                className={`corner-bracket relative bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md hover:border-blue-100 dark:hover:border-blue-500/40 transition-all ${
                  draggingPostId === post.id ? "opacity-40" : ""
                }`}
              >
                {/* 상세 페이지에 안 들어가고도 바로 삭제할 수 있는 X 버튼 - 누르면 카드 이동/열람과
                    안 겹치도록 바로 밑에 "정말 삭제하시겠습니까?" 확인 팝업을 띄움 */}
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(post.id); }}
                  title={t("postDetail.delete")}
                  className="absolute top-2 right-2 z-10 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 p-1 rounded"
                >
                  <X size={14} />
                </button>
                {confirmDeleteId === post.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-9 right-2 z-20 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3"
                  >
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">{t("postDetail.confirmDelete")}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteNote(post.id)}
                        className="flex-1 text-xs bg-red-500 text-white rounded-lg px-2 py-1.5 hover:bg-red-600"
                      >
                        {t("postDetail.delete")}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="flex-1 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  </div>
                )}
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-1 pr-5">
                  <FileText size={12} />
                  <span>{post.category_id ? (findCategoryName(categories, post.category_id) || t("notes.categoryPrefix")) : t("notes.uncategorized")}</span>
                  {/* AI 검색 결과에만 있는 score(코사인 유사도)를 관련도(%)로 보여줘서
                      왜 이 노트가 뜨는지, 얼마나 비슷한지 감을 잡을 수 있게 함 */}
                  {aiMode && typeof post.score === "number" && (
                    <span className="ml-auto shrink-0 flex items-center gap-1 text-blue-500 dark:text-blue-400">
                      <Sparkles size={11} /> {t("notes.relevance", { percent: Math.round(post.score * 100) })}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1.5 line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-gray-400 dark:text-gray-500 text-sm mb-3 line-clamp-2">
                  {post.preview}
                </p>
                {/* 태그가 많아도 카드 높이가 늘어나지 않도록 한 줄만 보여주고, 다 못 보여준
                    나머지는 "..."으로 더 있다는 것만 표시 (줄바꿈 없이 딱 3개까지만).
                    태그가 아예 없는 노트는 이 영역이 통째로 비어서 높이가 0이 되어버리니,
                    태그 유무와 상관없이 모든 카드 높이가 같도록 min-h로 자리를 항상 확보해둠 */}
                <div className="flex items-center gap-2 overflow-hidden min-h-[26px]">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="shrink-0 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-full"
                    >
                      # {tag}
                    </span>
                  ))}
                  {post.tags.length > 3 && (
                    <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">...</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!aiMode && totalPages > 1 && (
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
