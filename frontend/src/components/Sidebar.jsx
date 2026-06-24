import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { getCategories, createCategory, deleteCategory, renameCategory } from "../api/categories";
import {
  LayoutDashboard, FileText, BrainCircuit, Sparkles, Settings,
  HelpCircle, Lock, LogOut, FolderPlus, Folder, FolderOpen,
  ChevronDown, ChevronRight, Plus, Pencil, X, ClipboardList
} from "lucide-react";

function CategoryItem({ category, depth, selectedCategoryId, onSelect, onAdd, onDelete, onRename }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(category.name);

  const isSelected = selectedCategoryId === category.id;
  const hasChildren = category.children && category.children.length > 0;
  const canAddChild = depth < 3;

  const handleRenameSubmit = () => {
    if (renameValue.trim()) onRename(category.id, renameValue.trim());
    setIsRenaming(false);
  };

  return (
    <div>
      <div
        className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer group text-sm
          ${isSelected ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={() => onSelect(category.id)}>
          <span
            className="text-gray-400 w-3 shrink-0 flex items-center"
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          >
            {hasChildren
              ? (isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />)
              : <span className="w-3" />}
          </span>
          {isOpen && hasChildren
            ? <FolderOpen size={14} className="shrink-0 text-gray-400" />
            : <Folder size={14} className="shrink-0 text-gray-400" />}
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit();
                if (e.key === "Escape") setIsRenaming(false);
              }}
              className="text-sm border border-blue-300 rounded px-1 w-full focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate">{category.name}</span>
          )}
        </div>
        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          {canAddChild && (
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(category.id); }}
              className="text-gray-400 hover:text-blue-500 p-0.5 rounded"
              title="하위 폴더 추가"
            >
              <Plus size={12} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}
            className="text-gray-400 hover:text-yellow-500 p-0.5 rounded"
            title="이름 수정"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(category.id); }}
            className="text-gray-400 hover:text-red-500 p-0.5 rounded"
            title="삭제"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {isOpen && hasChildren && (
        <div>
          {category.children.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              depth={depth + 1}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelect}
              onAdd={onAdd}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar({ selectedCategoryId, onSelectCategory }) {
  const { token, user, logoutAction } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [categories, setCategories] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const fetchCategories = async () => {
    try {
      const data = await getCategories(token);
      setCategories(data);
    } catch (error) {}
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleAddRoot = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory(newCategoryName.trim(), null, token);
      setNewCategoryName("");
      setIsAdding(false);
      fetchCategories();
    } catch (error) {}
  };

  const handleAddChild = async (parentId) => {
    const name = prompt("새 폴더 이름을 입력하세요:");
    if (!name?.trim()) return;
    try {
      await createCategory(name.trim(), parentId, token);
      fetchCategories();
    } catch (error) {
      alert(error.response?.data?.detail || "폴더 추가에 실패했습니다.");
    }
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm("폴더를 삭제하면 하위 폴더도 모두 삭제됩니다. 계속할까요?")) return;
    try {
      await deleteCategory(categoryId, token);
      if (selectedCategoryId === categoryId) onSelectCategory?.(null);
      fetchCategories();
    } catch (error) {}
  };

  const handleRename = async (categoryId, name) => {
    try {
      await renameCategory(categoryId, name, token);
      fetchCategories();
    } catch (error) {}
  };

  const handleLogout = () => {
    logoutAction();
    navigate("/");
  };

  const menuItems = [
    { label: "Dashboard", icon: <LayoutDashboard size={16} />, path: "/" },
    { label: "Documents", icon: <FileText size={16} />, path: "/documents" },
    { label: "AI Quiz", icon: <BrainCircuit size={16} />, path: "/quiz" },
    { label: "Summary", icon: <Sparkles size={16} />, path: "/summary" },
    { label: "Settings", icon: <Settings size={16} />, path: "/settings" },
  ];

  return (
    <div className="w-64 shrink-0 bg-white border-r border-gray-100 flex flex-col h-screen">
      {/* 로고 */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {user?.nickname?.[0] || "S"}
          </div>
          <div>
            <div className="font-bold text-gray-800 text-sm">StudyBrain AI</div>
            <div className="text-xs text-gray-400">Premium Plan</div>
          </div>
        </div>
      </div>

      {/* New Folder 버튼 */}
      <div className="px-4 pb-3">
        <button
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FolderPlus size={15} /> New Folder
        </button>
      </div>

      {/* 메인 메뉴 */}
      <div className="px-3 pb-2">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5
              ${location.pathname === item.path
                ? "bg-blue-50 text-blue-600"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
          >
            <span className="shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="mx-4 border-t border-gray-100 my-1" />

      {/* 폴더 트리 */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
          My Folders
        </div>

        {/* 전체 보기 */}
        <button
          onClick={() => onSelectCategory?.(null)}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm mb-0.5 transition-colors
            ${selectedCategoryId === null ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-500 hover:bg-gray-100"}`}
        >
          <ClipboardList size={14} />
          <span>전체 보기</span>
        </button>

        {/* 기본(미분류) */}
        <button
          onClick={() => onSelectCategory?.(-1)}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm mb-1 transition-colors
            ${selectedCategoryId === -1 ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-500 hover:bg-gray-100"}`}
        >
          <Folder size={14} />
          <span>기본 (미분류)</span>
        </button>

        {/* 카테고리 트리 */}
        {categories.map((category) => (
          <CategoryItem
            key={category.id}
            category={category}
            depth={1}
            selectedCategoryId={selectedCategoryId}
            onSelect={(id) => onSelectCategory?.(id)}
            onAdd={handleAddChild}
            onDelete={handleDelete}
            onRename={handleRename}
          />
        ))}

        {/* 새 폴더 입력 */}
        {isAdding && (
          <div className="mt-2 px-2">
            <input
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddRoot();
                if (e.key === "Escape") setIsAdding(false);
              }}
              placeholder="폴더 이름"
              className="w-full text-sm border border-blue-300 rounded-lg px-2 py-1 focus:outline-none"
            />
            <div className="flex gap-1 mt-1">
              <button onClick={handleAddRoot}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded-lg hover:bg-blue-600">추가</button>
              <button onClick={() => setIsAdding(false)}
                className="text-xs text-gray-500 px-2 py-1 rounded-lg hover:bg-gray-100">취소</button>
            </div>
          </div>
        )}
      </div>

      {/* 하단 메뉴 */}
      <div className="border-t border-gray-100 px-3 py-3">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 mb-0.5">
          <HelpCircle size={16} /> Help
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 mb-0.5">
          <Lock size={16} /> Privacy
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-50"
        >
          <LogOut size={16} /> 로그아웃
        </button>
      </div>
    </div>
  );
}

export default Sidebar;