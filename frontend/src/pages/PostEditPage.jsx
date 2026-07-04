import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { getPost, updatePost } from "../api/posts";
import { getCategories } from "../api/categories";
import { useAuth } from "../context/AuthContext";
import RichTextEditor from "../components/RichTextEditor";
import TagInput from "../components/TagInput";
import { ChevronRight } from "lucide-react";
import SidebarLayout, { SidebarSpacer } from "../components/SidebarLayout";

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

function PostEditPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(null); // null = 로드 전
  const [tags, setTags] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postData, categoryData] = await Promise.all([
          getPost(id),
          getCategories(token)
        ]);
        setTitle(postData.title);
        setContent(postData.content);
        setTags(postData.tags);
        setCategoryId(postData.category_id != null ? Number(postData.category_id) : null);
        setCategories(flattenCategories(categoryData));
      } catch (error) {
        setErrorMessage(t("postEdit.loadFailed"));
      }
    };
    fetchData();
  }, [id]);

  // 사이드바에서 카테고리를 누르면 노트 목록 페이지로 이동 (다른 페이지들과 동일한 동작)
  const handleSelectCategory = (catId) => {
    navigate(catId === null ? "/notes" : `/notes?category=${catId}`);
  };

  const handleUpdate = async () => {
    if (!title || !content) {
      setErrorMessage(t("postEdit.requiredFields"));
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      await updatePost(id, title, content, tags, token, categoryId);
      navigate(`/posts/${id}`);
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || t("postEdit.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarLayout selectedCategoryId={categoryId} onSelectCategory={handleSelectCategory}>
      {/* 메인 작성 영역 */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        {/* 상단 헤더 */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-8 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500">
            <SidebarSpacer />
            <button onClick={() => navigate("/notes")} className="hover:text-blue-600 dark:hover:text-blue-400">{t("postEdit.allNotes")}</button>
            <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
            <button onClick={() => navigate(`/posts/${id}`)} className="hover:text-blue-600 dark:hover:text-blue-400 truncate max-w-32">
              {title || t("postEdit.postFallback")}
            </button>
            <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">{t("postEdit.edit")}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              {t("common.aiStatusOnline")}
            </div>
            <button
              onClick={handleUpdate}
              disabled={loading}
              className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
                loading ? "bg-blue-300 text-white cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {loading ? t("postEdit.saving") : t("postEdit.save")}
            </button>
            <button
              onClick={() => navigate(`/posts/${id}`)}
              className="text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 px-4 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t("postEdit.cancel")}
            </button>
          </div>
        </div>

        {/* 수정 폼 */}
        <div className="px-8 py-8 max-w-4xl">
          {errorMessage && (
            <div className="bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{errorMessage}</div>
          )}

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("postEdit.titlePlaceholder")}
            className="w-full text-3xl font-bold text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 border-none outline-none mb-6 bg-transparent"
          />

          <div className="mb-6">
            <select
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
              className="text-sm text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
            >
              <option value="">📁 {t("postEdit.selectCategory")}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {"　".repeat(cat.depth)}📁 {cat.name}
                </option>
              ))}
            </select>
          </div>

          {content !== null && (
            <RichTextEditor initialContent={content} onChange={setContent} />
          )}

          <div className="mt-6">
            <TagInput tags={tags} onChange={setTags} placeholder={`🏷 ${t("postEdit.tagsPlaceholder")}`} />
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

export default PostEditPage;