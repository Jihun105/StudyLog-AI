import { useState, useRef, useEffect } from "react";
import { Folder, ChevronDown, Check } from "lucide-react";

// 브라우저 기본 <select>는 옵션 목록에 Tailwind 스타일이 전혀 먹지 않아서(OS가 렌더링)
// 다크모드에서 특히 못생기게 나옴 -> 폴더 트리를 예쁘게 보여주는 커스텀 드롭다운으로 대체
function CategorySelect({ categories, value, onChange, placeholder, className = "" }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const selected = categories.find((cat) => cat.id === value);

  return (
    <div className={`relative inline-block ${className}`} ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Folder size={14} className="text-amber-500 shrink-0" />
        <span className="truncate max-w-[180px]">{selected ? selected.name : placeholder}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 mt-1.5 w-64 max-h-72 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg p-1.5">
          {categories.map((cat) => {
            const isSelected = cat.id === value;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onChange(cat.id);
                  setOpen(false);
                }}
                style={{ paddingLeft: `${cat.depth * 14 + 10}px` }}
                className={`w-full flex items-center gap-2 text-sm rounded-lg py-1.5 pr-2.5 text-left transition-colors ${
                  isSelected
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                <Folder size={13} className={`shrink-0 ${isSelected ? "text-white" : "text-amber-500"}`} />
                <span className="truncate">{cat.name}</span>
                {isSelected && <Check size={13} className="ml-auto shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CategorySelect;
