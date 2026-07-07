import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { getPost, deletePost } from "../api/posts";
import { getCategories } from "../api/categories";
import { getConversations, getConversationMessages, sendChatMessage } from "../api/conversations";
import { useAuth } from "../context/AuthContext";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { getCodeBlockConfig } from "../lib/editorSchema";
import {
  Sparkles, MessageSquare, BrainCircuit, Calendar, Lock, ChevronRight, Send,
  History, Plus, Loader2
} from "lucide-react";
import ResizableRightPanel from "../components/ResizableRightPanel";
import SidebarLayout, { SidebarSpacer } from "../components/SidebarLayout";
import { useTheme } from "../context/ThemeContext";

// AI 답변 안의 `코드`와 **굵게** 정도만 최소한으로 렌더링 (줄바꿈은 whitespace-pre-wrap이 처리)
function renderMessageContent(text) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-1 py-0.5 rounded text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

// 카테고리 트리에서 targetId까지의 경로(루트→타겟)를 [{id, name}, ...]로 반환
function findCategoryPath(categories, targetId, trail = []) {
  for (const category of categories) {
    const nextTrail = [...trail, { id: category.id, name: category.name }];
    if (category.id === targetId) return nextTrail;
    if (category.children?.length > 0) {
      const found = findCategoryPath(category.children, targetId, nextTrail);
      if (found) return found;
    }
  }
  return null;
}

function PostDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  // 카테고리 경로(breadcrumb)용
  const [categories, setCategories] = useState([]);

  // 채팅 상태
  const [chatMessages, setChatMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");

  // 이전 대화 목록 드롭다운 상태
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 읽기 전용 BlockNote 에디터
  const editor = useCreateBlockNote({ codeBlock: getCodeBlockConfig(theme) });

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await getPost(id);
        setPost(data);
      } catch (error) {
        setErrorMessage(t("postDetail.loadFailed"));
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories(token);
        setCategories(data);
      } catch (error) {}
    };
    fetchCategories();
  }, [token]);

  // post 로드 후 콘텐츠를 에디터에 주입 (JSON or HTML fallback)
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
      // 기존 TipTap HTML 포스트 fallback
      const blocks = await editor.tryParseHTMLToBlocks(post.content);
      editor.replaceBlocks(editor.document, blocks);
    }
    loadContent();
  }, [editor, post]);

  // 사이드바에서 카테고리를 누르면 노트 목록 페이지로 이동 (다른 페이지들과 동일한 동작)
  const handleSelectCategory = (categoryId) => {
    navigate(categoryId === null ? "/notes" : `/notes?category=${categoryId}`);
  };

  const handleDelete = async () => {
    if (!window.confirm(t("postDetail.confirmDelete"))) return;
    try {
      await deletePost(id, token);
      navigate("/notes");
    } catch (error) {
      setErrorMessage(t("postDetail.deleteFailed"));
    }
  };

  const handleNewConversation = () => {
    setConversationId(null);
    setChatMessages([]);
    setChatError("");
    setShowHistory(false);
  };

  const handleToggleHistory = async () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next) {
      setLoadingHistory(true);
      try {
        const data = await getConversations(token);
        setConversations(data);
      } catch (error) {
        setConversations([]);
      } finally {
        setLoadingHistory(false);
      }
    }
  };

  const handleSelectConversation = async (selectedId) => {
    setShowHistory(false);
    setChatError("");
    try {
      const data = await getConversationMessages(selectedId, token);
      setConversationId(data.conversation_id);
      setChatMessages(data.messages.map((m) => ({ role: m.role, content: m.content })));
    } catch (error) {
      setChatError(t("postDetail.loadHistoryFailed"));
    }
  };

  const handleSend = async () => {
    const question = aiQuestion.trim();
    if (!question || sending) return;

    setChatMessages((prev) => [...prev, { role: "user", content: question }]);
    setAiQuestion("");
    setSending(true);
    setChatError("");

    try {
      const data = await sendChatMessage(question, conversationId, token);
      setConversationId(data.conversation_id);
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch (error) {
      setChatError(t("postDetail.answerFailed"));
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <SidebarLayout selectedCategoryId={null} onSelectCategory={handleSelectCategory}>
      <div className="flex-1 flex items-center justify-center h-full text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-950">{t("common.loading")}</div>
    </SidebarLayout>
  );
  if (errorMessage) return (
    <SidebarLayout selectedCategoryId={null} onSelectCategory={handleSelectCategory}>
      <div className="flex-1 p-8 text-red-500 dark:text-red-400 bg-gray-50 dark:bg-gray-950 h-full">{errorMessage}</div>
    </SidebarLayout>
  );
  if (!post) return null;

  const categoryPath = post.category_id ? findCategoryPath(categories, post.category_id) : null;

  return (
    <SidebarLayout selectedCategoryId={post.category_id ?? null} onSelectCategory={handleSelectCategory}>
      {/* 메인 본문 - Apple Pages처럼 회색 캔버스 위에 흰 "문서 페이지" 카드가
          떠 있는 느낌으로, 글쓰기/수정 페이지와 동일한 레이아웃을 씀 */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-gray-50 dark:bg-gray-950">
        {/* 상단 헤더 */}
        <div className="sticky top-0 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 sm:px-8 py-4 flex items-center justify-between gap-3 z-10">
          <div className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 min-w-0 overflow-x-auto whitespace-nowrap">
            <SidebarSpacer />
            <button onClick={() => navigate("/notes")} className="hover:text-blue-600 dark:hover:text-blue-400 shrink-0">{t("postDetail.allNotes")}</button>
            {categoryPath?.map((cat) => (
              <span key={cat.id} className="flex items-center gap-1.5 shrink-0">
                <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
                <button
                  onClick={() => navigate(`/notes?category=${cat.id}`)}
                  className="hover:text-blue-600 dark:hover:text-blue-400 text-gray-700 dark:text-gray-300 font-medium"
                >
                  {cat.name}
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {user && user.nickname === post.nickname && (
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/posts/${id}/edit`)}
                  className="text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-700"
                >
                  {t("postDetail.edit")}
                </button>
                <button
                  onClick={handleDelete}
                  className="text-sm text-red-400 dark:text-red-400 border border-red-200 dark:border-red-500/40 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  {t("postDetail.delete")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 문서 페이지 - 폭을 문서처럼 제한하고 캔버스 위에 흰 카드로 띄움 */}
        <div className="px-4 sm:px-8 py-10">
          <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-5 sm:px-14 py-8 sm:py-12">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-3 break-words">{post.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-400 dark:text-gray-500 mb-4">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                {new Date(post.created_at).toLocaleDateString(i18n.language === "en" ? "en-US" : "ko-KR", { year: "numeric", month: "long", day: "numeric" })}
              </span>
              <span className="flex items-center gap-1.5">
                <Lock size={13} />
                {t("postDetail.privateNotes")}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mb-8">
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-full">
                  # {tag}
                </span>
              ))}
            </div>
            <hr className="mb-8 border-gray-100 dark:border-gray-700" />
            <BlockNoteView editor={editor} editable={false} theme={theme} />
          </div>
        </div>
      </div>

      {/* 우측 AI 패널 */}
      <ResizableRightPanel
        className="p-5 flex flex-col gap-4 sticky top-0 h-screen"
        minWidth={280}
        maxWidth={480}
        minLeftWidth={480}
        collapsible
        storageKey="postDetailAiPanelCollapsed"
        autoCollapseBreakpoint={1024}
      >

        {/* AI Summary */}
        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4 shrink-0">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm mb-3">
            <Sparkles size={15} /> {t("postDetail.aiSummaryTitle")}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {t("postDetail.aiSummaryPlaceholder")}
          </p>
        </div>

        {/* Ask AI */}
        <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-0">
              <MessageSquare size={15} className="shrink-0" /> <span className="truncate">{t("postDetail.askAiTitle")}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleNewConversation}
                title={t("postDetail.newConversation")}
                className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <Plus size={15} />
              </button>
              <div className="relative">
                <button
                  onClick={handleToggleHistory}
                  title={t("postDetail.history")}
                  className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <History size={15} />
                </button>
                {showHistory && (
                  <div className="absolute right-0 top-6 w-56 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                    {loadingHistory ? (
                      <div className="px-3 py-3 text-xs text-gray-400 dark:text-gray-500 text-center">{t("postDetail.historyLoading")}</div>
                    ) : conversations.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-gray-400 dark:text-gray-500 text-center">{t("postDetail.historyEmpty")}</div>
                    ) : (
                      conversations.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectConversation(c.id)}
                          className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-50 dark:border-gray-700 last:border-0 truncate block"
                        >
                          {c.title}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            </div>
          </div>

          <div className="p-4 flex-1 min-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-900 flex flex-col gap-3">
            {chatMessages.length === 0 && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs shrink-0 font-medium">
                  AI
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-300 shadow-sm leading-relaxed">
                  {t("postDetail.chatWelcome")}
                </div>
              </div>
            )}

            {chatMessages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex items-start gap-2 justify-end">
                  <div className="bg-blue-600 text-white rounded-lg px-3 py-2 text-sm shadow-sm leading-relaxed max-w-[85%] whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs shrink-0 font-medium">
                    AI
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-300 shadow-sm leading-relaxed max-w-[85%] whitespace-pre-wrap break-words">
                    {renderMessageContent(m.content)}
                  </div>
                </div>
              )
            )}

            {sending && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs shrink-0 font-medium">
                  AI
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-400 dark:text-gray-500 shadow-sm leading-relaxed flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> {t("postDetail.answering")}
                </div>
              </div>
            )}

            {chatError && (
              <div className="text-xs text-red-400 dark:text-red-400 px-1">{chatError}</div>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-100 dark:border-gray-700 shrink-0">
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              placeholder={t("postDetail.chatPlaceholder")}
              disabled={sending}
              className="flex-1 text-sm text-gray-600 dark:text-gray-300 focus:outline-none bg-transparent disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={sending || !aiQuestion.trim()}
              className="text-blue-600 hover:text-blue-700 disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </div>
        </div>

        {/* Generate Quiz 버튼 */}
        <button
          onClick={() => navigate("/quiz")}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors shrink-0"
        >
          <BrainCircuit size={16} /> {t("postDetail.generateQuiz")}
        </button>
      </ResizableRightPanel>
    </SidebarLayout>
  );
}

export default PostDetailPage;
