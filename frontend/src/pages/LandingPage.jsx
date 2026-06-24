import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 py-24 text-center">
      {/* 서비스 소개 */}
      <h1 className="text-4xl font-bold text-gray-800 mb-4">
        AI Study Assistant
      </h1>
      <p className="text-lg text-gray-500 mb-12">
        공부한 내용을 기록하고, AI가 기억해서 답해주는 나만의 지식 베이스
      </p>

      {/* 버튼 */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => navigate("/login")}
          className="px-6 py-3 rounded border border-blue-500 text-blue-500 hover:bg-blue-50 font-medium"
        >
          로그인
        </button>
        <button
          onClick={() => navigate("/signup")}
          className="px-6 py-3 rounded bg-blue-500 text-white hover:bg-blue-600 font-medium"
        >
          회원가입
        </button>
      </div>
    </div>
  );
}

export default LandingPage;