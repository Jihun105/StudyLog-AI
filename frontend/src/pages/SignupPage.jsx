import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../api/auth";

function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async () => {
    if (!username || !email || !password || !nickname) {
      setErrorMessage("모든 항목을 입력해주세요.");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await signup(username, email, password, nickname);
      setSuccessMessage("회원가입이 완료됐습니다. 로그인 페이지로 이동합니다.");
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || "회원가입에 실패했습니다.");
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
            Start building<br />your personal<br />knowledge base.
          </h1>
          <p className="text-blue-200 text-sm leading-relaxed">
            지금 가입하고 AI 기반 학습 도우미와<br />함께 공부를 시작해보세요.
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

      {/* 오른쪽 회원가입 폼 */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">계정 만들기</h2>
            <p className="text-gray-500 text-sm">StudyBrain AI를 시작해보세요</p>
          </div>

          {errorMessage && (
            <div className="bg-red-50 text-red-500 px-4 py-3 rounded-lg mb-4 text-sm">{errorMessage}</div>
          )}
          {successMessage && (
            <div className="bg-green-50 text-green-500 px-4 py-3 rounded-lg mb-4 text-sm">{successMessage}</div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">아이디</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="아이디"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">닉네임</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="닉네임"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="이메일을 입력하세요"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSignup()}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="8자 이상, 특수문자 1개 포함"
            />
          </div>

          <button
            onClick={handleSignup}
            disabled={loading}
            className={`w-full py-2.5 rounded-lg text-white font-medium text-sm transition-colors ${
              loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>

          <p className="text-center text-sm text-gray-500 mt-6">
            이미 계정이 있으신가요?{" "}
            <Link to="/login" className="text-blue-600 font-medium hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;