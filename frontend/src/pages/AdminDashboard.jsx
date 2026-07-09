import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getOnlineUsers, getUsageSummary } from "../api/admin";
import SidebarLayout, { SidebarSpacer } from "../components/SidebarLayout";
import { ShieldCheck, Users, DollarSign, RefreshCw } from "lucide-react";

const ONLINE_POLL_MS = 10000;
const USAGE_POLL_MS = 30000;

const FEATURE_LABEL_KEYS = {
  embedding: "adminDashboard.featureEmbedding",
  chat: "adminDashboard.featureChat",
  quiz: "adminDashboard.featureQuiz",
};

function AdminDashboard() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [onlineUsers, setOnlineUsers] = useState(null);
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState("");

  const loadOnlineUsers = useCallback(async () => {
    try {
      const data = await getOnlineUsers(token);
      setOnlineUsers(data);
    } catch (err) {
      // 403(관리자 아님)이면 접속 현황만 조용히 실패해도 되지만, 페이지 자체는
      // 이미 라우트 단에서 막혀 있어야 정상 - 혹시 몰라 에러만 조용히 무시
    }
  }, [token]);

  const loadUsage = useCallback(async () => {
    try {
      const data = await getUsageSummary(token);
      setUsage(data);
    } catch (err) {
      setError(t("adminDashboard.loadFailed"));
    }
  }, [token, t]);

  useEffect(() => {
    loadOnlineUsers();
    loadUsage();
    const onlineTimer = setInterval(loadOnlineUsers, ONLINE_POLL_MS);
    const usageTimer = setInterval(loadUsage, USAGE_POLL_MS);
    return () => {
      clearInterval(onlineTimer);
      clearInterval(usageTimer);
    };
  }, [loadOnlineUsers, loadUsage]);

  const handleGoToNotes = (categoryId) => {
    navigate(categoryId === null ? "/notes" : `/notes?category=${categoryId}`);
  };

  return (
    <SidebarLayout selectedCategoryId={null} onSelectCategory={handleGoToNotes}>
      <div className="flex-1 min-w-0 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="sticky top-0 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 sm:px-8 py-4 flex items-center z-10">
          <div className="flex items-center gap-2">
            <SidebarSpacer />
            <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400" />
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t("adminDashboard.title")}</h1>
          </div>
        </div>

        <div className="px-4 sm:px-8 py-8 max-w-3xl flex flex-col gap-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 접속 현황 */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t("adminDashboard.onlineTitle")}</h2>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto flex items-center gap-1">
                <RefreshCw size={11} /> {t("adminDashboard.autoRefresh", { seconds: ONLINE_POLL_MS / 1000 })}
              </span>
            </div>

            {onlineUsers === null ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">{t("common.loading")}</p>
            ) : onlineUsers.count === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">{t("adminDashboard.noOneOnline")}</p>
            ) : (
              <>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">{onlineUsers.count}</p>
                <div className="flex flex-col gap-1.5">
                  {onlineUsers.users.map((u) => (
                    <div key={u.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-medium">{u.nickname}</span>
                      <span className="text-gray-400 dark:text-gray-500">@{u.username}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* OpenAI 사용량 */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={16} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t("adminDashboard.usageTitle")}</h2>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto flex items-center gap-1">
                <RefreshCw size={11} /> {t("adminDashboard.autoRefresh", { seconds: USAGE_POLL_MS / 1000 })}
              </span>
            </div>

            {usage === null ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">{t("common.loading")}</p>
            ) : (
              <>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                  {t("adminDashboard.thisMonthSince", { date: usage.month_start })}
                </p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                  ${usage.total_estimated_cost_usd.toFixed(4)}
                </p>

                {usage.by_feature.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t("adminDashboard.noUsageYet")}</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
                        <th className="font-medium py-1.5">{t("adminDashboard.featureColumn")}</th>
                        <th className="font-medium py-1.5 text-right">{t("adminDashboard.callsColumn")}</th>
                        <th className="font-medium py-1.5 text-right">{t("adminDashboard.tokensColumn")}</th>
                        <th className="font-medium py-1.5 text-right">{t("adminDashboard.costColumn")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.by_feature.map((row) => (
                        <tr key={row.feature} className="border-b border-gray-50 dark:border-gray-700/60 last:border-0">
                          <td className="py-2 text-gray-700 dark:text-gray-200">
                            {t(FEATURE_LABEL_KEYS[row.feature] || row.feature)}
                          </td>
                          <td className="py-2 text-right text-gray-500 dark:text-gray-400">{row.calls}</td>
                          <td className="py-2 text-right text-gray-500 dark:text-gray-400">{row.total_tokens.toLocaleString()}</td>
                          <td className="py-2 text-right text-gray-700 dark:text-gray-200 font-medium">
                            ${row.estimated_cost_usd.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-4">{t("adminDashboard.estimateDisclaimer")}</p>
              </>
            )}
          </section>
        </div>
      </div>
    </SidebarLayout>
  );
}

export default AdminDashboard;
