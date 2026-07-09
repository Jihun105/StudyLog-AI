import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { login } from "../api/auth";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginAction } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // PrivateRoute나 세션 만료 배너가 "원래 있던 페이지"를 state로 넘겨줬으면 그 자리로,
  // 아니면(직접 /login으로 온 경우) 기존대로 대시보드로 이동
  const from = location.state?.from;

  const handleLogin = async () => {
    if (!username || !password) {
      setErrorMessage(t("login.requiredFields"));
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await login(username, password);
      loginAction(data.access_token, data.user);
      navigate(from ? `${from.pathname}${from.search || ""}` : "/", { replace: true });
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || t("login.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* 왼쪽 브랜딩 패널 */}
      <div className="hidden lg:flex w-1/2 bg-blue-600 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">S</div>
          <span className="text-white font-bold text-lg">{t("common.appName")}</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            {t("login.brandTitle").split("\n").map((line, i) => (
              <span key={i}>
                {line}
                <br />
              </span>
            ))}
          </h1>
          <p className="text-blue-200 text-sm leading-relaxed">
            {t("login.brandDesc").split("\n").map((line, i) => (
              <span key={i}>
                {line}
                <br />
              </span>
            ))}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-blue-500 rounded-xl p-4 text-white text-xs">
            <div className="font-bold text-lg mb-1">1.2k+</div>
            <div className="text-blue-200">{t("login.statVectors")}</div>
          </div>
          <div className="bg-blue-500 rounded-xl p-4 text-white text-xs">
            <div className="font-bold text-lg mb-1">124</div>
            <div className="text-blue-200">{t("login.statNotes")}</div>
          </div>
          <div className="bg-blue-500 rounded-xl p-4 text-white text-xs">
            <div className="font-bold text-lg mb-1">42</div>
            <div className="text-blue-200">{t("login.statQuizzes")}</div>
          </div>
        </div>
      </div>

      {/* 오른쪽 로그인 폼 */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{t("login.welcomeBack")}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t("login.subtitle")}</p>
          </div>

          {errorMessage && (
            <div className="bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
              {errorMessage}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("login.username")}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("login.usernamePlaceholder")}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("login.password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("login.passwordPlaceholder")}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className={`w-full py-2.5 rounded-lg text-white font-medium text-sm transition-colors ${
              loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? t("login.loggingIn") : t("login.loginButton")}
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            {t("login.noAccount")}{" "}
            <Link to="/signup" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
              {t("login.signup")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
