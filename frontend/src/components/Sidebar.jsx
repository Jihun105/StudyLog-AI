import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { getCategories, createCategory, deleteCategory, renameCategory, reorderCategories, updateCategoryColor } from "../api/categories";
import { movePost } from "../api/posts";
import {
  LayoutDashboard, FileText, BrainCircuit, Settings,
  LogOut, FolderPlus, Folder, FolderOpen, FolderTree,
  ChevronDown, ChevronRight, Plus, Pencil, X, ClipboardList,
  PanelLeftClose, FilePlus2, Trash2, ListTodo, Palette, ShieldCheck, Mail
} from "lucide-react";
import ColorDotPicker, { colorByKey } from "./ColorPicker";
import { getErrorMessage } from "../utils/errors";

// 노트(글) 드래그 앤 드롭에 쓰는 dataTransfer 타입 - HomePage 등 다른 페이지의 노트 카드에서
// 이 타입으로 값을 실어 보내면 Sidebar의 폴더가 받아서 카테고리를 옮겨줌
export const POST_DRAG_TYPE = "application/x-studylog-post";

// 트리 조작 헬퍼들 - 전부 주어진 nodes 배열(및 그 하위 children)을 직접 변형(mutate)하거나
// 그 안에서 노드/형제배열을 찾아내는 용도. 항상 호출 전에 깊은 복사를 해서 원본 state를
// 직접 건드리지 않도록 함(Sidebar 컴포넌트의 handleDropOnCategory/handleDropOnRoot 참고)
function findNodeById(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children && node.children.length > 0) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function removeNodeById(nodes, id) {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) {
      const [removed] = nodes.splice(i, 1);
      return removed;
    }
    if (nodes[i].children && nodes[i].children.length > 0) {
      const removed = removeNodeById(nodes[i].children, id);
      if (removed) return removed;
    }
  }
  return null;
}

function findSiblingsAndIndex(nodes, id) {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) {
      return { siblings: nodes, index: i };
    }
    if (nodes[i].children && nodes[i].children.length > 0) {
      const found = findSiblingsAndIndex(nodes[i].children, id);
      if (found) return found;
    }
  }
  return null;
}

// draggedNode 자신의 하위(자손) 중에 targetId가 있는지 - 자기 자신의 하위 폴더로
// 옮기려는 시도를 프론트에서 먼저 걸러내기 위함(백엔드도 최종적으로 다시 검증함)
function isDescendant(node, targetId) {
  if (!node.children) return false;
  for (const child of node.children) {
    if (child.id === targetId || isDescendant(child, targetId)) return true;
  }
  return false;
}

// 트리 전체를 백엔드가 받는 {id, parent_id, order_index} 평탄화 목록으로 변환
function flattenForReorder(nodes, parentId = null) {
  const result = [];
  nodes.forEach((node, index) => {
    result.push({ id: node.id, parent_id: parentId, order_index: index });
    if (node.children && node.children.length > 0) {
      result.push(...flattenForReorder(node.children, node.id));
    }
  });
  return result;
}

// 마우스가 행(row)의 위/중간/아래 중 어디 있는지로 드롭 의도를 판단
// 위 25% = 이 폴더 "앞"에 형제로 삽입, 아래 25% = "뒤"에 형제로 삽입, 가운데 50% = 이 폴더 "안"으로 이동(하위 폴더화)
function computeDropZone(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const ratio = (e.clientY - rect.top) / rect.height;
  if (ratio < 0.25) return "before";
  if (ratio > 0.75) return "after";
  return "into";
}

function CategoryItem({
  category, depth, indentOffset = 0, selectedCategoryId, onSelect, onAdd, onDelete, onRename, onWrite, onChangeColor,
  contextMenu, onOpenMenu, onCloseMenu,
  draggingId, onDragStartItem, onDragEndItem, dragOver, onDragOverItem, onDropItem,
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(category.name);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  // 우클릭 메뉴에서 "색상 변경"을 누르면 메뉴가 닫히는 대신 그 자리에서 점 선택기로 바뀜
  const [isChoosingColor, setIsChoosingColor] = useState(false);
  const colorTone = colorByKey(category.color);

  const isSelected = selectedCategoryId === category.id;
  const hasChildren = category.children && category.children.length > 0;
  const isMenuOpen = contextMenu?.categoryId === category.id;
  const isDragOverThis = dragOver?.categoryId === category.id;
  // canAddChild는 실제 카테고리 깊이(depth) 기준 — "기본" 하위로 보여주는 건 화면상의 들여쓰기(indentOffset)일 뿐,
  // 백엔드의 "최대 5단계"(MAX_CATEGORY_DEPTH) 제약과는 무관하므로 depth로만 판단
  const canAddChild = depth < 5;

  // 메뉴 자체가 닫히면(바깥 클릭/Esc 등) 색상 선택 화면도 같이 초기화
  useEffect(() => {
    if (!isMenuOpen) setIsChoosingColor(false);
  }, [isMenuOpen]);

  const handleChangeColorSubmit = (colorKey) => {
    onChangeColor(category.id, colorKey);
    setIsChoosingColor(false);
    onCloseMenu();
  };

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
    onOpenMenu(e, category.id);
  };

  return (
    <div>
      <div
        className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer group text-sm
          ${isSelected
            ? "bg-blue-100 text-blue-600 font-medium dark:bg-transparent dark:text-gray-100 dark:font-semibold"
            : "text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700/60"}
          ${isDragOverThis && dragOver?.zone === "before" ? "border-t-2 border-blue-500" : "border-t-2 border-transparent"}
          ${isDragOverThis && dragOver?.zone === "after" ? "border-b-2 border-blue-500" : "border-b-2 border-transparent"}
          ${isDragOverThis && dragOver?.zone === "into" ? "ring-2 ring-inset ring-blue-400" : ""}`}
        style={{ paddingLeft: `${(depth + indentOffset) * 14 + 8}px` }}
        onContextMenu={openContextMenu}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.effectAllowed = "move";
          onDragStartItem(category.id);
        }}
        onDragEnd={() => onDragEndItem()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";
          // 노트(글) 드래그 중이면 형제 삽입 개념이 없으니 항상 "into"(이 폴더로 이동)
          const isPostDrag = e.dataTransfer.types.includes(POST_DRAG_TYPE);
          const zone = isPostDrag ? "into" : computeDropZone(e);
          onDragOverItem(category.id, zone);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDropItem(e, category, dragOver?.zone || "into");
        }}
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
            ? <FolderOpen size={14} className={`shrink-0 ${colorTone ? colorTone.text : "text-gray-400 dark:text-gray-500"}`} />
            : <Folder size={14} className={`shrink-0 ${colorTone ? colorTone.text : "text-gray-400 dark:text-gray-500"}`} />}
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

      {/* 우클릭 컨텍스트 메뉴: 폴더 생성 / 글쓰기 / 이름변경 / 색상 / 삭제.
          "색상 변경"을 누르면 메뉴가 닫히지 않고 같은 자리에서 점 선택기로 바뀜 */}
      {isMenuOpen && (
        <div
          className="fixed z-50 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {!isChoosingColor ? (
            <>
              {canAddChild && (
                <button
                  onClick={() => { startAddChild(); onCloseMenu(); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                >
                  <FolderPlus size={14} className="shrink-0" /> {t("sidebar.addSubfolder")}
                </button>
              )}
              <button
                onClick={() => { onWrite(category.id); onCloseMenu(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
              >
                <FilePlus2 size={14} className="shrink-0" /> {t("sidebar.writeNote")}
              </button>
              <button
                onClick={() => { setIsRenaming(true); onCloseMenu(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
              >
                <Pencil size={14} className="shrink-0" /> {t("sidebar.rename")}
              </button>
              <button
                onClick={() => setIsChoosingColor(true)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
              >
                <Palette size={14} className="shrink-0" /> {t("sidebar.changeColor")}
              </button>
              <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
              <button
                onClick={() => { onDelete(category.id); onCloseMenu(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <Trash2 size={14} className="shrink-0" /> {t("sidebar.delete")}
              </button>
            </>
          ) : (
            <div className="px-3 py-2">
              <ColorDotPicker value={category.color} onChange={handleChangeColorSubmit} />
            </div>
          )}
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
              onChangeColor={onChangeColor}
              contextMenu={contextMenu}
              onOpenMenu={onOpenMenu}
              onCloseMenu={onCloseMenu}
              draggingId={draggingId}
              onDragStartItem={onDragStartItem}
              onDragEndItem={onDragEndItem}
              dragOver={dragOver}
              onDragOverItem={onDragOverItem}
              onDropItem={onDropItem}
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
  // 사이드바 전체에서 우클릭 메뉴는 항상 하나만 열려 있어야 함 - {x, y, categoryId}.
  // categoryId가 null이면 빈 공간(새 폴더 추가만), 특정 id면 그 폴더의 메뉴(CategoryItem이 렌더링).
  const [contextMenu, setContextMenu] = useState(null);
  // 드래그 앤 드롭 상태 - draggingId: 지금 드래그 중인 "폴더"의 id(노트를 드래그 중일 땐 null).
  // dragOver: 지금 마우스가 올라가 있는 대상과 위치({categoryId, zone}) - "빈 공간"이면 categoryId는 "root".
  const [draggingId, setDraggingId] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const openCategoryMenu = (e, categoryId) => {
    setContextMenu({ x: e.clientX, y: e.clientY, categoryId });
  };
  const openRootMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, categoryId: null });
  };
  const closeMenu = () => setContextMenu(null);

  // 메뉴가 열려 있을 때 바깥을 클릭하거나 Esc를 누르면 닫힘 (상태가 하나뿐이라 리스너도 하나만 붙음)
  useEffect(() => {
    if (!contextMenu) return;
    const handleOutsideClick = () => closeMenu();
    const handleEsc = (e) => { if (e.key === "Escape") closeMenu(); };
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [contextMenu]);

  const fetchCategories = async () => {
    try {
      const data = await getCategories(token);
      setCategories(data);
    } catch (error) {}
  };

  useEffect(() => { fetchCategories(); }, []);

  // 다른 페이지(예: HomePage 본문 영역의 우클릭 메뉴)에서 폴더를 새로 만들었을 때도
  // Sidebar가 독립적으로 카테고리 목록을 들고 있어서 자동 반영이 안 됨 - 아래
  // "studylog:posts-changed"와 같은 형제 컴포넌트 간 전역 이벤트 패턴으로 새로고침함
  useEffect(() => {
    const handleCategoriesChanged = () => fetchCategories();
    window.addEventListener("studylog:categories-changed", handleCategoriesChanged);
    return () => window.removeEventListener("studylog:categories-changed", handleCategoriesChanged);
  }, []);

  // 다른 페이지(예: 노트 목록)에서 드래그로 노트를 옮겼을 때, 그쪽에서 자기 목록을
  // 새로고침할 수 있도록 알려주는 전역 이벤트 - Sidebar와 페이지가 형제 컴포넌트라
  // props로 직접 콜백을 못 넘기기 때문에 이 방식을 씀
  const notifyPostsChanged = () => window.dispatchEvent(new Event("studylog:posts-changed"));

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
      alert(getErrorMessage(error, t("sidebar.addFolderFailed")));
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

  const handleChangeColor = async (categoryId, color) => {
    try {
      await updateCategoryColor(categoryId, color, token);
      fetchCategories();
    } catch (error) {}
  };

  // 우클릭 메뉴의 "글쓰기" - 그 폴더가 선택된 채로 글쓰기 페이지로 이동
  const handleWriteInFolder = (categoryId) => {
    navigate(`/posts/create?category=${categoryId}`);
  };

  const handleLogout = () => {
    logoutAction();
    // "/"로 보내면 로그아웃 상태에선 랜딩페이지가 뜨는데, 로그아웃 직후엔 바로
    // 로그인 화면으로 보내는 게 자연스러움 (세션 만료 시 재로그인 흐름과도 동일하게 맞춤)
    navigate("/login");
  };

  // ---- 드래그 앤 드롭 ----
  const handleDragStartItem = (categoryId) => setDraggingId(categoryId);
  const handleDragEndItem = () => {
    setDraggingId(null);
    setDragOver(null);
  };
  const handleDragOverItem = (categoryId, zone) => setDragOver({ categoryId, zone });

  // 폴더(또는 노트)를 특정 폴더 위에 놓았을 때 - targetCategory와 zone("before"|"after"|"into")
  const handleDropItem = async (e, targetCategory, zone) => {
    setDragOver(null);

    // 노트를 드래그해서 폴더 위에 놓은 경우 - 항상 그 폴더로 이동
    if (e.dataTransfer.types.includes(POST_DRAG_TYPE)) {
      const postId = e.dataTransfer.getData(POST_DRAG_TYPE);
      setDraggingId(null);
      if (!postId) return;
      try {
        await movePost(Number(postId), targetCategory.id, token);
        notifyPostsChanged();
      } catch (error) {
        alert(getErrorMessage(error, t("sidebar.moveFailed")));
      }
      return;
    }

    // 폴더를 드래그한 경우 - 순서 변경 또는 하위 폴더화
    const draggedId = draggingId;
    setDraggingId(null);
    if (draggedId == null || draggedId === targetCategory.id) return;

    const treeCopy = JSON.parse(JSON.stringify(categories));
    const draggedNode = findNodeById(treeCopy, draggedId);
    if (!draggedNode) return;

    if (draggedNode.id === targetCategory.id || isDescendant(draggedNode, targetCategory.id)) {
      alert(t("sidebar.moveIntoOwnSubfolder"));
      return;
    }

    removeNodeById(treeCopy, draggedId);

    if (zone === "into") {
      const targetNode = findNodeById(treeCopy, targetCategory.id);
      if (!targetNode) return;
      if (!targetNode.children) targetNode.children = [];
      targetNode.children.push(draggedNode);
    } else {
      const found = findSiblingsAndIndex(treeCopy, targetCategory.id);
      if (!found) return;
      const insertIndex = zone === "before" ? found.index : found.index + 1;
      found.siblings.splice(insertIndex, 0, draggedNode);
    }

    const flatItems = flattenForReorder(treeCopy);
    setCategories(treeCopy); // 낙관적 업데이트 - 서버 응답 기다리지 않고 바로 화면에 반영

    try {
      await reorderCategories(flatItems, token);
      fetchCategories(); // 서버 기준으로 다시 동기화
    } catch (error) {
      alert(getErrorMessage(error, t("sidebar.moveFailed")));
      fetchCategories(); // 실패했으면 서버의 실제 상태로 되돌림
    }
  };

  // 폴더 목록의 "빈 공간"에 놓았을 때 - 최상위(부모 없음) 맨 뒤로 이동
  const handleDropOnRoot = async (e) => {
    setDragOver(null);

    if (e.dataTransfer.types.includes(POST_DRAG_TYPE)) {
      // 빈 공간은 폴더가 아니라서 노트를 여기 놓는 건 의미가 없음(어느 폴더로도 안 옮김)
      setDraggingId(null);
      return;
    }

    const draggedId = draggingId;
    setDraggingId(null);
    if (draggedId == null) return;

    const treeCopy = JSON.parse(JSON.stringify(categories));
    const draggedNode = removeNodeById(treeCopy, draggedId);
    if (!draggedNode) return;
    treeCopy.push(draggedNode);

    const flatItems = flattenForReorder(treeCopy);
    setCategories(treeCopy);

    try {
      await reorderCategories(flatItems, token);
      fetchCategories();
    } catch (error) {
      alert(getErrorMessage(error, t("sidebar.moveFailed")));
      fetchCategories();
    }
  };

  const menuItems = [
    { label: t("sidebar.dashboard"), icon: <LayoutDashboard size={16} />, path: "/" },
    { label: t("sidebar.documents"), icon: <FileText size={16} />, path: "/documents" },
    { label: t("sidebar.aiQuiz"), icon: <BrainCircuit size={16} />, path: "/quiz" },
    { label: t("sidebar.todo"), icon: <ListTodo size={16} />, path: "/todos" },
  ];

  // 참고 이미지는 사이드바가 캔버스보다 한 톤 더 짙어서 영역이 뚜렷이 구분됨 -
  // 지금까진 캔버스랑 완전히 같은 톤(gray-50)이라 경계가 안 보였음
  return (
    <div className="sidebar-root w-full h-full bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      {/* 로고 */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {user?.profile_image
              ? <img src={user.profile_image} alt={user?.nickname} className="w-full h-full object-cover" />
              : (user?.nickname?.[0] || "S")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-serif font-bold text-gray-800 dark:text-gray-100 text-sm truncate">{t("common.appName")}</div>
            <div className="terminal-label text-xs text-gray-400 dark:text-gray-500">{t("sidebar.premiumPlan")}</div>
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
                ? "bg-blue-100 text-blue-600 dark:bg-transparent dark:text-gray-100 dark:font-semibold"
                : "text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/60 dark:hover:text-gray-200"}`}
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
        onContextMenu={(e) => openRootMenu(e)}
        onDragOver={(e) => {
          // CategoryItem 쪽 핸들러가 stopPropagation을 호출하므로, 여기까지 이벤트가
          // 올라온다는 건 실제 폴더 행이 아니라 트리의 빈 공간 위에 있다는 뜻
          e.preventDefault();
          setDragOver({ categoryId: "root", zone: null });
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleDropOnRoot(e);
        }}
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

        {/* 전체 보기 - 실제 폴더(CategoryItem)들과 아이콘 위치가 정확히 맞도록, 폴더들이 갖는
            펼치기 화살표 자리(w-3)만큼 빈 공백을 앞에 둠. 그래야 화살표가 있는 폴더든 없는
            "전체보기"든 아이콘이 전부 같은 x 위치에서 시작해서 같은 레벨로 보임.
            "기본" 폴더는 이제 하드코딩된 UI가 아니라 서버가 관리하는 진짜 카테고리라
            아래 categories.map()에서 다른 폴더들과 완전히 동일하게 렌더링됨(이름변경/삭제 다 가능) */}
        <button
          onClick={() => onSelectCategory?.(null)}
          className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm mb-0.5 transition-colors
            ${selectedCategoryId === null
              ? "bg-blue-100 text-blue-600 font-medium dark:bg-transparent dark:text-gray-100 dark:font-semibold"
              : "text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700/60"}`}
        >
          <span className="w-3 shrink-0" />
          <ClipboardList size={14} className="shrink-0" />
          <span>{t("sidebar.allNotes")}</span>
        </button>

        {/* 전체 폴더보기 - 내가 만든 모든 폴더를 트리 깊이와 상관없이 한 페이지에서 한눈에 보는 화면.
            카테고리 선택이 아니라 별도 페이지 이동이라 onSelectCategory 대신 navigate 사용 */}
        <button
          onClick={() => navigate("/folders")}
          className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm mb-0.5 transition-colors
            ${location.pathname === "/folders"
              ? "bg-blue-100 text-blue-600 font-medium dark:bg-transparent dark:text-gray-100 dark:font-semibold"
              : "text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700/60"}`}
        >
          <span className="w-3 shrink-0" />
          <FolderTree size={14} className="shrink-0" />
          <span>{t("sidebar.allFolders")}</span>
        </button>

        {/* 빈 공간 우클릭 메뉴 - 새 폴더 추가만 제공 */}
        {contextMenu && contextMenu.categoryId === null && (
          <div
            className="fixed z-50 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setIsAdding(true); closeMenu(); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
            >
              <FolderPlus size={14} className="shrink-0" /> {t("sidebar.newFolder")}
            </button>
          </div>
        )}

        {/* 실제 폴더들 ("기본" 포함) - 전부 독립적인 최상위 폴더(depth 0)로 표시.
            드래그 앤 드롭으로 순서 변경 / 하위 폴더화 / 노트 이동이 가능함 */}
        <div className={dragOver?.categoryId === "root" ? "ring-2 ring-inset ring-blue-300 rounded-lg" : ""}>
          {categories.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              depth={0}
              indentOffset={0}
              selectedCategoryId={selectedCategoryId}
              onSelect={(id) => onSelectCategory?.(id)}
              onAdd={handleAddChild}
              onDelete={handleDelete}
              onRename={handleRename}
              onWrite={handleWriteInFolder}
              onChangeColor={handleChangeColor}
              contextMenu={contextMenu}
              onOpenMenu={openCategoryMenu}
              onCloseMenu={closeMenu}
              draggingId={draggingId}
              onDragStartItem={handleDragStartItem}
              onDragEndItem={handleDragEndItem}
              dragOver={dragOver}
              onDragOverItem={handleDragOverItem}
              onDropItem={handleDropItem}
            />
          ))}
        </div>

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
                className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/60">{t("sidebar.cancel")}</button>
            </div>
          </div>
        )}
      </div>

      {/* 하단 메뉴 */}
      <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-3">
        {user?.is_admin && (
          <button
            onClick={() => navigate("/admin-dashboard")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors
              ${location.pathname === "/admin-dashboard"
                ? "bg-blue-100 text-blue-600 font-medium dark:bg-transparent dark:text-gray-100 dark:font-semibold"
                : "text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700/60"}`}
          >
            <ShieldCheck size={16} /> {t("sidebar.adminDashboard")}
          </button>
        )}
        <button
          onClick={() => navigate("/contact")}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors
            ${location.pathname === "/contact"
              ? "bg-blue-100 text-blue-600 font-medium dark:bg-transparent dark:text-gray-100 dark:font-semibold"
              : "text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700/60"}`}
        >
          <Mail size={16} /> {t("sidebar.contact")}
        </button>
        <button
          onClick={() => navigate("/settings")}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors
            ${location.pathname === "/settings"
              ? "bg-blue-100 text-blue-600 font-medium dark:bg-transparent dark:text-gray-100 dark:font-semibold"
              : "text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700/60"}`}
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
