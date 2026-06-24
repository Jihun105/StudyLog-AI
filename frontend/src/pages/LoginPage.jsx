// useState: 컴포넌트 안에서 변하는 값(상태)을 관리하는 훅
// 예: 입력창에 타이핑할 때마다 값이 바뀌는 것을 추적합니다.
import { useState } from "react";

// useNavigate: 특정 URL로 이동시켜주는 훅
import { useNavigate, Link } from "react-router-dom";

// 로그인 API 호출 함수
import { login } from "../api/auth";

// 로그인 상태 관리 훅
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  // 입력창 상태 관리
  // useState("") 는 초기값이 빈 문자열이라는 뜻입니다.
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // 에러 메시지 상태 (로그인 실패 시 화면에 표시)
  const [errorMessage, setErrorMessage] = useState("");

  // 로딩 상태 (API 호출 중일 때 버튼 비활성화)
  const [loading, setLoading] = useState(false);

  const { loginAction } = useAuth();
  const navigate = useNavigate();

  // 로그인 버튼 클릭 시 실행되는 함수
  const handleLogin = async () => {
    // 빈 값 체크
    if (!username || !password) {
      setErrorMessage("아이디와 비밀번호를 입력해주세요.");
      return; // 함수 종료 (API 호출 안 함)
    }

    setLoading(true);      // 로딩 시작
    setErrorMessage("");   // 이전 에러 메시지 초기화

    try {
      // 로그인 API 호출
      const data = await login(username, password);

      // 성공 시 토큰과 유저 정보를 Context에 저장
      loginAction(data.access_token, data.user);

      // 홈으로 이동
      navigate("/");
    } catch (error) {
      // 실패 시 백엔드가 보내준 에러 메시지를 화면에 표시
      // error.response?.data?.detail 은 백엔드의 HTTPException detail 값입니다.
      // ?. 는 optional chaining으로, 값이 없으면 undefined를 반환해서 에러를 방지합니다.
      setErrorMessage(
        error.response?.data?.detail || "로그인에 실패했습니다."
      );
    } finally {
      // 성공이든 실패든 로딩 종료
      setLoading(false);
    }
  };

  return (
    // 화면 전체를 flex로 중앙 정렬합니다.
    // min-h-screen: 최소 높이를 화면 전체로 설정
    // bg-gray-50: 연한 회색 배경
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      {/* 로그인 카드 */}
      {/* w-full max-w-md: 최대 너비 제한 / bg-white: 흰 배경 / rounded-lg: 둥근 모서리 */}
      {/* shadow-md: 그림자 / p-8: 내부 패딩 */}
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          로그인
        </h1>

        {/* 에러 메시지 (errorMessage가 있을 때만 표시) */}
        {errorMessage && (
          <div className="bg-red-50 text-red-500 px-4 py-3 rounded mb-4 text-sm">
            {errorMessage}
          </div>
        )}

        {/* 아이디 입력창 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            아이디
          </label>
          <input
            type="text"
            // value: 입력창의 현재 값 (state와 연결)
            value={username}
            // onChange: 타이핑할 때마다 state를 업데이트
            // e.target.value는 현재 입력창의 값입니다.
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="아이디를 입력하세요"
          />
        </div>

        {/* 비밀번호 입력창 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="비밀번호를 입력하세요"
            // 엔터 키를 눌러도 로그인되게 합니다.
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>

        {/* 로그인 버튼 */}
        <button
          onClick={handleLogin}
          // loading 중이면 버튼 비활성화 및 색상 변경
          disabled={loading}
          className={`w-full py-2 rounded text-white font-medium ${
            loading
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {/* loading 중이면 텍스트 변경 */}
          {loading ? "로그인 중..." : "로그인"}
        </button>

        {/* 회원가입 링크 */}
        <p className="text-center text-sm text-gray-500 mt-4">
          계정이 없으신가요?{" "}
          <Link to="/signup" className="text-blue-500 hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;