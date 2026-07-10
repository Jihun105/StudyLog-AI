import { useTranslation } from "react-i18next";
import { Wrench } from "lucide-react";

// 점검모드 중 관리자를 제외한 모두에게 보여주는 화면. 백엔드 자체가 완전히 죽어있어도
// nginx가 이 상황을 만들어낼 수 있어야 해서, 이 컴포넌트는 별도의 API 호출 없이 순수하게
// 정적으로만 렌더링됨(useMaintenanceStatus가 이미 점검 중임을 판단해서 넘겨준 상태)
function MaintenancePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 px-8 text-center">
      <div className="w-14 h-14 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
        <Wrench size={24} className="text-blue-600 dark:text-blue-400" />
      </div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
        {t("maintenance.title")}
      </h1>
      <p className="text-sm text-gray-400 dark:text-gray-500 max-w-sm leading-relaxed">
        {t("maintenance.desc")}
      </p>
    </div>
  );
}

export default MaintenancePage;
