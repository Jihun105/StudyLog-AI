import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getCategories, createCategory, deleteCategory, renameCategory } from "../api/categories";

// 카테고리 항목 하나를 렌더링하는 재귀 컴포넌트
function CategoryItem({ category, depth, selectedCategoryId, onSelect, onAdd, onDelete, onRename }) {
  const [isOpen, setIsOpen] = useState(true);   // 폴더 열기/닫기
  const [isRenaming, setIsRenaming] = useState(false);  // 이름 수정 모드
  const [renameValue, setRenameValue] = useState(category.name);

  const isSelected = selectedCategoryId === category.id;
  const hasChildren = category.children && category.children.length > 0;
  const canAddChild = depth < 3;  // 3단계까지만 허용

  const handleRenameSubmit = () => {
    if (renameValue.trim()) {
      onRename(category.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  return (
    <div>
      <div
        className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer group
          ${isSelected ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 text-gray-700"}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}  // 깊이에 따라 들여쓰기
      >
        {/* 폴더 아이콘 + 이름 */}
        <div className="flex items-center gap-1 flex-1 min-w-0" onClick={() => onSelect(category.id)}>
          {/* 하위 폴더가 있으면 열기/닫기 화살표 표시 */}
          <span
            className="text-gray-400 text-xs w-3"
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          >
            {hasChildren ? (isOpen ? "▼" : "▶") : ""}
          </span>
          <span className="text-sm">📁</span>

          {/* 이름 수정 모드 */}
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => { if (e.key === "Enter") handleRenameSubmit(); if (e.key === "Escape") setIsRenaming(false); }}
              className="text-sm border border-blue-300 rounded px-1 w-full"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm truncate">{category.name}</span>
          )}
        </div>

        {/* 호버 시 나타나는 버튼들 */}
        <div className="hidden group-hover:flex items-center gap-1">
          {/* 하위 폴더 추가 버튼 (3단계 미만일 때만) */}
          {canAddChild && (
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(category.id); }}
              className="text-gray-400 hover:text-blue-500 text-xs px-1"
              title="하위 폴더 추가"
            >
              +
            </button>
          )}
          {/* 이름 수정 버튼 */}
          <button
            onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}
            className="text-gray-400 hover:text-yellow-500 text-xs px-1"
            title="이름 수정"
          >
            ✏️
          </button>
          {/* 삭제 버튼 */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(category.id); }}
            className="text-gray-400 hover:text-red-500 text-xs px-1"
            title="삭제"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 하위 카테고리 재귀 렌더링 */}
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

// 사이드바 전체 컴포넌트
function Sidebar({ selectedCategoryId, onSelectCategory }) {
  const { token } = useAuth();
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAdding, setIsAdding] = useState(false);  // 최상위 폴더 추가 입력창 표시 여부

  // 카테고리 목록 불러오기
  const fetchCategories = async () => {
    try {
      const data = await getCategories(token);
      setCategories(data);
    } catch (error) {
      console.error("카테고리 불러오기 실패", error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 최상위 폴더 추가
  const handleAddRoot = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory(newCategoryName.trim(), null, token);
      setNewCategoryName("");
      setIsAdding(false);
      fetchCategories();
    } catch (error) {
      console.error("카테고리 추가 실패", error);
    }
  };

  // 하위 폴더 추가
  const handleAddChild = async (parentId) => {
    const name = prompt("새 폴더 이름을 입력하세요:");
    if (!name || !name.trim()) return;
    try {
      await createCategory(name.trim(), parentId, token);
      fetchCategories();
    } catch (error) {
      alert(error.response?.data?.detail || "폴더 추가에 실패했습니다.");
    }
  };

  // 카테고리 삭제
  const handleDelete = async (categoryId) => {
    if (!window.confirm("폴더를 삭제하면 하위 폴더도 모두 삭제됩니다. 계속할까요?")) return;
    try {
      await deleteCategory(categoryId, token);
      // 삭제된 카테고리가 선택된 상태면 선택 해제
      if (selectedCategoryId === categoryId) onSelectCategory(null);
      fetchCategories();
    } catch (error) {
      console.error("카테고리 삭제 실패", error);
    }
  };

  // 카테고리 이름 수정
  const handleRename = async (categoryId, name) => {
    try {
      await renameCategory(categoryId, name, token);
      fetchCategories();
    } catch (error) {
      console.error("카테고리 이름 수정 실패", error);
    }
  };

  return (
    <div className="w-56 shrink-0 bg-gray-50 border-r border-gray-200 min-h-screen px-2 py-4">
      <div className="flex items-center justify-between mb-3 px-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">카테고리</span>
        {/* 최상위 폴더 추가 버튼 */}
        <button
          onClick={() => setIsAdding(true)}
          className="text-gray-400 hover:text-blue-500 text-lg leading-none"
          title="폴더 추가"
        >
          +
        </button>
      </div>

      {/* 전체 보기 (카테고리 선택 해제) */}
      <div
        onClick={() => onSelectCategory(null)}
        className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm mb-1
          ${selectedCategoryId === null ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 text-gray-700"}`}
      >
        📋 전체 보기
      </div>

      {/* 기본 폴더 (미분류) */}
      <div
        onClick={() => onSelectCategory(-1)}
        className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm mb-2
          ${selectedCategoryId === -1 ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 text-gray-700"}`}
      >
        📁 기본 (미분류)
      </div>

      {/* 카테고리 트리 */}
      {categories.map((category) => (
        <CategoryItem
          key={category.id}
          category={category}
          depth={1}
          selectedCategoryId={selectedCategoryId}
          onSelect={onSelectCategory}
          onAdd={handleAddChild}
          onDelete={handleDelete}
          onRename={handleRename}
        />
      ))}

      {/* 최상위 폴더 추가 입력창 */}
      {isAdding && (
        <div className="mt-2 px-2">
          <input
            autoFocus
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddRoot(); if (e.key === "Escape") setIsAdding(false); }}
            placeholder="폴더 이름"
            className="w-full text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none"
          />
          <div className="flex gap-1 mt-1">
            <button onClick={handleAddRoot} className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">추가</button>
            <button onClick={() => setIsAdding(false)} className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-100">취소</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;