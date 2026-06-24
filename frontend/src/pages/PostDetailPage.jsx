import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPost, deletePost } from "../api/posts";
import { useAuth } from "../context/AuthContext";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import javascript from "highlight.js/lib/languages/javascript";
import css from "highlight.js/lib/languages/css";
import sql from "highlight.js/lib/languages/sql";
import bash from "highlight.js/lib/languages/bash";

hljs.registerLanguage("python", python);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("css", css);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("bash", bash);

function PostDetailPage() {
  // URL에서 id를 가져옵니다.
  // App.js에서 path="/posts/:id" 로 설정했기 때문에 id로 접근합니다.
  const { id } = useParams();

  // 게시글 데이터 상태
  const [post, setPost] = useState(null);

  // 로딩/에러 상태
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { user, token } = useAuth();
  const navigate = useNavigate();

  // 게시글 상세 데이터를 불러오는 함수
  const fetchPost = async () => {
    setLoading(true);
    try {
      const data = await getPost(id);
      setPost(data);
    } catch (error) {
      setErrorMessage("게시글을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트가 처음 렌더링될 때 게시글을 불러옵니다.
  useEffect(() => {
    fetchPost();
  }, [id]);

  useEffect(() => {
    if (!post) return;
    document.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightElement(block);
    });
  }, [post]);

  // 삭제 버튼 클릭 시 실행되는 함수
  const handleDelete = async () => {
    // 삭제 전 확인 창을 띄웁니다.
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    try {
      await deletePost(id, token);
      // 삭제 성공 시 홈으로 이동
      navigate("/");
    } catch (error) {
      setErrorMessage("삭제에 실패했습니다.");
    }
  };

  // 로딩 중일 때
  if (loading) {
    return (
      <div className="text-center text-gray-500 py-12">불러오는 중...</div>
    );
  }

  // 에러 발생 시
  if (errorMessage) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 text-red-500 px-4 py-3 rounded">
          {errorMessage}
        </div>
      </div>
    );
  }

  // 데이터가 없을 때 (아직 로딩 전)
  if (!post) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 게시글 헤더 */}
      <div className="bg-white rounded-lg shadow p-8 mb-4">
        {/* 제목 */}
        <h1 className="text-3xl font-bold text-gray-800 mb-4">{post.title}</h1>

        {/* 작성자 / 날짜 */}
        <div className="flex justify-between text-sm text-gray-400 mb-4">
          <span>{post.nickname}</span>
          <span>{new Date(post.created_at).toLocaleDateString("ko-KR")}</span>
        </div>

        {/* 태그 목록 */}
        <div className="flex flex-wrap gap-2 mb-6">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* 구분선 */}
        <hr className="mb-6" />

        {/* 본문 */}
        {/* whitespace-pre-wrap: 줄바꿈과 공백을 그대로 표시합니다. */}
        <div
  className="prose max-w-none text-gray-700 leading-relaxed"
  dangerouslySetInnerHTML={{ __html: post.content }}
/>
      </div>

      {/* 버튼 영역 */}
      <div className="flex justify-between">
        {/* 목록으로 버튼 */}
        <button
          onClick={() => navigate("/")}
          className="text-gray-500 hover:text-gray-700"
        >
          ← 목록으로
        </button>

        {/* 본인 글일 때만 수정/삭제 버튼 표시 */}
        {/* user?.nickname === post.nickname 으로 본인 글 여부 확인 */}
        {user && user.nickname === post.nickname && (
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/posts/${id}/edit`)}
              className="bg-gray-100 text-gray-600 px-4 py-2 rounded hover:bg-gray-200"
            >
              수정
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              삭제
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PostDetailPage;