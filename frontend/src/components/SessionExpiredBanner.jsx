import { useEffect, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// 로그인/회원가입 자체의 401(아이디/비번 오류)까지 "세션 만료"로 착각하면 안 되니 제외
const isAuthEndpoint = (url = "") => url.includes("/api/auth/login") || url.includes("/api/auth/signup");

// JWT(60분 만료)가 만료된 채로 계속 페이지 안에 머물러 있으면, API가 전부 401을 내면서
// 화면엔 아무 설명 없이 뭔가 깨진 것처럼 보임 - 여기서 전역으로 401을 감지해서
// 상단에 "세션이 만료되었습니다" 배너를 띄우고, 로그인 버튼을 누르면 로그아웃 처리 후
// 로그인 화면으로 보내줌(다시 로그인하면 정상적으로 이용 재개)
function SessionExpiredBanner() {
  const { t } = useTranslation();
  const { logoutAction } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;
        const url = error.config?.url;
        if (status === 401 && !isAuthEndpoint(url)) {
          setExpired(true);
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptorId);
  }, []);

  const handleReLogin = () => {
    setExpired(false);
    logoutAction();
    // 지금 있던 페이지(글쓰기/수정 중이었을 수 있음)를 같이 넘겨서, 재로그인 후
    // 다시 이 페이지로 돌아올 수 있게 함 - 자동 임시저장된 draft를 바로 복구할 수 있음
    navigate("/login", { state: { from: location } });
  };

  if (!expired) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-50 dark:bg-yellow-500/10 border-b border-yellow-200 dark:border-yellow-500/30 px-4 py-3 flex items-center justify-center gap-3 text-sm text-yellow-800 dark:text-yellow-300">
      <span>{t("common.sessionExpiredMessage")}</span>
      <button
        onClick={handleReLogin}
        className="bg-yellow-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-yellow-700 shrink-0"
      >
        {t("common.reLogin")}
      </button>
    </div>
  );
}

export default SessionExpiredBanner;
