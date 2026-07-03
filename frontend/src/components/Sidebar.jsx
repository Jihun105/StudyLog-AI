import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { getCategories, createCategory, deleteCategory, renameCategory } from "../api/categories";
import {
  LayoutDashboard, FileText, BrainCircuit, Settings,
  LogOut, FolderPlus, Folder, FolderOpen,
  ChevronDown, ChevronRight, Plus, Pencil, X, ClipboardList,
  PanelLeftClose, FilePlus2, Trash2, ListTodo
} from "lucide-react";

function CategoryItem({ category, depth, indentOffset = 0, selectedCategoryId, onSelect, onAdd, onDelete, onRename, onWrite }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(category.name);
  const [menuPos, setMenuPos] = useState(null); // {x, y} - null이면 우클릭 메뉴 닫힘
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");

  const isSelected = selectedCategoryId === category.id;
  const hasChildren = category.children && category.children.length > 0;
  // canAddChild는 실제 카테고리 깊이(depth) 기준 — "기본" 하위로 보여주는 건 화면상의 들여쓰기(indentOffset)일 뿐,
  // 백엔드의 "최대 3단계" 제약과는 무관하므로 depth로만 판단
  const canAddChild = depth < 3;

  const handleRenameSubmit = () => {
    if (renameValue.trim()) onRename(category.id, renameValue.trim());
    setIsRenaming(false);
  };

  // 하위 폴더 추가 - 브라우저 prompt() 대신 트리 안에 폴더 아이콘 + 입력창을 인라인으로 보여줌
  const startAddChild = () => {
    setIsOpen(true); // 접혀 있었다면 입력창이 보이도록 펼침
    setIsAddingChild(true);
  };
  const handleAddChildSubmit = () => {
    if (newChildName.trim()) onAdd(category.id, newChildName.trim());
    setNewChildName("");
    setIsAddingChild(false);
  };

  const openContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
  };
  const closeContextMenu = () => setMenuPos(null);

  // 메뉴가 열려 있을 때 바깥을 클릭하거나 Esc를 누르면 닫힘
  useEffect(() => {
    if (!menuPos) return;
    const handleOutsideClick = () => closeContextMenu();
    const handleEsc = (e) => { if (e.key === "Escape") closeContextMenu(); };
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [menuPos]);

  return (
    <div>
      <div
        className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer group text-sm
          ${isSelected
            ? "bg-blue-50 text-blue-600 font-medium dark:bg-blue-500/10 dark:text-blue-400"
            : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/60"}`}
        style={{ paddingLeft: `${(depth + indentOffset) * 14 + 8}px` }}
        onContextMenu={openContextMenu}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={() => onSelect(category.id)}>
          <span
            className="text-gray-400 dark:text-gray-500 w-3 shrink-0 flex items-center"
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          >
            {hasChildren
              ? (isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />)
              : <span className="w-3" />}
          </span>
          {isOpen && hasChildren
            ? <FolderOpen size={14} className="shrink-0 text-gray-400 dark:text-gray-500" />
            : <Folder size={14} className="shrink-0 text-gray-400 dark:text-gray-500" />}
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
              className="text-sm border border-blue-300 dark:border-blue-500 dark:bg-gray-700 dark:text-gray-100 rounded px-1 w-full focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate">{category.name}</span>
          )}
        </div>
        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          {canAddChild && (
            <button
              onClick={(e) => { e.stopPropagation(); startAddChild(); }}
              className="text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 p-0.5 rounded"
              title={t("sidebar.addSubfolder")}
            >
              <Plus size={12} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}
            className="text-gray-400 hover:text-yellow-500 dark:text-gray-500 dark:hover:text-yellow-400 p-0.5 rounded"
            title={t("sidebar.rename")}
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(category.id); }}
            className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-0.5 rounded"
            title={t("sidebar.delete")}
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* 우클릭 컨텍스트 메뉴: 폴더 생성 / 글쓰기 / 이름변경 / 삭제 */}
      {menuPos && (
        <div
          className="fixed z-50 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm"
          style={{ top: menuPos.y, left: menuPos.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {canAddChild && (
            <button
              onClick={() => { startAddChild(); closeContextMenu(); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
            >
              <FolderPlus size={14} className="shrink-0" /> {t("sidebar.addSubfolder")}
            </button>
          )}
          <button
            onClick={() => { onWrite(category.id); closeContextMenu(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
          >
            <FilePlus2 size={14} className="shrink-0" /> {t("sidebar.writeNote")}
          </button>
          <button
            onClick={() => { setIsRenaming(true); closeContextMenu(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
          >
            <Pencil size={14} className="shrink-0" /> {t("sidebar.rename")}
          </button>
          <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
          <button
            onClick={() => { onDelete(category.id); closeContextMenu(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <Trash2 size={14} className="shrink-0" /> {t("sidebar.delete")}
          </button>
        </div>
      )}

      {isOpen && (hasChildren || isAddingChild) && (
        <div>
          {hasChildren && category.children.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              depth={depth + 1}
              indentOffset={indentOffset}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelect}
              onAdd={onAdd}
              onDelete={onDelete}
              onRename={onRename}
              onWrite={onWrite}
            />
          ))}

          {/* 새 하위 폴더 인라인 입력 - 폴더 아이콘 + 입력창이 실제 하위 폴더처럼 트리 안에 나타남 */}
          {isAddingChild && (
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 text-sm"
              style={{ paddingLeft: `${(depth + 1 + indentOffset) * 14 + 8}px` }}
            >
              <span className="w-3 shrink-0" />
              <Folder size={14} className="shrink-0 text-gray-400 dark:text-gray-500" />
              <input
                autoFocus
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                onBlur={handleAddChildSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddChildSubmit();
                  if (e.key === "Escape") { setNewChildName(""); setIsAddingChild(false); }
                }}
                placeholder={t("sidebar.folderNamePlaceholder")}
                className="flex-1 min-w-0 text-sm border border-blue-300 dark:border-blue-500 dark:bg-gray-700 dark:text-gray-100 rounded px-1 focus:outline-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Sidebar({ selectedCategoryId, onSelectCategory, onCollapse }) {
  const { t } = useTranslation();
  const { token, user, logoutAction } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [categories, setCategories] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [defaultFolderOpen, setDefaultFolderOpen] = useState(true);
  // "기본"(미분류) 폴더 위 / 빈 공간 우클릭 메뉴 - 실제 폴더(CategoryItem)와 달리 이 둘은
  // 하드코딩된 요소라 자체 컨텍스트 메뉴가 없었음. mode로 "기본" 위인지 빈 공간인지 구분
  const [rootMenu, setRootMenu] = useState(null); // {x, y, mode: "default" | "empty"}

  const openRootMenu = (e, mode) => {
    e.preventDefault();
    e.stopPropagation();
    setRootMenu({ x: e.clientX, y: e.clientY, mode });
  };
  const closeRootMenu = () => setRootMenu(null);

  useEffect(() => {
    if (!rootMenu) return;
    const handleOutsideClick = () => closeRootMenu();
    const handleEsc = (e) => { if (e.key === "Escape") closeRootMenu(); };
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [rootMenu]);

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

  const handleAddChild = async (parentId, name) => {
    try {
      await createCategory(name, parentId, token);
      fetchCategories();
    } catch (error) {
      alert(error.response?.data?.detail || t("sidebar.addFolderFailed"));
    }
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm(t("sidebar.confirmDeleteFolder"))) return;
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

  // 우클릭 메뉴의 "글쓰기" - 그 폴더가 선택된 채로 글쓰기 페이지로 이동
  const handleWriteInFolder = (categoryId) => {
    navigate(`/posts/create?category=${categoryId}`);
  };

  const handleLogout = () => {
    logoutAction();
    navigate("/");
  };

  const menuItems = [
    { label: t("sidebar.dashboard"), icon: <LayoutDashboard size={16} />, path: "/" },
    { label: t("sidebar.documents"), icon: <FileText size={16} />, path: "/documents" },
    { label: t("sidebar.aiQuiz"), icon: <BrainCircuit size={16} />, path: "/quiz" },
    { label: t("sidebar.todo"), icon: <ListTodo size={16} />, path: "/todos" },
  ];

  return (
    <div className="w-full h-full bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex flex-col">
      {/* 로고 */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {user?.profile_image
              ? <img src={user.profile_image} alt={user?.nickname} className="w-full h-full object-cover" />
              : (user?.nickname?.[0] || "S")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">{t("common.appName")}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">{t("sidebar.premiumPlan")}</div>
          </div>
          {onCollapse && (
            <button
              onClick={onCollapse}
              title={t("sidebar.collapse")}
              className="text-gray-300 hover:text-blue-600 dark:text-gray-600 dark:hover:text-blue-400 p-1 rounded shrink-0"
            >
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 메인 메뉴 */}
      <div className="px-3 pb-2">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5
              ${location.pathname === item.path
                ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/60 dark:hover:text-gray-200"}`}
          >
            <span className="shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="mx-4 border-t border-gray-100 dark:border-gray-700 my-1" />

      {/* 폴더 트리 */}
      <div
        className="flex-1 overflow-y-auto px-3 py-2"
        onContextMenu={(e) => openRootMenu(e, "empty")}
      >
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t("sidebar.myFolders")}
          </span>
          <button
            onClick={() => setIsAdding(true)}
            title={t("sidebar.newFolder")}
            className="text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 p-0.5 rounded"
          >
            <FolderPlus size={14} />
          </button>
        </div>

        {/* 전체 보기 */}
        <button
          onClick={() => onSelectCategory?.(null)}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm mb-0.5 transition-colors
            ${selectedCategoryId === null
              ? "bg-blue-50 text-blue-600 font-medium dark:bg-blue-500/10 dark:text-blue-400"
              : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/60"}`}
        >
          <ClipboardList size={14} />
          <span>{t("sidebar.allNotes")}</span>
        </button>

        {/* 기본 - 항상 최상위에 고정. 실제로 생성되는 폴더는 전부 이 아래로(화면상) 들어감 */}
        <div
          className={`flex items-center px-2 py-1.5 rounded-lg cursor-pointer group text-sm mb-0.5
            ${selectedCategoryId === -1
              ? "bg-blue-50 text-blue-600 font-medium dark:bg-blue-500/10 dark:text-blue-400"
              : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/60"}`}
          onContextMenu={(e) => openRootMenu(e, "default")}
        >
          <span
            className="text-gray-400 dark:text-gray-500 w-3 shrink-0 flex items-center"
            onClick={(e) => { e.stopPropagation(); setDefaultFolderOpen((prev) => !prev); }}
          >
            {categories.length > 0
              ? (defaultFolderOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />)
              : <span className="w-3" />}
          </span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={() => onSelectCategory?.(-1)}>
            {defaultFolderOpen && categories.length > 0
              ? <FolderOpen size={14} className="shrink-0 text-gray-400 dark:text-gray-500" />
              : <Folder size={14} className="shrink-0 text-gray-400 dark:text-gray-500" />}
            <span className="truncate">{t("sidebar.uncategorized")}</span>
          </div>
        </div>

        {/* "기본"/빈 공간 우클릭 메뉴 - 실제 폴더가 아니라 새 폴더 추가(+글쓰기)만 제공 */}
        {rootMenu && (
          <div
            className="fixed z-50 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm"
            style={{ top: rootMenu.y, left: rootMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setIsAdding(true); closeRootMenu(); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
            >
              <FolderPlus size={14} className="shrink-0" /> {t("sidebar.newFolder")}
            </button>
            {rootMenu.mode === "default" && (
              <button
                onClick={() => { navigate("/posts/create"); closeRootMenu(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
              >
                <FilePlus2 size={14} className="shrink-0" /> {t("sidebar.writeNote")}
              </button>
            )}
          </div>
        )}

        {/* 실제로 생성된 폴더들 - 화면상 "기본" 하위로 한 단계 더 들여쓰기(indentOffset) */}
        {defaultFolderOpen && categories.map((category) => (
          <CategoryItem
            key={category.id}
            category={category}
            depth={1}
            indentOffset={1}
            selectedCategoryId={selectedCategoryId}
            onSelect={(id) => onSelectCategory?.(id)}
            onAdd={handleAddChild}
            onDelete={handleDelete}
            onRename={handleRename}
            onWrite={handleWriteInFolder}
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
              placeholder={t("sidebar.folderNamePlaceholder")}
              className="w-full text-sm border border-blue-300 dark:border-blue-500 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1 focus:outline-none"
            />
            <div className="flex gap-1 mt-1">
              <button onClick={handleAddRoot}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded-lg hover:bg-blue-600">{t("sidebar.add")}</button>
              <button onClick={() => setIsAdding(false)}
                className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60">{t("sidebar.cancel")}</button>
            </div>
          </div>
        )}
      </div>

      {/* 하단 메뉴 */}
      <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-3">
        <button
          onClick={() => navigate("/settings")}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors
            ${location.pathname === "/settings"
              ? "bg-blue-50 text-blue-600 font-medium dark:bg-blue-500/10 dark:text-blue-400"
              : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/60"}`}
        >
          <Settings size={16} /> {t("sidebar.settings")}
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          <LogOut size={16} /> {t("sidebar.logout")}
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
