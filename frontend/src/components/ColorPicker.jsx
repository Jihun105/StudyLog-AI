// 폴더 색상, 일정(Event) 색상 등 앱 여러 곳에서 재사용하는 고정 8색 팔레트.
// Tailwind는 클래스명을 정적으로 스캔해서 CSS를 생성하기 때문에, 색상 키에 따라
// `bg-${key}-100` 처럼 클래스명을 동적으로 조합하면 빌드에 안 잡혀서 실제로 적용되지
// 않음 - 그래서 8가지 색 조합을 전부 미리 문자열로 나열해둠 (TodoPage.jsx의 일정
// CATEGORY_COLORS와 같은 톤의 팔레트를 씀)
export const COLOR_PALETTE = [
  { key: "blue", dot: "bg-blue-500", tile: "bg-blue-100 dark:bg-blue-500/20", tileHover: "group-hover:bg-blue-200 dark:group-hover:bg-blue-500/30", text: "text-blue-700 dark:text-blue-300" },
  { key: "purple", dot: "bg-purple-500", tile: "bg-purple-100 dark:bg-purple-500/20", tileHover: "group-hover:bg-purple-200 dark:group-hover:bg-purple-500/30", text: "text-purple-700 dark:text-purple-300" },
  { key: "emerald", dot: "bg-emerald-500", tile: "bg-emerald-100 dark:bg-emerald-500/20", tileHover: "group-hover:bg-emerald-200 dark:group-hover:bg-emerald-500/30", text: "text-emerald-700 dark:text-emerald-300" },
  { key: "amber", dot: "bg-amber-500", tile: "bg-amber-100 dark:bg-amber-500/20", tileHover: "group-hover:bg-amber-200 dark:group-hover:bg-amber-500/30", text: "text-amber-700 dark:text-amber-300" },
  { key: "rose", dot: "bg-rose-500", tile: "bg-rose-100 dark:bg-rose-500/20", tileHover: "group-hover:bg-rose-200 dark:group-hover:bg-rose-500/30", text: "text-rose-700 dark:text-rose-300" },
  { key: "teal", dot: "bg-teal-500", tile: "bg-teal-100 dark:bg-teal-500/20", tileHover: "group-hover:bg-teal-200 dark:group-hover:bg-teal-500/30", text: "text-teal-700 dark:text-teal-300" },
  { key: "indigo", dot: "bg-indigo-500", tile: "bg-indigo-100 dark:bg-indigo-500/20", tileHover: "group-hover:bg-indigo-200 dark:group-hover:bg-indigo-500/30", text: "text-indigo-700 dark:text-indigo-300" },
  { key: "pink", dot: "bg-pink-500", tile: "bg-pink-100 dark:bg-pink-500/20", tileHover: "group-hover:bg-pink-200 dark:group-hover:bg-pink-500/30", text: "text-pink-700 dark:text-pink-300" },
];

// 색상이 지정 안 된(null/undefined) 경우를 위한 기본(회색) 톤 - FolderTile 등에서
// COLOR_PALETTE에서 못 찾았을 때 이 값으로 대체함
export const DEFAULT_FOLDER_TONE = {
  key: null,
  tile: "bg-gray-100 dark:bg-gray-800",
  tileHover: "group-hover:bg-gray-200 dark:group-hover:bg-gray-700",
  text: "text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400",
};

export function colorByKey(key) {
  return COLOR_PALETTE.find((c) => c.key === key) || null;
}

// 색상 점(dot)들을 나열한 선택기 - 우클릭 메뉴 등 작은 팝오버 안에 넣기 좋게 flex-wrap.
// 맨 앞에 "색상 없음"(초기화) 옵션을 X 표시로 하나 더 넣어줌
function ColorDotPicker({ value, onChange, className = "" }) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <button
        type="button"
        onClick={() => onChange(null)}
        title="색상 없음"
        className={`w-6 h-6 rounded-full shrink-0 border-2 border-dashed border-gray-300 dark:border-gray-500 flex items-center justify-center text-gray-400 dark:text-gray-500 text-[10px] transition-transform hover:scale-110 ${
          !value ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800" : ""
        }`}
      >
        ×
      </button>
      {COLOR_PALETTE.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onChange(c.key)}
          className={`w-6 h-6 rounded-full shrink-0 ${c.dot} transition-transform hover:scale-110 ${
            value === c.key ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800" : ""
          }`}
        />
      ))}
    </div>
  );
}

export default ColorDotPicker;
