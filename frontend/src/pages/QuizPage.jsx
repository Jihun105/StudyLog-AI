import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCategories } from "../api/categories";
import { getPosts, getPost } from "../api/posts";
import { generateQuiz, submitQuizAttempt } from "../api/quizzes";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { codeBlockConfig } from "../lib/editorSchema";
import {
  BrainCircuit, CheckCircle2, XCircle, Loader2, RotateCcw, FileText, ArrowLeft, ExternalLink, Search, X
} from "lucide-react";
import SidebarLayout, { SidebarSpacer } from "../components/SidebarLayout";
import ResizableRightPanel from "../components/ResizableRightPanel";
import { useTheme } from "../context/ThemeContext";

const MAX_SELECTED_FILES = 5; // 직접 선택할 수 있는 노트 최대 개수 (백엔드 MAX_SOURCE_NOTES와 동일)

// 카테고리 트리를 <select> 옵션 목록으로 평탄화 (깊이만큼 들여쓰기)
function flattenCategories(categories, depth = 0) {
  let options = [];
  for (const category of categories) {
    options.push({ id: category.id, label: `${"　".repeat(depth)}${category.name}` });
    if (category.children?.length > 0) {
      options = options.concat(flattenCategories(category.children, depth + 1));
    }
  }
  return options;
}

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

const QUIZ_TYPES = [
  { value: "multiple_choice", labelKey: "quiz.typeMultipleChoice" },
  { value: "ox", labelKey: "quiz.typeOx" },
];

// scope 값을 다시 Sidebar의 selectedCategoryId 규칙으로 변환
function scopeToSelectedCategoryId(scope) {
  if (scope === "all") return null;
  if (scope === "uncategorized") return -1;
  return Number(scope);
}

// 우측 패널에서 노트 내용을 읽기 전용으로 보여주는 하위 컴포넌트
// (BlockNote 에디터 훅은 조건부로 뗐다 붙였다 할 수 없어서 별도 컴포넌트로 분리)
function NotePreview({ post }) {
  const editor = useCreateBlockNote({ codeBlock: codeBlockConfig });
  const { theme } = useTheme();

  useEffect(() => {
    if (!editor || !post?.content) return;
    async function loadContent() {
      try {
        const parsed = JSON.parse(post.content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          editor.replaceBlocks(editor.document, parsed);
          return;
        }
      } catch {}
      const blocks = await editor.tryParseHTMLToBlocks(post.content);
      editor.replaceBlocks(editor.document, blocks);
    }
    loadContent();
  }, [editor, post]);

  return (
    <div className="text-sm min-w-0 max-w-full quiz-note-preview">
      {/* BlockNote 기본 스타일은 좌우 54px 고정 패딩(padding-inline)이 있어서
          좁은 사이드 패널에서는 그것만으로 실사용 폭이 크게 줄어듦(코드블록이 계속 잘려 보이는 원인).
          이 패널에서만 패딩을 줄여서 실사용 폭을 넓힘. */}
      <style>{`
        .quiz-note-preview .bn-editor {
          padding-inline: 8px !important;
        }
        .quiz-note-preview .bn-block-content[data-content-type="codeBlock"] > pre {
          padding: 12px !important;
        }
      `}</style>
      <BlockNoteView editor={editor} editable={false} theme={theme} />
    </div>
  );
}

function QuizPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [scope, setScope] = useState("all"); // "all" | "uncategorized" | 카테고리 id(문자열)
  const [selectedCategoryId, setSelectedCategoryId] = useState(null); // Sidebar 표시/우측 패널용
  const [quizType, setQuizType] = useState("multiple_choice");

  const [quizzes, setQuizzes] = useState([]);
  const [results, setResults] = useState({}); // quizId -> { is_correct, correct_answer, explanation }
  const [selectedAnswers, setSelectedAnswers] = useState({}); // quizId -> 선택/입력한 답
  const [submittingId, setSubmittingId] = useState(null);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // 카테고리 대신 글을 직접 검색해서 골라 퀴즈 범위를 지정하는 기능
  const [fileQuery, setFileQuery] = useState("");
  const [fileSearchResults, setFileSearchResults] = useState([]);
  const [fileSearchLoading, setFileSearchLoading] = useState(false);
  const [fileDropdownOpen, setFileDropdownOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]); // [{id, title}, ...]

  // 우측 패널: 선택된 폴더의 글 목록 / 특정 글 미리보기
  const [panelPosts, setPanelPosts] = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [viewingPost, setViewingPost] = useState(null);
  const [viewingPostLoading, setViewingPostLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories(token);
        setCategories(data);
      } catch (error) {}
    };
    fetchCategories();
  }, [token]);

  useEffect(() => {
    const fetchPanelPosts = async () => {
      setPanelLoading(true);
      setViewingPost(null); // 폴더를 바꾸면 보고 있던 글 미리보기는 닫고 목록으로
      try {
        const categoryParam =
          selectedCategoryId === null ? null
          : selectedCategoryId === -1 ? 0
          : selectedCategoryId;
        const data = await getPosts(1, 50, null, null, token, categoryParam);
        setPanelPosts(data.posts);
      } catch (error) {
        setPanelPosts([]);
      } finally {
        setPanelLoading(false);
      }
    };
    fetchPanelPosts();
  }, [selectedCategoryId, token]);

  // 파일 검색어 입력 300ms 후 검색 (이미 선택된 글은 결과에서 제외)
  useEffect(() => {
    if (!fileQuery.trim()) {
      setFileSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setFileSearchLoading(true);
      try {
        const data = await getPosts(1, 8, fileQuery, null, token, null, true);
        const selectedIds = new Set(selectedFiles.map((f) => f.id));
        setFileSearchResults(data.posts.filter((p) => !selectedIds.has(p.id)));
      } catch (error) {
        setFileSearchResults([]);
      } finally {
        setFileSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [fileQuery, token, selectedFiles]);

  const handleSelectFile = (post) => {
    setSelectedFiles((prev) => {
      if (prev.some((f) => f.id === post.id)) return prev;
      if (prev.length >= MAX_SELECTED_FILES) return prev; // 최대 개수 도달 시 더 추가하지 않음
      return [...prev, { id: post.id, title: post.title }];
    });
    setFileQuery("");
    setFileDropdownOpen(false);
  };

  const handleRemoveFile = (postId) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== postId));
  };

  const scopeToCategoryId = () => {
    if (scope === "all") return null;
    if (scope === "uncategorized") return 0;
    return Number(scope);
  };

  // Sidebar에서 폴더 클릭 -> 다른 페이지와 동일하게 노트 목록 페이지로 바로 이동
  // (우측 패널/퀴즈 범위와 폴더를 동기화하고 싶으면 아래 "퀴즈 생성 범위" 드롭다운을 사용)
  const handleSelectCategory = (categoryId) => {
    navigate(categoryId === null ? "/notes" : `/notes?category=${categoryId}`);
  };

  // 드롭다운에서 범위 변경 -> Sidebar 표시/우측 패널도 같이 맞춤
  const handleScopeChange = (value) => {
    setScope(value);
    setSelectedCategoryId(scopeToSelectedCategoryId(value));
  };

  // 우측 패널에서 글 클릭 -> 페이지 이동 없이 패널 안에서 내용 표시 (퀴즈 진행 상태 유지)
  const handleViewPost = async (postId) => {
    setViewingPostLoading(true);
    try {
      const data = await getPost(postId);
      setViewingPost(data);
    } catch (error) {
      setViewingPost(null);
    } finally {
      setViewingPostLoading(false);
    }
  };

  const handleBackToList = () => setViewingPost(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    setQuizzes([]);
    setResults({});
    setSelectedAnswers({});
    try {
      const postIds = selectedFiles.length > 0 ? selectedFiles.map((f) => f.id) : null;
      const data = await generateQuiz(postIds ? null : scopeToCategoryId(), quizType, token, postIds);
      setQuizzes(data);
    } catch (err) {
      setError(err.response?.data?.detail || t("quiz.generateError"));
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectOption = (quizId, option) => {
    if (results[quizId]) return; // 이미 채점된 문제는 수정 불가
    setSelectedAnswers((prev) => ({ ...prev, [quizId]: option }));
  };

  const handleSubmit = async (quizId) => {
    const answer = selectedAnswers[quizId];
    if (!answer) return;
    setSubmittingId(quizId);
    try {
      const result = await submitQuizAttempt(quizId, answer, token);
      setResults((prev) => ({ ...prev, [quizId]: result }));
    } catch (err) {
      setError(t("quiz.gradeError"));
    } finally {
      setSubmittingId(null);
    }
  };

  const answeredCount = Object.keys(results).length;
  const correctCount = Object.values(results).filter((r) => r.is_correct).length;
  const categoryOptions = flattenCategories(categories);

  const panelTitle =
    selectedCategoryId === null ? t("quiz.scopeAll")
    : selectedCategoryId === -1 ? t("quiz.scopeUncategorized")
    : findCategoryName(categories, selectedCategoryId) || t("notes.categoryPrefix");

  return (
    <SidebarLayout selectedCategoryId={selectedCategoryId} onSelectCategory={handleSelectCategory}>
      <div className="flex-1 min-w-[480px] overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-8 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-gray-100">
            <SidebarSpacer />
            <BrainCircuit size={20} className="text-blue-600 dark:text-blue-400" /> {t("quiz.title")}
          </div>
        </div>

        <div className="px-8 py-8 max-w-3xl">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 mb-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t("quiz.instructions")}</p>

            <div className="flex items-center gap-1 mb-3">
              {QUIZ_TYPES.map((qt) => (
                <button
                  key={qt.value}
                  onClick={() => setQuizType(qt.value)}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                    quizType === qt.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
                  }`}
                >
                  {t(qt.labelKey)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={scope}
                onChange={(e) => handleScopeChange(e.target.value)}
                disabled={selectedFiles.length > 0}
                title={selectedFiles.length > 0 ? t("quiz.scopeDisabledByFiles") : undefined}
                className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-100 disabled:opacity-50"
              >
                <option value="all">{t("quiz.scopeAll")}</option>
                <option value="uncategorized">{t("quiz.scopeUncategorized")}</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>

              <div className="relative">
                <div
                  className={`flex items-center gap-1.5 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500 ${
                    selectedFiles.length >= MAX_SELECTED_FILES ? "opacity-50" : ""
                  }`}
                  title={selectedFiles.length >= MAX_SELECTED_FILES ? t("quiz.fileSearchMaxReached", { max: MAX_SELECTED_FILES }) : undefined}
                >
                  <Search size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />
                  <input
                    type="text"
                    value={fileQuery}
                    onChange={(e) => { setFileQuery(e.target.value); setFileDropdownOpen(true); }}
                    onFocus={() => setFileDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setFileDropdownOpen(false), 150)}
                    placeholder={
                      selectedFiles.length >= MAX_SELECTED_FILES
                        ? t("quiz.fileSearchMaxReached", { max: MAX_SELECTED_FILES })
                        : t("quiz.fileSearchPlaceholder")
                    }
                    disabled={selectedFiles.length >= MAX_SELECTED_FILES}
                    className="text-sm w-48 focus:outline-none bg-transparent dark:text-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                {fileDropdownOpen && fileQuery.trim() && selectedFiles.length < MAX_SELECTED_FILES && (
                  <div className="absolute z-20 top-full left-0 mt-1 w-72 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg">
                    {fileSearchLoading && (
                      <div className="text-sm text-gray-400 dark:text-gray-500 px-3 py-2.5">{t("common.loading")}</div>
                    )}
                    {!fileSearchLoading && fileSearchResults.length === 0 && (
                      <div className="text-sm text-gray-400 dark:text-gray-500 px-3 py-2.5">{t("quiz.fileSearchEmpty")}</div>
                    )}
                    {!fileSearchLoading && fileSearchResults.map((post) => (
                      <button
                        key={post.id}
                        onMouseDown={() => handleSelectFile(post)}
                        className="w-full text-left text-sm px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 line-clamp-1"
                      >
                        {post.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
                {generating ? t("quiz.generating") : t("quiz.generate")}
              </button>
              {quizzes.length > 0 && (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <RotateCcw size={13} /> {t("quiz.regenerate")}
                </button>
              )}
            </div>

            {selectedFiles.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mt-3">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {t("quiz.selectedFiles")} ({selectedFiles.length}/{MAX_SELECTED_FILES})
                </span>
                {selectedFiles.map((file) => (
                  <span
                    key={file.id}
                    className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 pl-2.5 pr-1.5 py-1 rounded-full"
                  >
                    <span className="line-clamp-1 max-w-[10rem]">{file.title}</span>
                    <button onClick={() => handleRemoveFile(file.id)} className="hover:text-blue-900 dark:hover:text-blue-200">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {error && <div className="text-sm text-red-500 dark:text-red-400 mt-3">{error}</div>}
          </div>

          {quizzes.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 mb-6 flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t("quiz.progress")}</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {answeredCount} / {quizzes.length} {t("quiz.completed")}
                {answeredCount > 0 && <span className="text-blue-600 dark:text-blue-400"> · {correctCount}{t("quiz.correctCount")}</span>}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {quizzes.map((quiz, i) => {
              const result = results[quiz.id];
              const selected = selectedAnswers[quiz.id];

              return (
                <div key={quiz.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{t("quiz.question")} {i + 1}</p>
                  <p className="text-base font-medium text-gray-800 dark:text-gray-100 mb-2">{quiz.question}</p>

                  {quiz.source_title && (
                    <button
                      onClick={() => quiz.source_post_id && handleViewPost(quiz.source_post_id)}
                      disabled={!quiz.source_post_id}
                      title={quiz.source_post_id ? t("quiz.viewSourceInPanel") : t("quiz.sourceUnknown")}
                      className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:hover:text-gray-400 dark:disabled:hover:text-gray-500 disabled:cursor-default mb-4"
                    >
                      <FileText size={12} /> {t("quiz.source")}: {quiz.source_title}
                    </button>
                  )}

                  <div className="flex flex-col gap-2 mb-4">
                    {quiz.options.map((option) => {
                      const isSelected = selected === option;
                      const isCorrectOption = result && option === result.correct_answer;
                      const isWrongSelected = result && isSelected && !result.is_correct;

                      let optionClass = "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 dark:text-gray-200";
                      if (result) {
                        if (isCorrectOption) optionClass = "border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-500/10 dark:text-gray-100";
                        else if (isWrongSelected) optionClass = "border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-500/10 dark:text-gray-100";
                      } else if (isSelected) {
                        optionClass = "border-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:text-gray-100";
                      }

                      return (
                        <button
                          key={option}
                          onClick={() => handleSelectOption(quiz.id, option)}
                          disabled={!!result}
                          className={`text-left text-sm px-4 py-2.5 rounded-lg border transition-colors ${optionClass}`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  {!result ? (
                    <button
                      onClick={() => handleSubmit(quiz.id)}
                      disabled={!selected || submittingId === quiz.id}
                      className="text-sm bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 disabled:opacity-40"
                    >
                      {submittingId === quiz.id ? t("quiz.grading") : t("quiz.submit")}
                    </button>
                  ) : (
                    <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2.5 ${result.is_correct ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"}`}>
                      {result.is_correct ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <XCircle size={16} className="shrink-0 mt-0.5" />}
                      <div>
                        <p className="font-medium">{result.is_correct ? t("quiz.correct") : t("quiz.incorrect", { answer: result.correct_answer })}</p>
                        {result.explanation && <p className="text-xs mt-1 opacity-80 whitespace-pre-wrap">{result.explanation}</p>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {quizzes.length === 0 && !generating && (
            <div className="text-center text-gray-400 dark:text-gray-500 py-16">
              <BrainCircuit size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <div>{t("quiz.emptyState")}</div>
            </div>
          )}
        </div>
      </div>

      {/* 우측 패널: 선택된 폴더의 글 목록 미리보기 / 글 하나 상세 (페이지 이동 없이 그대로) */}
      <ResizableRightPanel className="p-5 flex flex-col gap-3 sticky top-0 h-screen" defaultWidth={420} maxWidth={800} minLeftWidth={480}>
        {viewingPost ? (
          <>
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={handleBackToList}
                className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <ArrowLeft size={13} /> {t("quiz.backToList")}
              </button>
              <button
                onClick={() => window.open(`/posts/${viewingPost.id}`, "_blank")}
                title={t("quiz.fullScreen")}
                className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <ExternalLink size={13} /> {t("quiz.fullScreen")}
              </button>
            </div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2 line-clamp-2">{viewingPost.title}</h3>
            <div className="flex-1 min-w-0 overflow-y-auto overflow-x-auto border-t border-gray-100 dark:border-gray-700 pt-3">
              <NotePreview post={viewingPost} />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              <FileText size={15} /> {panelTitle}
            </div>

            {(panelLoading || viewingPostLoading) && (
              <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">{t("common.loading")}</div>
            )}

            {!panelLoading && panelPosts.length === 0 && (
              <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">{t("quiz.folderEmpty")}</div>
            )}

            <div className="flex flex-col gap-2 overflow-y-auto">
              {panelPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => handleViewPost(post.id)}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-3 cursor-pointer hover:border-blue-200 dark:hover:border-blue-500/40 hover:shadow-sm transition-all"
                >
                  <h4 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-1 line-clamp-1">{post.title}</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2">{post.preview}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </ResizableRightPanel>
    </SidebarLayout>
  );
}

export default QuizPage;
