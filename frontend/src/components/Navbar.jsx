// useAuth: 로그인 상태(token, user, logoutAction)를 가져오는 커스텀 훅
import { useAuth } from "../context/AuthContext";
// Link: 페이지 이동할 때 쓰는 컴포넌트
// HTML의 <a> 태그와 비슷하지만, 페이지 새로고침 없이 이동
import { Link, useNavigate } from "react-router-dom";

function Navbar() {
    // AuthContext에서 로그인 상태와 로그아웃 함수를 가져옴
    const { user, logoutAction } = useAuth();

    // useNavigate: 특정 URL로 이동시켜주는 훅
    // 로그아웃 후 홈으로 이동할 때
    const navigate = useNavigate();

    // 로그아웃 버튼 클릭 시 실행되는 함수
    const handleLogout = () => {
        logoutAction(); // 토큰과 유저 정보 삭제
        navigate("/"); // 홈으로 이동
    };

    return (
        // Tailwind CSS 클래스로 스타일링
        // bg-white: 흰 배경 / shadow: 그림자 / px-6: 좌우 패딩 / py-4: 위아래 패딩
        // flex: flexbox / justify-between: 양쪽 끝 정렬 / items-center: 수직 중앙 정렬
        <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
      {/* 왼쪽: 로고 (클릭하면 홈으로 이동) */}
      <Link to="/" className="text-xl font-bold text-blue-600">
        AI Study Assistant
      </Link>

      {/* 오른쪽: 로그인 여부에 따라 다른 버튼 표시 */}
      <div className="flex gap-4 items-center">
        {user ? (
          // 로그인 상태일 때
          <>
            {/* 닉네임 표시 */}
            <span className="text-gray-600">{user.nickname}님</span>
            {/* 글쓰기 버튼 */}
            <Link
              to="/posts/create"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              글쓰기
            </Link>
            {/* 로그아웃 버튼 */}
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700"
            >
              로그아웃
            </button>
          </>
        ) : (
          // 비로그인 상태일 때
          <>
            <Link to="/login" className="text-gray-600 hover:text-gray-800">
              로그인
            </Link>
            <Link
              to="/signup"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              회원가입
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;