import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { getPost, updatePost } from "../api/posts";
import { getCategories } from "../api/categories";
import { useAuth } from "../context/AuthContext";
import RichTextEditor from "../components/RichTextEditor";
import TagInput from "../components/TagInput";
import CategorySelect from "../components/CategorySelect";
import DraftRestoreBanner from "../components/DraftRestoreBanner";
import { ChevronRight } from "lucide-react";
import SidebarLayout, { SidebarSpacer } from "../components/SidebarLayout";
import { useDraftAutosave, useBeforeUnloadWarning, loadDraft, clearDraft } from "../hooks/useDraftAutosave";

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
  const [draftBanner, setDraftBanner] = useState(null);
  // 임시저장본을 불러올 때 BlockNote 에디터가 새 initialContent로 다시 만들어지도록
  // key를 바꿔서 강제 리마운트시킴 (에디터는 마운트 시점의 initialContent만 사용하므로)
  const [editorKey, setEditorKey] = useState(0);
  const { token } = useAuth();
  const navigate = useNavigate();
  const draftKey = `studylog:draft:edit:${id}`;

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

        // 서버에서 글을 불러온 뒤, 이 글을 편집하던 중 저장 안 된 임시저장본이 남아있는지 확인
        const draft = loadDraft(draftKey);
        if (draft && (draft.title || draft.content)) {
          setDraftBanner(draft);
        }
      } catch (error) {
        setErrorMessage(t("postEdit.loadFailed"));
      }
    };
    fetchData();
  }, [id]);

  const hasContent = Boolean(title || content);
  useDraftAutosave(draftKey, { title, content, tags, categoryId }, hasContent);
  useBeforeUnloadWarning(hasContent && !loading);

  const handleRestoreDraft = () => {
    setTitle(draftBanner.title || "");
    setContent(draftBanner.content || "");
    setTags(draftBanner.tags || []);
    if (draftBanner.categoryId !== undefined) setCategoryId(draftBanner.categoryId);
    setEditorKey((key) => key + 1);
    setDraftBanner(null);
  };

  const handleDiscardDraft = () => {
    clearDraft(draftKey);
    setDraftBanner(null);
  };

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
      clearDraft(draftKey);
      navigate(`/posts/${id}`);
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || t("postEdit.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarLayout selectedCategoryId={categoryId} onSelectCategory={handleSelectCategory}>
      {/* 메인 작성 영역 - Apple Pages처럼 회색 캔버스 위에 흰 "문서 페이지"가
          떠 있는 느낌을 주기 위해 배경(캔버스)과 실제 편집 카드(페이지)를 분리함 */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-gray-50 dark:bg-gray-950">
        {/* 상단 헤더 */}
        <div className="sticky top-0 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 sm:px-8 py-4 flex items-center justify-between z-10">
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
              className="text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 px-4 py-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-700"
            >
              {t("postEdit.cancel")}
            </button>
          </div>
        </div>

        {/* 문서 페이지 - 폭을 문서처럼 제한하고 캔버스 위에 흰 카드로 띄움 */}
        <div className="px-4 sm:px-8 py-10">
          <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-5 sm:px-14 py-8 sm:py-12">
            {draftBanner && (
              <DraftRestoreBanner
                message={t("postEdit.draftFound")}
                restoreLabel={t("postEdit.restoreDraft")}
                discardLabel={t("postEdit.discardDraft")}
                onRestore={handleRestoreDraft}
                onDiscard={handleDiscardDraft}
              />
            )}

            {errorMessage && (
              <div className="bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{errorMessage}</div>
            )}

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("postEdit.titlePlaceholder")}
              className="w-full font-serif text-3xl font-bold text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 border-none outline-none mb-6 bg-transparent"
            />

            <div className="mb-6">
              <CategorySelect
                categories={categories}
                value={categoryId}
                onChange={setCategoryId}
                placeholder={t("postEdit.selectCategory")}
              />
            </div>

            {content !== null && (
              <RichTextEditor key={editorKey} initialContent={content} onChange={setContent} />
            )}

            <div className="mt-6">
              <TagInput tags={tags} onChange={setTags} placeholder={`🏷 ${t("postEdit.tagsPlaceholder")}`} />
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

export default PostEditPage;