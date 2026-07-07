import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getCategories, createCategory, renameCategory, deleteCategory, updateCategoryColor } from "../api/categories";
import { getPosts, deleteUncategorizedPosts } from "../api/posts";
import { useAuth } from "../context/AuthContext";
import { FolderTree, FileText, ChevronRight, Trash2, FolderPlus, Pencil, FilePlus2, Palette } from "lucide-react";
import SidebarLayout, { SidebarSpacer } from "../components/SidebarLayout";
import FolderTile from "../components/FolderTile";
import ColorDotPicker from "../components/ColorPicker";

// 실제 카테고리가 아니라 "어떤 폴더에도 속하지 않은 노트"를 모아 보여주는 가짜 폴더의 id.
// 예전에는 폴더를 삭제하면 안의 노트가 미분류로 남았는데(지금은 같이 삭제되도록 고침),
// 그때 남겨진 노트들을 찾아서 정리할 수 있게 최상위 폴더 목록에 항상 하나 끼워 넣음
const UNCATEGORIZED_ID = "uncategorized";

// 트리에서 id로 노드(children 포함) 찾기
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

// 이 페이지는 사이드바처럼 폴더와 노트를 한 화면에 같이 보여주는 게 아니라, 폴더 브라우징
// 자체를 목적으로 한 화면 - 최상위에선 폴더만 보이고, 폴더를 누르면 그 하위 폴더로
// "들어가서" 보게 되고, 하위 폴더를 누르면 그 안의 모든 노트가 보임(그 아래 더 깊은
// 폴더가 있어도 폴더 탐색은 여기서 끝나고 바로 노트로 넘어감).
// path: 지금까지 들어온 폴더의 [{id, name}, ...] 스택. 비어있으면 최상위(폴더 목록)
function AllFoldersPage() {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [path, setPath] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  // 지금 보고 있는 폴더(최상위든, 각각의 카테고리 폴더 안이든) 안의 "빈 바탕"에서 우클릭해서
  // 바로 하위 폴더를 만드는 기능 - Sidebar.jsx의 컨텍스트 메뉴와 같은 패턴(prompt() 대신 인라인 입력)
  const [contextMenu, setContextMenu] = useState(null); // {x, y} | null
  const [addingFolderInMenu, setAddingFolderInMenu] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // 폴더 타일 "위"에서 우클릭하면 Sidebar의 폴더 컨텍스트 메뉴와 동일하게
  // 하위 폴더 추가/글쓰기/이름변경/삭제를 여기서도 할 수 있게 함
  const [folderMenu, setFolderMenu] = useState(null); // {x, y, folder} | null
  const [folderMenuMode, setFolderMenuMode] = useState(null); // null | "addSubfolder" | "rename" | "color"
  const [folderMenuInput, setFolderMenuInput] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const data = await getCategories(token);
        setCategories(data);
      } catch (error) {
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, [token]);

  const currentNode = path.length > 0 ? findCategoryNode(categories, path[path.length - 1].id) : null;
  // "미분류" 가짜 폴더로 들어온 상태인지 - 실제 카테고리가 아니라서 하위 폴더 개념이 없고
  // 항상 바로 노트 목록만 보여줌
  const isUncategorizedView = path.length > 0 && path[0].id === UNCATEGORIZED_ID;

  // 최상위(path 비어있음)이거나, 한 번만 들어간 상태에서 그 폴더에 하위 폴더가 실제로
  // 있을 때만 "폴더 목록" 모드. 그 외(하위 폴더를 또 눌렀거나, 들어간 폴더에 하위 폴더가
  // 아예 없는 경우, 혹은 미분류 보기)엔 "노트 목록" 모드로 취급
  const isFolderBrowsingMode = !isUncategorizedView && (path.length === 0 || (path.length === 1 && (currentNode?.children?.length || 0) > 0));
  const foldersToShow = path.length === 0 ? categories : (currentNode?.children || []);

  useEffect(() => {
    if (isFolderBrowsingMode) {
      setPosts([]);
      return;
    }
    const fetchNotes = async () => {
      setLoadingPosts(true);
      try {
        // 미분류 보기에서는 category_id=0이 "카테고리 없음"을 뜻하는 기존 백엔드 규칙을 그대로 씀
        const categoryIdParam = isUncategorizedView ? 0 : (currentNode?.id ?? null);
        const data = await getPosts(1, 50, null, null, token, categoryIdParam, true);
        setPosts(data.posts);
      } catch (error) {
        setPosts([]);
      } finally {
        setLoadingPosts(false);
      }
    };
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, categories]);

  const handleEnterFolder = (folder) => {
    setPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleEnterUncategorized = () => {
    setPath([{ id: UNCATEGORIZED_ID, name: t("folders.uncategorized") }]);
  };

  const handleBreadcrumbClick = (index) => {
    // index === -1 -> 맨 처음(전체 폴더보기)으로
    setPath((prev) => (index < 0 ? [] : prev.slice(0, index + 1)));
  };

  const handleDeleteAllUncategorized = async () => {
    if (!window.confirm(t("folders.confirmDeleteAllUncategorized"))) return;
    setDeletingAll(true);
    try {
      await deleteUncategorizedPosts(token);
      setPosts([]);
    } catch (error) {
      window.alert(t("folders.deleteFailed"));
    } finally {
      setDeletingAll(false);
    }
  };

  // 우클릭 폴더 추가 메뉴가 열려 있을 때 바깥을 클릭하거나 Esc를 누르면 닫힘
  useEffect(() => {
    if (!contextMenu) return;
    const closeMenu = () => { setContextMenu(null); setAddingFolderInMenu(false); setNewFolderName(""); };
    const handleEsc = (e) => { if (e.key === "Escape") closeMenu(); };
    document.addEventListener("click", closeMenu);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [contextMenu]);

  // 폴더 타일 컨텍스트 메뉴도 마찬가지로 바깥 클릭/Esc로 닫힘
  useEffect(() => {
    if (!folderMenu) return;
    const closeMenu = () => { setFolderMenu(null); setFolderMenuMode(null); setFolderMenuInput(""); };
    const handleEsc = (e) => { if (e.key === "Escape") closeMenu(); };
    document.addEventListener("click", closeMenu);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [folderMenu]);

  // 카테고리 목록을 다시 불러오고, Sidebar에도 알려줌(Sidebar는 폴더 목록을 독립적으로
  // fetch해서 들고 있어서, 여기서 생성/이름변경/삭제한 게 바로 반영되려면 전역 이벤트가 필요함)
  const refreshCategories = async () => {
    const data = await getCategories(token);
    setCategories(data);
    window.dispatchEvent(new Event("studylog:categories-changed"));
  };

  // 지금 들어와 있는 폴더(currentNode)의 하위 폴더로 생성 - 최상위(path 비어있음)면
  // 루트 폴더로 생성. "미분류"는 실제 카테고리가 아니라서 우클릭 메뉴 자체를 안 띄움
  const contextMenuParentId = path.length > 0 ? currentNode?.id ?? null : null;

  const handleOpenContentMenu = (e) => {
    if (isUncategorizedView) return;
    e.preventDefault();
    setFolderMenu(null); // 폴더 타일 메뉴가 열려있었다면 닫음(하나만 열려있어야 함)
    setContextMenu({ x: e.clientX, y: e.clientY });
    setAddingFolderInMenu(false);
    setNewFolderName("");
  };

  const handleCreateFolderFromContent = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createCategory(newFolderName.trim(), contextMenuParentId, token);
      await refreshCategories();
      setContextMenu(null);
      setAddingFolderInMenu(false);
      setNewFolderName("");
    } catch (error) {
      alert(error.response?.data?.detail || t("sidebar.addFolderFailed"));
    }
  };

  // 폴더 타일 위에서 우클릭 - Sidebar의 CategoryItem 컨텍스트 메뉴와 동일한 기능
  // (하위 폴더 추가 / 글쓰기 / 이름변경 / 삭제)을 이 페이지 안에서도 쓸 수 있게 함
  const openFolderMenu = (e, folder) => {
    e.preventDefault();
    e.stopPropagation(); // 배경 우클릭 메뉴(하위 폴더 추가)가 같이 뜨지 않도록
    setContextMenu(null); // 배경 메뉴가 열려있었다면 닫음
    setFolderMenu({ x: e.clientX, y: e.clientY, folder });
    setFolderMenuMode(null);
    setFolderMenuInput("");
  };

  const closeFolderMenu = () => {
    setFolderMenu(null);
    setFolderMenuMode(null);
    setFolderMenuInput("");
  };

  const handleWriteInFolder = (folder) => {
    navigate(`/posts/create?category=${folder.id}`);
  };

  const submitFolderMenuInput = async () => {
    if (!folderMenuInput.trim() || !folderMenu) return;
    try {
      if (folderMenuMode === "addSubfolder") {
        await createCategory(folderMenuInput.trim(), folderMenu.folder.id, token);
      } else if (folderMenuMode === "rename") {
        await renameCategory(folderMenu.folder.id, folderMenuInput.trim(), token);
      }
      await refreshCategories();
      closeFolderMenu();
    } catch (error) {
      alert(error.response?.data?.detail || t("sidebar.addFolderFailed"));
    }
  };

  const handleDeleteFolderFromMenu = async (folder) => {
    if (!window.confirm(t("sidebar.confirmDeleteFolder"))) return;
    try {
      await deleteCategory(folder.id, token);
      await refreshCategories();
      closeFolderMenu();
    } catch (error) {}
  };

  // 색상 점을 누르면 바로 적용됨 (별도 저장 버튼 없음) - colorKey가 null이면 색상을 없앰
  const handleChangeFolderColor = async (folder, colorKey) => {
    try {
      await updateCategoryColor(folder.id, colorKey, token);
      await refreshCategories();
      closeFolderMenu();
    } catch (error) {
      alert(error.response?.data?.detail || t("sidebar.addFolderFailed"));
    }
  };

  // selectedCategoryId를 안 넘겨서(undefined) "전체 보기"가 같이 선택된 것처럼 보이지
  // 않도록 함 - 이 페이지 자체의 선택 표시는 location.pathname 기준으로 따로 처리됨
  return (
    <SidebarLayout onSelectCategory={(id) => navigate(id === null ? "/notes" : `/notes?category=${id}`)}>
      {/* onContextMenu를 이 페이지의 스크롤 영역 전체(헤더 포함)에 걸어둬서, 폴더 타일이
          있는 자리든 그 아래 완전히 빈 공간이든 어디서 우클릭해도 지금 보고 있는 폴더 안에
          하위 폴더를 만들 수 있게 함. 폴더 타일/노트 카드 위에서는 각자 onContextMenu에서
          stopPropagation하므로 이 핸들러까지 안 올라와서 서로 안 겹침 */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-gray-50 dark:bg-gray-900" onContextMenu={handleOpenContentMenu}>
        <div className="sticky top-0 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 sm:px-8 py-4 z-10">
          <div className="flex items-center gap-2 text-sm">
            <SidebarSpacer />
            <button
              onClick={() => handleBreadcrumbClick(-1)}
              className={`flex items-center gap-1.5 ${path.length === 0 ? "text-gray-800 dark:text-gray-100 font-bold text-lg" : "text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"}`}
            >
              <FolderTree size={path.length === 0 ? 18 : 14} className={path.length === 0 ? "text-blue-600 dark:text-blue-400" : ""} />
              {t("folders.title")}
            </button>
            {path.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-2">
                <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
                <button
                  onClick={() => handleBreadcrumbClick(i)}
                  className={i === path.length - 1
                    ? "text-gray-800 dark:text-gray-100 font-bold text-lg"
                    : "text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="px-4 sm:px-8 py-8">
          {isFolderBrowsingMode ? (
            <>
              {loadingCategories && (
                <div className="text-center text-gray-400 dark:text-gray-500 py-12">{t("common.loading")}</div>
              )}
              {!loadingCategories && foldersToShow.length === 0 && path.length > 0 && (
                <div className="text-center text-gray-400 dark:text-gray-500 py-16">{t("folders.empty")}</div>
              )}
              {!loadingCategories && (foldersToShow.length > 0 || path.length === 0) && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {foldersToShow.map((folder) => (
                    <FolderTile
                      key={folder.id}
                      name={folder.name}
                      color={folder.color}
                      onClick={() => handleEnterFolder(folder)}
                      // 폴더 타일 위에서 우클릭하면 배경 우클릭(하위 폴더 추가)이 아니라
                      // Sidebar와 동일한 폴더별 메뉴(하위 폴더 추가/글쓰기/이름변경/삭제/색상)가 뜸
                      onContextMenu={(e) => openFolderMenu(e, folder)}
                    />
                  ))}
                  {/* 실제 폴더가 아니라, 예전에 폴더 삭제로 남겨진 미분류 노트를 정리하러 가는
                      가짜 폴더 - 최상위에서만 보여줌 */}
                  {path.length === 0 && (
                    <FolderTile
                      name={t("folders.uncategorized")}
                      onClick={handleEnterUncategorized}
                      onContextMenu={(e) => e.stopPropagation()}
                      title={t("folders.uncategorizedHint")}
                      muted
                    />
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {isUncategorizedView && (
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t("folders.uncategorizedHint")}</p>
                  {posts.length > 0 && (
                    <button
                      onClick={handleDeleteAllUncategorized}
                      disabled={deletingAll}
                      className="flex items-center gap-1.5 text-xs font-medium text-red-500 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50 transition-colors shrink-0"
                    >
                      <Trash2 size={13} /> {t("folders.deleteAllUncategorized")}
                    </button>
                  )}
                </div>
              )}
              {loadingPosts && (
                <div className="text-center text-gray-400 dark:text-gray-500 py-12">{t("common.loading")}</div>
              )}
              {!loadingPosts && posts.length === 0 && (
                <div className="text-center text-gray-400 dark:text-gray-500 py-16">{t("notes.noPostsYet")}</div>
              )}
              {!loadingPosts && posts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => navigate(`/posts/${post.id}`)}
                      onContextMenu={(e) => e.stopPropagation()}
                      className="corner-bracket bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md hover:border-blue-100 dark:hover:border-blue-500/40 transition-all"
                    >
                      <div className="text-xs text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-1">
                        <FileText size={12} />
                        <span>{new Intl.DateTimeFormat(i18n.language === "ko" ? "ko-KR" : "en-US").format(new Date(post.created_at))}</span>
                      </div>
                      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1.5 line-clamp-2">{post.title}</h3>
                      <p className="text-gray-400 dark:text-gray-500 text-sm line-clamp-2">{post.preview}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* 우클릭 폴더 추가 메뉴 - Sidebar의 우클릭 메뉴와 같은 스타일(prompt() 대신 인라인 입력) */}
          {contextMenu && (
            <div
              className="fixed z-50 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm"
              style={{ top: contextMenu.y, left: contextMenu.x }}
              onClick={(e) => e.stopPropagation()}
            >
              {!addingFolderInMenu ? (
                <button
                  onClick={() => setAddingFolderInMenu(true)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                >
                  <FolderPlus size={14} className="shrink-0" />
                  {contextMenuParentId !== null ? t("sidebar.addSubfolder") : t("sidebar.newFolder")}
                </button>
              ) : (
                <div className="px-2 py-1.5">
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateFolderFromContent();
                      if (e.key === "Escape") { setContextMenu(null); setAddingFolderInMenu(false); }
                    }}
                    placeholder={t("sidebar.folderNamePlaceholder")}
                    className="w-full text-sm border border-blue-300 dark:border-blue-500 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1 focus:outline-none mb-1.5"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={handleCreateFolderFromContent}
                      className="text-xs bg-blue-500 text-white px-2 py-1 rounded-lg hover:bg-blue-600"
                    >
                      {t("sidebar.add")}
                    </button>
                    <button
                      onClick={() => { setContextMenu(null); setAddingFolderInMenu(false); }}
                      className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/60"
                    >
                      {t("sidebar.cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 폴더 타일 위 우클릭 메뉴 - Sidebar의 CategoryItem 컨텍스트 메뉴와 동일한 구성
              (하위 폴더 추가 / 글쓰기 / 이름변경 / 삭제) */}
          {folderMenu && (
            <div
              className="fixed z-50 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm"
              style={{ top: folderMenu.y, left: folderMenu.x }}
              onClick={(e) => e.stopPropagation()}
            >
              {folderMenuMode === null && (
                <>
                  <button
                    onClick={() => { setFolderMenuMode("addSubfolder"); setFolderMenuInput(""); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                  >
                    <FolderPlus size={14} className="shrink-0" /> {t("sidebar.addSubfolder")}
                  </button>
                  <button
                    onClick={() => { handleWriteInFolder(folderMenu.folder); closeFolderMenu(); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                  >
                    <FilePlus2 size={14} className="shrink-0" /> {t("sidebar.writeNote")}
                  </button>
                  <button
                    onClick={() => { setFolderMenuMode("rename"); setFolderMenuInput(folderMenu.folder.name); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                  >
                    <Pencil size={14} className="shrink-0" /> {t("sidebar.rename")}
                  </button>
                  <button
                    onClick={() => setFolderMenuMode("color")}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                  >
                    <Palette size={14} className="shrink-0" /> {t("sidebar.changeColor")}
                  </button>
                  <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                  <button
                    onClick={() => handleDeleteFolderFromMenu(folderMenu.folder)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <Trash2 size={14} className="shrink-0" /> {t("sidebar.delete")}
                  </button>
                </>
              )}
              {(folderMenuMode === "addSubfolder" || folderMenuMode === "rename") && (
                <div className="px-2 py-1.5">
                  <input
                    autoFocus
                    value={folderMenuInput}
                    onChange={(e) => setFolderMenuInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitFolderMenuInput();
                      if (e.key === "Escape") closeFolderMenu();
                    }}
                    placeholder={t("sidebar.folderNamePlaceholder")}
                    className="w-full text-sm border border-blue-300 dark:border-blue-500 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1 focus:outline-none mb-1.5"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={submitFolderMenuInput}
                      className="text-xs bg-blue-500 text-white px-2 py-1 rounded-lg hover:bg-blue-600"
                    >
                      {folderMenuMode === "rename" ? t("common.save") : t("sidebar.add")}
                    </button>
                    <button
                      onClick={closeFolderMenu}
                      className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/60"
                    >
                      {t("sidebar.cancel")}
                    </button>
                  </div>
                </div>
              )}
              {folderMenuMode === "color" && (
                <div className="px-3 py-2">
                  <ColorDotPicker
                    value={folderMenu.folder.color}
                    onChange={(colorKey) => handleChangeFolderColor(folderMenu.folder, colorKey)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}

export default AllFoldersPage;
