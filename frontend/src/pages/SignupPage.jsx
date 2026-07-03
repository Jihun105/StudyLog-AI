import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../api/auth";

function SignupPage() {
  const { t } = useTranslation();
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
      setErrorMessage(t("signup.requiredFields"));
      return;
    }
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await signup(username, email, password, nickname);
      setSuccessMessage(t("signup.signupSuccess"));
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || t("signup.signupFailed"));
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
            {t("signup.brandTitle").split("\n").map((line, i) => (
              <span key={i}>
                {line}
                <br />
              </span>
            ))}
          </h1>
          <p className="text-blue-200 text-sm leading-relaxed">
            {t("signup.brandDesc").split("\n").map((line, i) => (
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
            <div className="text-blue-200">{t("signup.statVectors")}</div>
          </div>
          <div className="bg-blue-500 rounded-xl p-4 text-white text-xs">
            <div className="font-bold text-lg mb-1">124</div>
            <div className="text-blue-200">{t("signup.statNotes")}</div>
          </div>
          <div className="bg-blue-500 rounded-xl p-4 text-white text-xs">
            <div className="font-bold text-lg mb-1">42</div>
            <div className="text-blue-200">{t("signup.statQuizzes")}</div>
          </div>
        </div>
      </div>

      {/* 오른쪽 회원가입 폼 */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{t("signup.createAccount")}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t("signup.subtitle")}</p>
          </div>

          {errorMessage && (
            <div className="bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{errorMessage}</div>
          )}
          {successMessage && (
            <div className="bg-green-50 dark:bg-green-500/10 text-green-500 dark:text-green-400 px-4 py-3 rounded-lg mb-4 text-sm">{successMessage}</div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("signup.username")}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t("signup.usernamePlaceholder")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("signup.nickname")}</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t("signup.nicknamePlaceholder")}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("signup.email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("signup.emailPlaceholder")}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("signup.password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSignup()}
              className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("signup.passwordPlaceholder")}
            />
          </div>

          <button
            onClick={handleSignup}
            disabled={loading}
            className={`w-full py-2.5 rounded-lg text-white font-medium text-sm transition-colors ${
              loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? t("signup.signingUp") : t("signup.signupButton")}
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            {t("signup.haveAccount")}{" "}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
              {t("signup.login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
