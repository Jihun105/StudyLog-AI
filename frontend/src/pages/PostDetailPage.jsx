import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPost, deletePost } from "../api/posts";
import { getCategories } from "../api/categories";
import { getConversations, getConversationMessages, sendChatMessage } from "../api/conversations";
import { useAuth } from "../context/AuthContext";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { codeBlockConfig } from "../lib/editorSchema";
import {
  Sparkles, MessageSquare, BrainCircuit, Calendar, Lock, ChevronRight, Send,
  History, Plus, Loader2
} from "lucide-react";
import ResizableRightPanel from "../components/ResizableRightPanel";

// AI 답변 안의 `코드`와 **굵게** 정도만 최소한으로 렌더링 (줄바꿈은 whitespace-pre-wrap이 처리)
function renderMessageContent(text) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="bg-gray-100 text-gray-700 px-1 py-0.5 rounded text-xs font-mono">
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
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const { token, user } = useAuth();
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
  const editor = useCreateBlockNote({ codeBlock: codeBlockConfig });

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await getPost(id);
        setPost(data);
      } catch (error) {
        setErrorMessage("게시글을 불러오는데 실패했습니다.");
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

  const handleDelete = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deletePost(id, token);
      navigate("/");
    } catch (error) {
      setErrorMessage("삭제에 실패했습니다.");
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
      setChatError("대화를 불러오지 못했습니다.");
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
      setChatError("답변을 가져오지 못했습니다.");
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400">불러오는 중...</div>
  );
  if (errorMessage) return (
    <div className="p-8 text-red-500">{errorMessage}</div>
  );
  if (!post) return null;

  const categoryPath = post.category_id ? findCategoryPath(categories, post.category_id) : null;

  return (
    <div className="flex flex-1 min-h-screen">
      {/* 메인 본문 */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {/* 상단 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <button onClick={() => navigate("/")} className="hover:text-blue-600">All Notes</button>
            {categoryPath?.map((cat) => (
              <span key={cat.id} className="flex items-center gap-1.5">
                <ChevronRight size={14} className="text-gray-300" />
                <button
                  onClick={() => navigate(`/?category=${cat.id}`)}
                  className="hover:text-blue-600 text-gray-700 font-medium"
                >
                  {cat.name}
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-green-50 text-green-600 text-xs font-medium px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              AI Status: Online
            </div>
            {user && user.nickname === post.nickname && (
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/posts/${id}/edit`)}
                  className="text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                >
                  수정
                </button>
                <button
                  onClick={handleDelete}
                  className="text-sm text-red-400 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50"
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 본문 */}
        <div className="px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">{post.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
            <span className="flex items-center gap-1.5">
              <Calendar size={13} />
              {new Date(post.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
            </span>
            <span className="flex items-center gap-1.5">
              <Lock size={13} />
              Private Notes
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                # {tag}
              </span>
            ))}
          </div>
          <hr className="mb-8 border-gray-100" />
          <BlockNoteView editor={editor} editable={false} theme="light" />
        </div>
      </div>

      {/* 우측 AI 패널 */}
      <ResizableRightPanel className="p-5 flex flex-col gap-4 sticky top-0 h-screen">

        {/* AI Summary */}
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm mb-3">
            <Sparkles size={15} /> AI Summary
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            AI 요약 기능은 곧 추가될 예정입니다.
          </p>
        </div>

        {/* Ask AI */}
        <div className="border border-gray-100 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <MessageSquare size={15} /> Ask StudyBrain AI
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewConversation}
                title="새 대화 시작"
                className="text-gray-400 hover:text-blue-600"
              >
                <Plus size={15} />
              </button>
              <div className="relative">
                <button
                  onClick={handleToggleHistory}
                  title="이전 대화"
                  className="text-gray-400 hover:text-blue-600"
                >
                  <History size={15} />
                </button>
                {showHistory && (
                  <div className="absolute right-0 top-6 w-56 bg-white border border-gray-100 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                    {loadingHistory ? (
                      <div className="px-3 py-3 text-xs text-gray-400 text-center">불러오는 중...</div>
                    ) : conversations.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-gray-400 text-center">이전 대화가 없습니다.</div>
                    ) : (
                      conversations.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectConversation(c.id)}
                          className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 border-b border-gray-50 last:border-0 truncate block"
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

          <div className="p-4 min-h-32 max-h-80 overflow-y-auto bg-gray-50 flex flex-col gap-3">
            {chatMessages.length === 0 && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs shrink-0 font-medium">
                  AI
                </div>
                <div className="bg-white rounded-lg px-3 py-2 text-sm text-gray-600 shadow-sm leading-relaxed">
                  이 노트를 기반으로 질문에 답변할 준비가 됐어요. 무엇이 궁금하신가요?
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
                  <div className="bg-white rounded-lg px-3 py-2 text-sm text-gray-600 shadow-sm leading-relaxed max-w-[85%] whitespace-pre-wrap break-words">
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
                <div className="bg-white rounded-lg px-3 py-2 text-sm text-gray-400 shadow-sm leading-relaxed flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> 답변 작성 중...
                </div>
              </div>
            )}

            {chatError && (
              <div className="text-xs text-red-400 px-1">{chatError}</div>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-100">
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              placeholder="Ask about this topic..."
              disabled={sending}
              className="flex-1 text-sm text-gray-600 focus:outline-none bg-transparent disabled:opacity-50"
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
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors mt-auto"
        >
          <BrainCircuit size={16} /> Generate Quiz from Notes
        </button>
      </ResizableRightPanel>
    </div>
  );
}

export default PostDetailPage;
