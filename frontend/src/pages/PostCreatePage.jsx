import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPost } from "../api/posts";
import { getCategories } from "../api/categories";
import { useAuth } from "../context/AuthContext";
import RichTextEditor from "../components/RichTextEditor";
import { Lightbulb, FileText, ChevronRight } from "lucide-react";

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
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handleCreate = async () => {
    if (!title || !content) {
      setErrorMessage("제목과 내용을 입력해주세요.");
      return;
    }
    const tags = tagInput.split(",").map((tag) => tag.trim()).filter((tag) => tag);
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await createPost(title, content, tags, token, categoryId);
      navigate(`/posts/${data.id}`);
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || "게시글 작성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* 메인 작성 영역 */}
      <div className="flex-1 overflow-y-auto">
        {/* 상단 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <button onClick={() => navigate("/")} className="hover:text-blue-600">All Notes</button>
            <ChevronRight size={14} className="text-gray-300" />
            <span className="text-gray-700 font-medium">New Post</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-green-50 text-green-600 text-xs font-medium px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              AI Status: Online
            </div>
            <button
              onClick={handleCreate}
              disabled={loading}
              className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
                loading ? "bg-blue-300 text-white cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {loading ? "저장 중..." : "Save Post"}
            </button>
            <button
              onClick={() => navigate("/")}
              className="text-sm text-gray-500 border border-gray-200 px-4 py-1.5 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* 작성 폼 */}
        <div className="px-8 py-8">
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
              className="flex items-center gap-2 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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

          <RichTextEditor content={content} onChange={setContent} />
        </div>
      </div>

      {/* 우측 AI 패널 */}
      <div className="w-72 shrink-0 border-l border-gray-100 bg-white overflow-y-auto p-5 flex flex-col gap-4">
        <div className="border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <Lightbulb size={15} className="text-yellow-500" /> AI Context
          </div>
          <p className="text-xs text-gray-400 mb-3">Based on your title, you might want to cover:</p>
          <p className="text-xs text-gray-400 italic">
            {title ? "제목을 입력하면 AI가 작성 가이드를 제공할 예정입니다." : "제목을 입력해주세요."}
          </p>
          <button className="mt-3 w-full text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">
            + Insert Template
          </button>
        </div>

        <div className="border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <FileText size={15} className="text-blue-500" /> Related Notes
          </div>
          <p className="text-xs text-gray-400 italic">
            관련 노트는 AI 기능 추가 후 자동으로 표시됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PostCreatePage;