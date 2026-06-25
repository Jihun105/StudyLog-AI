import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPost, updatePost } from "../api/posts";
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

function PostEditPage() {
  const { id } = useParams();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(null); // null = 로드 전
  const [tagInput, setTagInput] = useState("");
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
        setTagInput(postData.tags.join(", "));
        setCategoryId(postData.category_id != null ? Number(postData.category_id) : null);
        setCategories(flattenCategories(categoryData));
      } catch (error) {
        setErrorMessage("데이터를 불러오는데 실패했습니다.");
      }
    };
    fetchData();
  }, [id]);

  const handleUpdate = async () => {
    if (!title || !content) {
      setErrorMessage("제목과 내용을 입력해주세요.");
      return;
    }
    const tags = tagInput.split(",").map((tag) => tag.trim()).filter((tag) => tag);
    setLoading(true);
    setErrorMessage("");
    try {
      await updatePost(id, title, content, tags, token, categoryId);
      navigate(`/posts/${id}`);
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || "게시글 수정에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full">
      {/* 메인 작성 영역 */}
      <div className="flex-1 overflow-y-auto">
        {/* 상단 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <button onClick={() => navigate("/")} className="hover:text-blue-600">All Notes</button>
            <ChevronRight size={14} className="text-gray-300" />
            <button onClick={() => navigate(`/posts/${id}`)} className="hover:text-blue-600 truncate max-w-32">
              {title || "게시글"}
            </button>
            <ChevronRight size={14} className="text-gray-300" />
            <span className="text-gray-700 font-medium">Edit</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-green-50 text-green-600 text-xs font-medium px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              AI Status: Online
            </div>
            <button
              onClick={handleUpdate}
              disabled={loading}
              className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
                loading ? "bg-blue-300 text-white cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {loading ? "저장 중..." : "Save Post"}
            </button>
            <button
              onClick={() => navigate(`/posts/${id}`)}
              className="text-sm text-gray-500 border border-gray-200 px-4 py-1.5 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* 수정 폼 */}
        <div className="px-8 py-8 max-w-4xl">
          {errorMessage && (
            <div className="bg-red-50 text-red-500 px-4 py-3 rounded-lg mb-4 text-sm">{errorMessage}</div>
          )}

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post Title"
            className="w-full text-3xl font-bold text-gray-800 placeholder-gray-300 border-none outline-none mb-6 bg-transparent"
          />

          <div className="flex items-center gap-3 mb-6">
            <select
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
              className="text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">📁 Select Category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {"　".repeat(cat.depth)}📁 {cat.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="🏷 Add tags (comma separated)"
              className="flex-1 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {content !== null && (
            <RichTextEditor initialContent={content} onChange={setContent} />
          )}
        </div>
      </div>

      {/* 우측 AI 패널 */}
      <ResizableRightPanel className="p-5 flex flex-col gap-4">
        <div className="border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <Lightbulb size={15} className="text-yellow-500" /> AI Context
          </div>
          <p className="text-xs text-gray-400 italic">
            AI 기능 추가 후 수정 가이드를 제공할 예정입니다.
          </p>
        </div>

        <div className="border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <FileText size={15} className="text-blue-500" /> Related Notes
          </div>
          <p className="text-xs text-gray-400 italic">
            관련 노트는 AI 기능 추가 후 자동으로 표시됩니다.
          </p>
        </div>
      </ResizableRightPanel>
    </div>
  );
}

export default PostEditPage;