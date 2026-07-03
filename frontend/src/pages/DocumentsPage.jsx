import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import { Construction } from "lucide-react";

function DocumentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSelectCategory = (categoryId) => {
    navigate(categoryId === null ? "/notes" : `/notes?category=${categoryId}`);
  };

  return (
    <SidebarLayout selectedCategoryId={null} onSelectCategory={handleSelectCategory}>
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center text-gray-400 dark:text-gray-500">
          <Construction size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg font-medium text-gray-500 dark:text-gray-400">{t("documents.comingSoon")}</p>
        </div>
      </div>
    </SidebarLayout>
  );
}

export default DocumentsPage;
