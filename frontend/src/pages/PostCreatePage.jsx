import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPost } from "../api/posts";
import { getCategories } from "../api/categories";
import { useAuth } from "../context/AuthContext";
import RichTextEditor from "../components/RichTextEditor";
import { Lightbulb, FileText, ChevronRight } from "lucide-react";
import ResizableRightPanel from "../components/ResizableRightPanel";

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
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  // 노트 목록에서 특정 폴더를 보던 중 글쓰기를 누르면 그 폴더가 쿼리로 전달됨 -> 기본 선택값으로 사용
  // (없으면 "기본"을 의미하는 null)
  const [categoryId, setCategoryId] = useState(() => {
    const categoryParam = searchParams.get("category");
    return categoryParam !== null ? Number(categoryParam) : null;
  });
  const [categories, setCategories] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories(token);
        setCategories(flattenCategories(data));
      } catch (error) {}
    };
    fetchCategories();
  }, []);

  const handleCreate = async () => {
    if (!title || !content) {
      setErrorMessage(t("postCreate.requiredFields"));
      return;
    }
    const tags = tagInput.split(",").map((tag) => tag.trim()).filter((tag) => tag);
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await createPost(title, content, tags, token, categoryId);
      navigate(`/posts/${data.id}`);
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || t("postCreate.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full">
      {/* 메인 작성 영역 */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        {/* 상단 헤더 */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-8 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500">
            <button onClick={() => navigate("/notes")} className="hover:text-blue-600 dark:hover:text-blue-400">{t("postCreate.allNotes")}</button>
            <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">{t("postCreate.newPost")}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              {t("common.aiStatusOnline")}
            </div>
            <button
              onClick={handleCreate}
              disabled={loading}
              className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
                loading ? "bg-blue-300 text-white cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {loading ? t("postCreate.saving") : t("postCreate.save")}
            </button>
            <button
              onClick={() => navigate("/notes")}
              className="text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 px-4 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t("postCreate.cancel")}
            </button>
          </div>
        </div>

        {/* 작성 폼 */}
        <div className="px-8 py-8 max-w-4xl">
          {errorMessage && (
            <div className="bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{errorMessage}</div>
          )}

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("postCreate.titlePlaceholder")}
            className="w-full text-3xl font-bold text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 border-none outline-none mb-6 bg-transparent"
          />

          <div className="mb-6">
            <select
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
            >
              <option value="">📁 {t("postCreate.selectCategory")}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {"　".repeat(cat.depth)}📁 {cat.name}
                </option>
              ))}
            </select>
          </div>

          <RichTextEditor initialContent={content} onChange={setContent} />

          <div className="mt-6">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder={`🏷 ${t("postCreate.tagsPlaceholder")}`}
              className="w-full text-sm text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 우측 AI 패널 */}
      <ResizableRightPanel className="p-5 flex flex-col gap-4">
        <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            <Lightbulb size={15} className="text-yellow-500" /> {t("postCreate.aiContextTitle")}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{t("postCreate.aiContextHint")}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            {title ? t("postCreate.aiContextWithTitle") : t("postCreate.aiContextEmpty")}
          </p>
          <button className="mt-3 w-full text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
            {t("postCreate.insertTemplate")}
          </button>
        </div>

        <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            <FileText size={15} className="text-blue-500 dark:text-blue-400" /> {t("postCreate.relatedNotesTitle")}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            {t("postCreate.relatedNotesPlaceholder")}
          </p>
        </div>
      </ResizableRightPanel>
    </div>
  );
}

export default PostCreatePage;