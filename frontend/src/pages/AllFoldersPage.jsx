import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getCategories } from "../api/categories";
import { getPosts } from "../api/posts";
import { useAuth } from "../context/AuthContext";
import { Folder, FolderTree, FileText, ChevronRight } from "lucide-react";
import SidebarLayout, { SidebarSpacer } from "../components/SidebarLayout";

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

  // 최상위(path 비어있음)이거나, 한 번만 들어간 상태에서 그 폴더에 하위 폴더가 실제로
  // 있을 때만 "폴더 목록" 모드. 그 외(하위 폴더를 또 눌렀거나, 들어간 폴더에 하위 폴더가
  // 아예 없는 경우)엔 "노트 목록" 모드로 취급
  const isFolderBrowsingMode = path.length === 0 || (path.length === 1 && (currentNode?.children?.length || 0) > 0);
  const foldersToShow = path.length === 0 ? categories : (currentNode?.children || []);

  useEffect(() => {
    if (isFolderBrowsingMode) {
      setPosts([]);
      return;
    }
    const fetchNotes = async () => {
      setLoadingPosts(true);
      try {
        const data = await getPosts(1, 50, null, null, token, currentNode?.id ?? null, true);
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

  const handleBreadcrumbClick = (index) => {
    // index === -1 -> 맨 처음(전체 폴더보기)으로
    setPath((prev) => (index < 0 ? [] : prev.slice(0, index + 1)));
  };

  // selectedCategoryId를 안 넘겨서(undefined) "전체 보기"가 같이 선택된 것처럼 보이지
  // 않도록 함 - 이 페이지 자체의 선택 표시는 location.pathname 기준으로 따로 처리됨
  return (
    <SidebarLayout onSelectCategory={(id) => navigate(id === null ? "/notes" : `/notes?category=${id}`)}>
      <div className="flex-1 min-w-0 overflow-y-auto bg-gray-50 dark:bg-gray-900">
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
              {!loadingCategories && foldersToShow.length === 0 && (
                <div className="text-center text-gray-400 dark:text-gray-500 py-16">{t("folders.empty")}</div>
              )}
              {!loadingCategories && foldersToShow.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {foldersToShow.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => handleEnterFolder(folder)}
                      className="flex flex-col items-center gap-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-2.5 text-center hover:border-blue-200 dark:hover:border-blue-500/40 hover:shadow-sm transition-all"
                    >
                      <Folder size={18} className="text-blue-500 dark:text-blue-400 shrink-0" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate w-full">{folder.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
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
        </div>
      </div>
    </SidebarLayout>
  );
}

export default AllFoldersPage;
