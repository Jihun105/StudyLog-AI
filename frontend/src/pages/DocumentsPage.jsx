import Sidebar from "../components/Sidebar";
import { Construction } from "lucide-react";

function DocumentsPage() {
  return (
    <>
      <Sidebar selectedCategoryId={null} onSelectCategory={() => {}} />
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <Construction size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">Coming soon</p>
        </div>
      </div>
    </>
  );
}

export default DocumentsPage;
