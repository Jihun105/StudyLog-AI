import { useState } from "react";
import { X } from "lucide-react";

// 태그를 ,로 구분해서 한 번에 입력하던 방식 대신, 하나씩 입력하고 Enter를 눌러서
// 태그 칩으로 추가하는 방식. 빈 입력창에서 Backspace를 누르면 마지막 태그가 지워짐
// (일반적인 태그 입력 UX와 동일). tags/onChange는 부모가 배열 상태로 직접 관리함
function TagInput({ tags, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const value = draft.trim();
    if (!value) return;
    if (!tags.includes(value)) onChange([...tags, value]);
    setDraft("");
  };

  const removeTag = (tag) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !draft && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="w-full flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 rounded-lg px-3 py-2 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full shrink-0"
        >
          # {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] bg-transparent outline-none"
      />
    </div>
  );
}

export default TagInput;
