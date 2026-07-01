import { useState, useEffect } from "react";
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
  BrainCircuit, CheckCircle2, XCircle, Loader2, RotateCcw, FileText, ArrowLeft, ExternalLink
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import ResizableRightPanel from "../components/ResizableRightPanel";

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
  { value: "multiple_choice", label: "객관식" },
  { value: "ox", label: "OX" },
  { value: "blank", label: "빈칸" },
];

// Sidebar의 selectedCategoryId 규칙(null=전체, -1=미분류, 그 외=id)을
// 퀴즈 생성용 scope 값("all" | "uncategorized" | "숫자문자열")으로 변환
function categoryIdToScope(categoryId) {
  if (categoryId === null) return "all";
  if (categoryId === -1) return "uncategorized";
  return String(categoryId);
}

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
      <BlockNoteView editor={editor} editable={false} theme="light" />
    </div>
  );
}

function QuizPage() {
  const { token } = useAuth();
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

  const scopeToCategoryId = () => {
    if (scope === "all") return null;
    if (scope === "uncategorized") return 0;
    return Number(scope);
  };

  // Sidebar에서 폴더 클릭 -> 우측 패널 갱신 + 퀴즈 생성 범위 드롭다운도 같이 맞춤
  const handleSelectCategory = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setScope(categoryIdToScope(categoryId));
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
      const data = await generateQuiz(scopeToCategoryId(), quizType, token);
      setQuizzes(data);
    } catch (err) {
      setError(err.response?.data?.detail || "퀴즈 생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectOption = (quizId, option) => {
    if (results[quizId]) return; // 이미 채점된 문제는 수정 불가
    setSelectedAnswers((prev) => ({ ...prev, [quizId]: option }));
  };

  const handleBlankInputChange = (quizId, value) => {
    if (results[quizId]) return;
    setSelectedAnswers((prev) => ({ ...prev, [quizId]: value }));
  };

  const handleSubmit = async (quizId) => {
    const answer = selectedAnswers[quizId];
    if (!answer) return;
    setSubmittingId(quizId);
    try {
      const result = await submitQuizAttempt(quizId, answer, token);
      setResults((prev) => ({ ...prev, [quizId]: result }));
    } catch (err) {
      setError("채점에 실패했습니다.");
    } finally {
      setSubmittingId(null);
    }
  };

  const answeredCount = Object.keys(results).length;
  const correctCount = Object.values(results).filter((r) => r.is_correct).length;
  const categoryOptions = flattenCategories(categories);

  const panelTitle =
    selectedCategoryId === null ? "전체 노트"
    : selectedCategoryId === -1 ? "기본 (미분류)"
    : findCategoryName(categories, selectedCategoryId) || "카테고리";

  return (
    <>
      <Sidebar selectedCategoryId={selectedCategoryId} onSelectCategory={handleSelectCategory} />
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <BrainCircuit size={20} className="text-blue-600" /> AI Quiz
          </div>
        </div>

        <div className="px-8 py-8 max-w-3xl">
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">범위와 문제 유형을 선택하고 퀴즈를 생성하세요.</p>

            <div className="flex items-center gap-1 mb-3">
              {QUIZ_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setQuizType(t.value)}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                    quizType === t.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={scope}
                onChange={(e) => handleScopeChange(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">전체 노트</option>
                <option value="uncategorized">기본 (미분류)</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
                {generating ? "생성 중..." : "퀴즈 생성"}
              </button>
              {quizzes.length > 0 && (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600"
                >
                  <RotateCcw size={13} /> 다시 만들기
                </button>
              )}
            </div>
            {error && <div className="text-sm text-red-500 mt-3">{error}</div>}
          </div>

          {quizzes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex items-center justify-between">
              <span className="text-sm text-gray-500">진행 상황</span>
              <span className="text-sm font-semibold text-gray-800">
                {answeredCount} / {quizzes.length} 완료
                {answeredCount > 0 && <span className="text-blue-600"> · {correctCount}개 정답</span>}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {quizzes.map((quiz, i) => {
              const result = results[quiz.id];
              const selected = selectedAnswers[quiz.id];
              const isBlank = quiz.quiz_type === "blank";

              return (
                <div key={quiz.id} className="bg-white rounded-xl border border-gray-100 p-6">
                  <p className="text-xs text-gray-400 mb-2">문제 {i + 1}</p>
                  <p className="text-base font-medium text-gray-800 mb-2">{quiz.question}</p>

                  {quiz.source_title && (
                    <button
                      onClick={() => quiz.source_post_id && handleViewPost(quiz.source_post_id)}
                      disabled={!quiz.source_post_id}
                      title={quiz.source_post_id ? "우측 패널에서 원문 보기" : "원문 글을 특정하지 못했습니다"}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 disabled:hover:text-gray-400 disabled:cursor-default mb-4"
                    >
                      <FileText size={12} /> 출처: {quiz.source_title}
                    </button>
                  )}

                  {isBlank ? (
                    <input
                      type="text"
                      value={selected || ""}
                      onChange={(e) => handleBlankInputChange(quiz.id, e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(quiz.id); }}
                      disabled={!!result}
                      placeholder="정답을 입력하세요"
                      className={`w-full text-sm border rounded-lg px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 ${
                        result ? (result.is_correct ? "border-green-400 bg-green-50" : "border-red-300 bg-red-50") : "border-gray-200"
                      }`}
                    />
                  ) : (
                    <div className="flex flex-col gap-2 mb-4">
                      {quiz.options.map((option) => {
                        const isSelected = selected === option;
                        const isCorrectOption = result && option === result.correct_answer;
                        const isWrongSelected = result && isSelected && !result.is_correct;

                        let optionClass = "border-gray-200 hover:border-blue-300";
                        if (result) {
                          if (isCorrectOption) optionClass = "border-green-400 bg-green-50";
                          else if (isWrongSelected) optionClass = "border-red-300 bg-red-50";
                        } else if (isSelected) {
                          optionClass = "border-blue-500 bg-blue-50";
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
                  )}

                  {!result ? (
                    <button
                      onClick={() => handleSubmit(quiz.id)}
                      disabled={!selected || submittingId === quiz.id}
                      className="text-sm bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 disabled:opacity-40"
                    >
                      {submittingId === quiz.id ? "채점 중..." : "제출"}
                    </button>
                  ) : (
                    <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2.5 ${result.is_correct ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      {result.is_correct ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <XCircle size={16} className="shrink-0 mt-0.5" />}
                      <div>
                        <p className="font-medium">{result.is_correct ? "정답입니다!" : `오답입니다. 정답: ${result.correct_answer}`}</p>
                        {result.explanation && <p className="text-xs mt-1 opacity-80 whitespace-pre-wrap">{result.explanation}</p>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {quizzes.length === 0 && !generating && (
            <div className="text-center text-gray-400 py-16">
              <BrainCircuit size={48} className="mx-auto mb-4 text-gray-300" />
              <div>유형과 범위를 고르고 퀴즈 생성 버튼을 눌러보세요.</div>
            </div>
          )}
        </div>
      </div>

      {/* 우측 패널: 선택된 폴더의 글 목록 미리보기 / 글 하나 상세 (페이지 이동 없이 그대로) */}
      <ResizableRightPanel className="p-5 flex flex-col gap-3 sticky top-0 h-screen" defaultWidth={420} maxWidth={800}>
        {viewingPost ? (
          <>
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={handleBackToList}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600"
              >
                <ArrowLeft size={13} /> 목록으로
              </button>
              <button
                onClick={() => window.open(`/posts/${viewingPost.id}`, "_blank")}
                title="새 탭에서 전체 화면으로 보기"
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600"
              >
                <ExternalLink size={13} /> 전체 화면
              </button>
            </div>
            <h3 className="text-base font-semibold text-gray-800 mb-2 line-clamp-2">{viewingPost.title}</h3>
            <div className="flex-1 min-w-0 overflow-y-auto overflow-x-auto border-t border-gray-100 pt-3">
              <NotePreview post={viewingPost} />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
              <FileText size={15} /> {panelTitle}
            </div>

            {(panelLoading || viewingPostLoading) && (
              <div className="text-sm text-gray-400 py-8 text-center">불러오는 중...</div>
            )}

            {!panelLoading && panelPosts.length === 0 && (
              <div className="text-sm text-gray-400 py-8 text-center">이 폴더에 작성된 글이 없습니다.</div>
            )}

            <div className="flex flex-col gap-2 overflow-y-auto">
              {panelPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => handleViewPost(post.id)}
                  className="bg-white rounded-lg border border-gray-100 p-3 cursor-pointer hover:border-blue-200 hover:shadow-sm transition-all"
                >
                  <h4 className="text-sm font-medium text-gray-800 mb-1 line-clamp-1">{post.title}</h4>
                  <p className="text-xs text-gray-400 line-clamp-2">{post.preview}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </ResizableRightPanel>
    </>
  );
}

export default QuizPage;
