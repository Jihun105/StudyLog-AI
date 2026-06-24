import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../api/auth";

function SignupPage() {
  // 입력창 상태 관리
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");

  // 에러/성공 메시지 상태
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // 로딩 상태
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async () => {
    // 빈 값 체크
    if (!username || !email || !password || !nickname) {
      setErrorMessage("모든 항목을 입력해주세요.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      // 회원가입 API 호출
      await signup(username, email, password, nickname);

      // 성공 시 메시지 표시 후 로그인 페이지로 이동
      setSuccessMessage("회원가입이 완료됐습니다. 로그인 페이지로 이동합니다.");
      setTimeout(() => {
        navigate("/login");
      }, 1500); // 1.5초 후 이동
    } catch (error) {
      setErrorMessage(
        error.response?.data?.detail || "회원가입에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          회원가입
        </h1>

        {/* 에러 메시지 */}
        {errorMessage && (
          <div className="bg-red-50 text-red-500 px-4 py-3 rounded mb-4 text-sm">
            {errorMessage}
          </div>
        )}

        {/* 성공 메시지 */}
        {successMessage && (
          <div className="bg-green-50 text-green-500 px-4 py-3 rounded mb-4 text-sm">
            {successMessage}
          </div>
        )}

        {/* 아이디 입력창 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            아이디
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="아이디를 입력하세요"
          />
        </div>

        {/* 이메일 입력창 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            이메일
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="이메일을 입력하세요"
          />
        </div>

        {/* 비밀번호 입력창 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="8자 이상, 특수문자 1개 포함"
          />
        </div>

        {/* 닉네임 입력창 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            닉네임
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="닉네임을 입력하세요"
          />
        </div>

        {/* 회원가입 버튼 */}
        <button
          onClick={handleSignup}
          disabled={loading}
          className={`w-full py-2 rounded text-white font-medium ${
            loading
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "가입 중..." : "회원가입"}
        </button>

        {/* 로그인 링크 */}
        <p className="text-center text-sm text-gray-500 mt-4">
          이미 계정이 있으신가요?{" "}
          <Link to="/login" className="text-blue-500 hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;