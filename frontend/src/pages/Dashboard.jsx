import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getPosts } from "../api/posts";
import { getCategories } from "../api/categories";
import { getTodos, toggleTodo } from "../api/todos";
import { getMyProfile, updateMyProfile } from "../api/users";
import { uploadImage } from "../api/uploads";
import { useAuth } from "../context/AuthContext";
import SidebarLayout, { SidebarSpacer } from "../components/SidebarLayout";
import NoteCarousel from "../components/NoteCarousel";
import {
  Plus, BrainCircuit, ArrowRight, NotebookText, FolderTree, CheckCircle2, Circle, ListTodo,
  Camera, FileWarning,
} from "lucide-react";

const PRIORITY_DOT = { low: "bg-gray-400 dark:bg-gray-500", medium: "bg-amber-500", high: "bg-red-500" };

// 참고 이미지의 대시보드는 카드 아이콘에 색색깔 배지 없이 잉크색 하나로 통일돼 있어서,
// blue/purple/amber 구분 없이 전부 같은 무채색 톤으로 맞춤(호출부의 color prop은 그대로 둠)
const STAT_COLOR = {
  blue: "text-gray-700 dark:text-gray-300",
  purple: "text-gray-700 dark:text-gray-300",
  amber: "text-gray-700 dark:text-gray-300",
};

function todayDateString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// 카테고리 트리 전체 개수 세기 (재귀)
function countCategories(categories) {
  let count = 0;
  for (const c of categories) {
    count += 1;
    if (c.children?.length > 0) count += countCategories(c.children);
  }
  return count;
}

// 통계 카드 하나 (전체 노트 / 카테고리 / 오답노트)
function StatCard({ icon: Icon, color, label, value, soon, t }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col gap-2">
      <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${STAT_COLOR[color]}`}>
        <Icon size={16} />
      </div>
      <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{value}</div>
      <div className="font-mono text-xs text-gray-400 dark:text-gray-500">{label}</div>
      {soon && <div className="text-[10px] text-gray-300 dark:text-gray-600">{t("documents.comingSoon")}</div>}
    </div>
  );
}

function Dashboard() {
  const { t } = useTranslation();
  const { token, user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [totalNotes, setTotalNotes] = useState(null);
  const [categoryCount, setCategoryCount] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeNoteIndex, setActiveNoteIndex] = useState(0); // 최근 노트 캐러셀에서 가운데(활성) 카드 인덱스
  const [todayTodos, setTodayTodos] = useState([]);
  const [todosLoading, setTodosLoading] = useState(true);

  // 프로필 카드 (닉네임/이메일/사진) - AuthContext의 user는 로그인 때 캐시된 최소 정보라
  // email/profile_image가 정확하려면 /api/users/me로 최신 정보를 따로 받아와야 함
  const [profile, setProfile] = useState(null);
  const fileInputRef = useRef(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [postsData, categories] = await Promise.all([
          getPosts(1, 10, null, null, token, null),
          getCategories(token),
        ]);
        setTotalNotes(postsData.total);
        setRecentPosts(postsData.posts);
        setCategoryCount(countCategories(categories));
      } catch (error) {
        // 무시 (요약 통계는 참고용이라 실패해도 페이지는 그대로 보여줌)
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  useEffect(() => {
    const loadTodos = async () => {
      setTodosLoading(true);
      try {
        const data = await getTodos(token);
        const today = todayDateString();
        setTodayTodos(data.filter((td) => td.due_date === today));
      } catch (error) {
        // 무시 (위젯이 참고용이라 실패해도 페이지는 그대로 보여줌)
      } finally {
        setTodosLoading(false);
      }
    };
    loadTodos();
  }, [token]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getMyProfile(token);
        setProfile(data);
        // 사이드바 등 다른 곳에서도 최신 닉네임/사진을 바로 쓸 수 있도록 캐시 동기화
        updateUser({ nickname: data.nickname, profile_image: data.profile_image });
      } catch (error) {}
    };
    if (token) loadProfile();
  }, [token]);

  const handleToggleTodo = async (todoId) => {
    // 낙관적 업데이트: 화면에 바로 반영하고, 실패하면 되돌림
    setTodayTodos((prev) => prev.map((td) => (td.id === todoId ? { ...td, is_done: !td.is_done } : td)));
    try {
      await toggleTodo(todoId, token);
    } catch (error) {
      setTodayTodos((prev) => prev.map((td) => (td.id === todoId ? { ...td, is_done: !td.is_done } : td)));
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일을 다시 선택해도 onChange가 다시 발생하도록 초기화
    if (!file) return;

    setPhotoUploading(true);
    setPhotoError("");
    try {
      const url = await uploadImage(file, token);
      await updateMyProfile({ profile_image: url }, token);
      setProfile((prev) => (prev ? { ...prev, profile_image: url } : prev));
      updateUser({ profile_image: url });
    } catch (error) {
      setPhotoError(t("dashboard.photoUploadFailed"));
    } finally {
      setPhotoUploading(false);
    }
  };

  // 사이드바에서 폴더 클릭 -> 대시보드에는 노트 목록이 없으니 노트 목록 페이지로 이동
  const handleSelectCategory = (categoryId) => {
    if (categoryId === null) navigate("/notes");
    else navigate(`/notes?category=${categoryId}`);
  };

  const displayNickname = profile?.nickname || user?.nickname || "";
  const displayEmail = profile?.email || "";
  const displayPhoto = profile?.profile_image || user?.profile_image || null;

  const statCards = [
    { icon: NotebookText, color: "blue", label: t("dashboard.totalNotes"), value: loading ? "-" : totalNotes },
    { icon: FolderTree, color: "purple", label: t("dashboard.categories"), value: loading ? "-" : categoryCount },
    { icon: FileWarning, color: "amber", label: t("dashboard.wrongNotes"), value: 0, soon: true },
  ];

  return (
    <SidebarLayout selectedCategoryId={null} onSelectCategory={handleSelectCategory}>
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="sticky top-0 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-8 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <SidebarSpacer />
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t("dashboard.title")}</h1>
          </div>
        </div>

        <div className="px-8 py-8 max-w-5xl">
          {/* 빠른 실행 */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate("/posts/create")}
              className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={14} /> {t("dashboard.newNote")}
            </button>
            <button
              onClick={() => navigate("/quiz")}
              className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm px-4 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <BrainCircuit size={14} /> {t("dashboard.takeQuiz")}
            </button>
          </div>

          {/* 상단: 프로필 카드 + 통계 카드 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* 프로필 카드 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
                  {displayPhoto
                    ? <img src={displayPhoto} alt={displayNickname} className="w-full h-full object-cover" />
                    : (displayNickname?.[0] || "S")}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading}
                  title={t("dashboard.changePhoto")}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center shadow-sm disabled:opacity-50"
                >
                  <Camera size={12} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate">{displayNickname}</div>
                {displayEmail && <div className="text-sm text-gray-400 dark:text-gray-500 truncate">{displayEmail}</div>}
                {photoUploading && (
                  <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">{t("dashboard.uploadingPhoto")}</div>
                )}
                {photoError && (
                  <div className="text-xs text-red-500 dark:text-red-400 mt-1">{photoError}</div>
                )}
              </div>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-3 gap-3">
              {statCards.map((card) => (
                <StatCard key={card.label} {...card} t={t} />
              ))}
            </div>
          </div>

          {/* 하단: 최근 노트, 그 아래에 오늘 할 일 (참고 이미지처럼 세로로 쌓는 구조) */}
          <div className="flex flex-col gap-8">
            {/* 최근 노트 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t("dashboard.recentNotes")}</h2>
                <button
                  onClick={() => navigate("/notes")}
                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t("dashboard.viewAll")} <ArrowRight size={13} />
                </button>
              </div>

              {!loading && recentPosts.length === 0 ? (
                <div className="text-center text-gray-400 dark:text-gray-500 py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                  <NotebookText size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm">{t("dashboard.noNotesYet")}</p>
                  <button
                    onClick={() => navigate("/posts/create")}
                    className="mt-3 text-blue-600 dark:text-blue-400 text-sm hover:underline"
                  >
                    {t("dashboard.writeFirstNote")}
                  </button>
                </div>
              ) : (
                <NoteCarousel
                  activeIndex={activeNoteIndex}
                  setActiveIndex={setActiveNoteIndex}
                  items={[
                    // 새 노트 작성 카드 - 참고 이미지처럼 점선 테두리 + 가운데 + 아이콘 (대시보드에서만)
                    {
                      id: "create-new",
                      onActivate: () => navigate("/posts/create"),
                      content: (
                        <div className="w-full h-full rounded-xl border border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-500/50 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                          <span className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <Plus size={18} />
                          </span>
                          <span className="text-xs">{t("dashboard.newNote")}</span>
                        </div>
                      ),
                    },
                    ...recentPosts.map((post) => ({
                      id: post.id,
                      onActivate: () => navigate(`/posts/${post.id}`),
                      content: (
                        <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col shadow-sm hover:shadow-md hover:border-blue-100 dark:hover:border-blue-500/40 transition-shadow">
                          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2 truncate">{post.title}</h3>
                          <p className="text-gray-400 dark:text-gray-500 text-xs line-clamp-4">{post.preview}</p>
                        </div>
                      ),
                    })),
                  ]}
                />
              )}
            </div>

            {/* 오늘 할 일 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t("dashboard.todayTodos")}</h2>
                <button
                  onClick={() => navigate("/todos")}
                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t("dashboard.viewAll")} <ArrowRight size={13} />
                </button>
              </div>

              {!todosLoading && todayTodos.length === 0 ? (
                <div className="text-center text-gray-400 dark:text-gray-500 py-10 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                  <ListTodo size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm">{t("dashboard.noTodosToday")}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {todayTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3"
                    >
                      <button onClick={() => handleToggleTodo(todo.id)} className="shrink-0">
                        {todo.is_done
                          ? <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400" />
                          : <Circle size={18} className="text-gray-300 dark:text-gray-600" />}
                      </button>
                      <span className={`flex-1 min-w-0 truncate text-sm ${todo.is_done ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-800 dark:text-gray-100"}`}>
                        {todo.title}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[todo.priority] || PRIORITY_DOT.medium}`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

export default Dashboard;
