import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPost, deletePost } from "../api/posts";
import { useAuth } from "../context/AuthContext";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { codeBlockConfig } from "../lib/editorSchema";
import {
  Sparkles, MessageSquare, BrainCircuit, Calendar, Lock, ChevronRight, Send
} from "lucide-react";
import ResizableRightPanel from "../components/ResizableRightPanel";

function PostDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const { token, user } = useAuth();
  const navigate = useNavigate();

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

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400">불러오는 중...</div>
  );
  if (errorMessage) return (
    <div className="p-8 text-red-500">{errorMessage}</div>
  );
  if (!post) return null;

  return (
    <div className="flex flex-1 min-h-screen">
      {/* 메인 본문 */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {/* 상단 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <button onClick={() => navigate("/")} className="hover:text-blue-600">All Notes</button>
            {post.category_id && (
              <>
                <ChevronRight size={14} className="text-gray-300" />
                <span className="text-gray-700 font-medium">{post.category_id}</span>
              </>
            )}
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
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <MessageSquare size={15} /> Ask StudyBrain AI
            </div>
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          </div>

          <div className="p-4 min-h-32 bg-gray-50">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs shrink-0 font-medium">
                AI
              </div>
              <div className="bg-white rounded-lg px-3 py-2 text-sm text-gray-600 shadow-sm leading-relaxed">
                이 노트를 기반으로 질문에 답변할 준비가 됐어요. 무엇이 궁금하신가요?
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-100">
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="Ask about this topic..."
              className="flex-1 text-sm text-gray-600 focus:outline-none bg-transparent"
            />
            <button className="text-blue-600 hover:text-blue-700">
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