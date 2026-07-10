import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import SidebarLayout, { SidebarSpacer } from "../components/SidebarLayout";
import ContactSection from "../components/ContactSection";

// 로그인한 사용자도 문의를 남길 수 있도록 사이드바에서 접근하는 페이지. 비로그인 상태에서
// 보이는 랜딩 페이지의 FAQ/문의 섹션과 완전히 동일한 ContactSection을 그대로 재사용함
function ContactPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleGoToNotes = (categoryId) => {
    navigate(categoryId === null ? "/notes" : `/notes?category=${categoryId}`);
  };

  return (
    <SidebarLayout selectedCategoryId={null} onSelectCategory={handleGoToNotes}>
      <div className="flex-1 min-w-0 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="sticky top-0 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 sm:px-8 py-4 flex items-center z-10">
          <div className="flex items-center gap-2">
            <SidebarSpacer />
            <Mail size={18} className="text-blue-600 dark:text-blue-400" />
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t("landing.contactTitle")}</h1>
          </div>
        </div>

        <div className="px-4 sm:px-8 py-12 max-w-2xl mx-auto">
          <ContactSection />
        </div>
      </div>
    </SidebarLayout>
  );
}

export default ContactPage;
