import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api/auth";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginAction } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      setErrorMessage("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await login(username, password);
      loginAction(data.access_token, data.user);
      navigate("/");
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 왼쪽 브랜딩 패널 */}
      <div className="hidden lg:flex w-1/2 bg-blue-600 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">S</div>
          <span className="text-white font-bold text-lg">StudyBrain AI</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Your personal<br />AI-powered<br />knowledge base.
          </h1>
          <p className="text-blue-200 text-sm leading-relaxed">
            공부한 내용을 기록하고, AI가 기억해서<br />퀴즈와 요약으로 학습 효과를 높여보세요.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-blue-500 rounded-xl p-4 text-white text-xs">
            <div className="font-bold text-lg mb-1">1.2k+</div>
            <div className="text-blue-200">Vectors Embedded</div>
          </div>
          <div className="bg-blue-500 rounded-xl p-4 text-white text-xs">
            <div className="font-bold text-lg mb-1">124</div>
            <div className="text-blue-200">Notes Summarized</div>
          </div>
          <div className="bg-blue-500 rounded-xl p-4 text-white text-xs">
            <div className="font-bold text-lg mb-1">42</div>
            <div className="text-blue-200">Quizzes Taken</div>
          </div>
        </div>
      </div>

      {/* 오른쪽 로그인 폼 */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome back</h2>
            <p className="text-gray-500 text-sm">StudyBrain AI에 로그인하세요</p>
          </div>

          {errorMessage && (
            <div className="bg-red-50 text-red-500 px-4 py-3 rounded-lg mb-4 text-sm">
              {errorMessage}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="아이디를 입력하세요"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="비밀번호를 입력하세요"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className={`w-full py-2.5 rounded-lg text-white font-medium text-sm transition-colors ${
              loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>

          <p className="text-center text-sm text-gray-500 mt-6">
            계정이 없으신가요?{" "}
            <Link to="/signup" className="text-blue-600 font-medium hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;