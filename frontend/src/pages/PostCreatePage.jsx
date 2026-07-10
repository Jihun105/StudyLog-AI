import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPost } from "../api/posts";
import { getCategories } from "../api/categories";
import { useAuth } from "../context/AuthContext";
import RichTextEditor from "../components/RichTextEditor";
import TagInput from "../components/TagInput";
import CategorySelect from "../components/CategorySelect";
import DraftRestoreBanner from "../components/DraftRestoreBanner";
import { ChevronRight } from "lucide-react";
import SidebarLayout, { SidebarSpacer } from "../components/SidebarLayout";
import { useDraftAutosave, useBeforeUnloadWarning, loadDraft, clearDraft } from "../hooks/useDraftAutosave";
import { getErrorMessage } from "../utils/errors";

const DRAFT_KEY = "studylog:draft:new";

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
  const [tags, setTags] = useState([]);
  // 노트 목록에서 특정 폴더를 보던 중 글쓰기를 누르면 그 폴더가 쿼리로 전달됨 -> 기본 선택값으로 사용
  // (없으면 "기본"을 의미하는 null)
  const [categoryId, setCategoryId] = useState(() => {
    const categoryParam = searchParams.get("category");
    return categoryParam !== null ? Number(categoryParam) : null;
  });
  const [categories, setCategories] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [draftBanner, setDraftBanner] = useState(null);
  // 임시저장본을 불러올 때 BlockNote 에디터가 새 initialContent로 다시 만들어지도록
  // key를 바꿔서 강제 리마운트시킴 (에디터는 마운트 시점의 initialContent만 사용하므로)
  const [editorKey, setEditorKey] = useState(0);
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

  // 마운트 시 1회, 브라우저에 남아있는 임시저장본이 있는지 확인
  useEffect(() => {
    const draft = loadDraft(DRAFT_KEY);
    if (draft && (draft.title || draft.content)) {
      setDraftBanner(draft);
    }
  }, []);

  const hasContent = Boolean(title || content);
  // 실패로 사라지는 걸 막는 게 목적이므로, 내용이 하나라도 있을 때만 자동 저장/이탈 경고
  useDraftAutosave(DRAFT_KEY, { title, content, tags, categoryId }, hasContent);
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
    clearDraft(DRAFT_KEY);
    setDraftBanner(null);
  };

  // 사이드바에서 카테고리를 누르면 노트 목록 페이지로 이동 (다른 페이지들과 동일한 동작)
  const handleSelectCategory = (id) => {
    navigate(id === null ? "/notes" : `/notes?category=${id}`);
  };

  const handleCreate = async () => {
    if (!title || !content) {
      setErrorMessage(t("postCreate.requiredFields"));
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await createPost(title, content, tags, token, categoryId);
      clearDraft(DRAFT_KEY);
      navigate(`/posts/${data.id}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t("postCreate.createFailed")));
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
            <button onClick={() => navigate("/notes")} className="hover:text-blue-600 dark:hover:text-blue-400">{t("postCreate.allNotes")}</button>
            <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">{t("postCreate.newPost")}</span>
          </div>
          <div className="flex items-center gap-3">
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
              className="text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 px-4 py-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-700"
            >
              {t("postCreate.cancel")}
            </button>
          </div>
        </div>

        {/* 문서 페이지 - 폭을 문서처럼 제한하고 캔버스 위에 흰 카드로 띄움 */}
        <div className="px-4 sm:px-8 py-10">
          <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-5 sm:px-14 py-8 sm:py-12">
            {draftBanner && (
              <DraftRestoreBanner
                message={t("postCreate.draftFound")}
                restoreLabel={t("postCreate.restoreDraft")}
                discardLabel={t("postCreate.discardDraft")}
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
              placeholder={t("postCreate.titlePlaceholder")}
              className="w-full font-serif text-3xl font-bold text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 border-none outline-none mb-6 bg-transparent"
            />

            <div className="mb-6">
              <CategorySelect
                categories={categories}
                value={categoryId}
                onChange={setCategoryId}
                placeholder={t("postCreate.selectCategory")}
              />
            </div>

            <RichTextEditor key={editorKey} initialContent={content} onChange={setContent} />

            <div className="mt-6">
              <TagInput tags={tags} onChange={setTags} placeholder={`🏷 ${t("postCreate.tagsPlaceholder")}`} />
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

export default PostCreatePage;