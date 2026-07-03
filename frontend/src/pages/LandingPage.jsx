import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FileText, BrainCircuit, Sparkles, Database, ArrowRight } from "lucide-react";

function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* 네비게이션 */}
      <nav className="flex items-center justify-between px-12 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">S</div>
          <span className="font-bold text-gray-800 dark:text-gray-100 text-lg">{t("common.appName")}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {t("landing.login")}
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {t("landing.getStarted")}
          </button>
        </div>
      </nav>

      {/* 히어로 섹션 */}
      <div className="flex flex-col items-center justify-center text-center px-8 py-24">
        <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
          {t("landing.badge")}
        </div>
        <h1 className="text-5xl font-bold text-gray-800 dark:text-gray-100 mb-6 leading-tight max-w-2xl">
          {t("landing.heroTitleLine1")}<br />{t("landing.heroTitleLine2")}
        </h1>
        <p className="text-lg text-gray-400 dark:text-gray-500 mb-10 max-w-xl leading-relaxed">
          {t("landing.heroDesc").split("\n").map((line, i) => (
            <span key={i}>
              {line}
              <br />
            </span>
          ))}
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/signup")}
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            {t("landing.startFree")} <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate("/login")}
            className="border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-8 py-3 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
          >
            {t("landing.login")}
          </button>
        </div>
      </div>

      {/* 기능 카드 */}
      <div className="grid grid-cols-3 gap-6 px-12 pb-24 max-w-5xl mx-auto">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
            <FileText size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{t("landing.featureNotesTitle")}</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed">
            {t("landing.featureNotesDesc")}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
            <BrainCircuit size={20} className="text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{t("landing.featureQuizTitle")}</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed">
            {t("landing.featureQuizDesc")}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
            <Sparkles size={20} className="text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{t("landing.featureRagTitle")}</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed">
            {t("landing.featureRagDesc")}
          </p>
        </div>
      </div>

      {/* 통계 섹션 */}
      <div className="bg-blue-600 py-16">
        <div className="flex justify-center gap-16 text-center text-white">
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Database size={20} className="text-blue-300" />
              <div className="text-4xl font-bold">1.2k+</div>
            </div>
            <div className="text-blue-200 text-sm">{t("landing.statVectors")}</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <FileText size={20} className="text-blue-300" />
              <div className="text-4xl font-bold">124</div>
            </div>
            <div className="text-blue-200 text-sm">{t("landing.statNotes")}</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <BrainCircuit size={20} className="text-blue-300" />
              <div className="text-4xl font-bold">42</div>
            </div>
            <div className="text-blue-200 text-sm">{t("landing.statQuizzes")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
