import { useState, useEffect, useRef, useMemo, useContext } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getTodos, createTodo, updateTodo, toggleTodo, deleteTodo, reorderTodos } from "../api/todos";
import { getEvents, createEvent, updateEvent, deleteEvent } from "../api/events";
import SidebarLayout, { SidebarSpacer, SidebarCollapsedContext } from "../components/SidebarLayout";
import ResizableRightPanel from "../components/ResizableRightPanel";
import TimePicker from "../components/TimePicker";
import {
  ListTodo, Plus, Trash2, GripVertical, Pencil, CheckCircle2, Circle, Calendar, X, Check,
  List, ChevronLeft, ChevronRight, ChevronDown, CalendarDays, Flag, Clock, ClipboardList,
} from "lucide-react";

const PRIORITIES = [
  { value: "low", labelKey: "todo.priorityLow", dot: "bg-gray-400 dark:bg-gray-500", text: "text-gray-500 dark:text-gray-400" },
  { value: "medium", labelKey: "todo.priorityMedium", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  { value: "high", labelKey: "todo.priorityHigh", dot: "bg-red-500", text: "text-red-600 dark:text-red-400" },
];

const WEEKDAY_LABELS = {
  ko: ["일", "월", "화", "수", "목", "금", "토"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

function priorityMeta(value) {
  return PRIORITIES.find((p) => p.value === value) || PRIORITIES[1];
}

// 플랜 카테고리는 우선순위처럼 정해진 값이 아니라 사용자가 자유롭게 입력하는 문자열이라,
// 고정된 색을 미리 매핑해둘 수 없음. 대신 문자열 자체를 해시해서 정해진 팔레트 중 하나를
// 항상 같은 색으로 고르게 함 - 같은 카테고리 이름은 새로고침해도 항상 같은 색으로 보임
const CATEGORY_COLORS = [
  { key: "blue", dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
  { key: "purple", dot: "bg-purple-500", text: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10" },
  { key: "emerald", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  { key: "amber", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
  { key: "rose", dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10" },
  { key: "teal", dot: "bg-teal-500", text: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-500/10" },
  { key: "indigo", dot: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  { key: "pink", dot: "bg-pink-500", text: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-500/10" },
];

function categoryMeta(category) {
  if (!category) return CATEGORY_COLORS[0];
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

// 일정(Event)은 플랜 카테고리와 달리 자유 입력이 아니라, 고정된 팔레트 중 하나를 사용자가
// 직접 색으로 골라서 저장함(카테고리 문자열 대신 "blue" 같은 색상 키가 category 컬럼에 들어감)
function colorByKey(key) {
  return CATEGORY_COLORS.find((c) => c.key === key) || CATEGORY_COLORS[0];
}

// 일정 추가/수정 폼에서 쓰는 색상 선택기 - 팔레트의 점(dot)들을 나열해서 클릭 한 번으로 고르게 함
function ColorPicker({ value, onChange, className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {CATEGORY_COLORS.map((c) => (
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

// 카테고리 입력란 - 직접 타이핑도 되고, 이미 썼던 카테고리 목록에서 골라 쓸 수도 있는
// 자동완성 콤보박스. 우선순위 드롭다운(PriorityDropdown)과 동일하게 위치를 fixed로 계산해서
// 스크롤 영역 안에 있어도 메뉴가 잘리지 않게 함
function CategoryCombobox({ value, onChange, options, placeholder, className = "" }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = () => setOpen(false);
    const handleEsc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const filtered = options.filter((opt) => !value || opt.toLowerCase().includes(value.toLowerCase()));

  const handleFocus = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setOpen(true);
  };

  return (
    <div className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        placeholder={placeholder}
        className="w-full text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && menuPos && filtered.length > 0 && (
        <div
          className="fixed z-[60] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto"
          style={{ top: menuPos.top, left: menuPos.left, minWidth: Math.max(menuPos.width, 140) }}
        >
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700/60"
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${categoryMeta(opt).dot}`} />
              <span className="truncate text-gray-700 dark:text-gray-200">{opt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 네이티브 <select>는 닫혀 있을 땐 스타일을 줄 수 있어도, 펼쳤을 때 나오는 목록은
// 브라우저가 그려서 앱 디자인과 안 어울리고 예쁘게 꾸밀 수도 없었음. 그래서 우선순위
// 선택만큼은 직접 그리는 드롭다운으로 바꿔서, 닫혀있을 때도 깃발 아이콘 + 색 점으로
// "이게 우선순위를 고르는 컨트롤이다"라는 걸 명확히 보여주고, 펼친 목록도 앱 스타일 그대로 유지함
function PriorityDropdown({ value, onChange, className = "" }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // 캘린더 뷰의 날짜별 사이드 패널처럼 스크롤 컨테이너(overflow-y-auto) 맨 아래에 붙어있는
  // 경우, absolute + top-full로 열면 메뉴가 스크롤 영역 바깥으로 잘려서 안 보이는 문제가 있었음.
  // position: fixed로 바꾸고 버튼의 실제 화면 좌표(getBoundingClientRect)를 계산해서 그
  // 좌표에 그리면, 어떤 스크롤/overflow 컨테이너 안에 있든 안 잘리고 항상 보임
  // (Sidebar.jsx의 우클릭 메뉴와 동일한 방식)
  const [menuPos, setMenuPos] = useState(null);
  const meta = priorityMeta(value);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = () => setOpen(false);
    const handleEsc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const handleToggle = (e) => {
    if (!open) {
      const rect = e.currentTarget.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen((prev) => !prev);
  };

  return (
    <div className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-1.5 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 rounded-lg pl-2.5 pr-2 py-1.5 hover:border-gray-300 dark:hover:border-gray-500 focus:outline-none"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <Flag size={12} className={`shrink-0 ${meta.text}`} />
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
          <span className={`truncate ${meta.text}`}>{t(meta.labelKey)}</span>
        </span>
        <ChevronDown size={12} className="text-gray-400 dark:text-gray-500 shrink-0" />
      </button>

      {open && menuPos && (
        <div
          className="fixed z-[60] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg py-1"
          style={{ top: menuPos.top, left: menuPos.left, minWidth: Math.max(menuPos.width, 128) }}
        >
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => { onChange(p.value); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700/60 ${
                value === p.value ? "bg-blue-50 dark:bg-blue-500/10" : ""
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.dot}`} />
              <span className={p.text}>{t(p.labelKey)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// "YYYY-MM-DD" 문자열을 로컬 자정 기준 Date로 변환 (new Date(str)는 UTC로 해석돼서 하루 밀릴 수 있음)
function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// 일정 카드에 쓰는 짧은 날짜 표기 (요일 없이 "7월 8일" / "Jul 8" 형태)
function formatEventDate(dateStr, lang) {
  return new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", {
    month: "long",
    day: "numeric",
  }).format(parseLocalDate(dateStr));
}

function isOverdue(todo) {
  if (!todo.due_date || todo.is_done) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseLocalDate(todo.due_date) < today;
}

function formatDateStr(year, month, day) {
  const d = new Date(year, month, day);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// "YYYY-MM-DD" -> "MM-DD" (좁은 패널에서 마감일 배지를 짧게 표시)
function formatDueDateShort(dateStr) {
  const parts = dateStr.split("-");
  return `${parts[1]}-${parts[2]}`;
}

// "YYYY-MM-DD"에 며칠을 더하거나 뺌 (타임테이블 날짜 이동에 사용)
function addDaysToDateStr(dateStr, delta) {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + delta);
  return formatDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

// 타임테이블에 표시할 시간대 - 오전 5시부터 다음날 새벽 2시까지(밤 늦게까지 활동하는
// 사람도 고려). 0시/1시는 실제로는 다음 날이지만, "그 날의 늦은 밤"으로 보고 같은
// 날짜(due_date) 안에서 맨 아래에 이어서 보여줌
const TIMETABLE_HOURS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1];

function formatTimetableHourLabel(hour, lang) {
  if (lang === "ko") {
    if (hour === 0) return "오전 12시";
    if (hour < 12) return `오전 ${hour}시`;
    if (hour === 12) return "오후 12시";
    return `오후 ${hour - 12}시`;
  }
  const period = hour < 12 ? "AM" : "PM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12} ${period}`;
}

function todayDateString() {
  const now = new Date();
  return formatDateStr(now.getFullYear(), now.getMonth(), now.getDate());
}

// 월 달력 그리드 셀 생성 - 7의 배수를 맞추기 위해 앞뒤 달 날짜로 채움
function buildCalendarCells(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    cells.push({ day, currentMonth: false, dateStr: formatDateStr(year, month - 1, day) });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, currentMonth: true, dateStr: formatDateStr(year, month, day) });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay, currentMonth: false, dateStr: formatDateStr(year, month + 1, nextDay) });
    nextDay += 1;
  }
  return cells;
}

// 두 "YYYY-MM-DD" 사이의 날짜 차이(일 수)
function daysBetween(fromStr, toStr) {
  const from = parseLocalDate(fromStr);
  const to = parseLocalDate(toStr);
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

// 한 주(7일)에 걸쳐 보여줄 일정 막대(bar) 구간을 계산 - 일정이 이 주의 범위를 벗어나면
// 주의 시작/끝에 맞춰 자르고(continuesLeft/Right로 표시), 몇 번째 칸부터 몇 번째 칸까지인지
// (startCol~endCol, 0=일요일)와 세로로 겹치지 않게 배정된 레인(lane)을 함께 반환
function computeWeekSegments(week, events, lanes) {
  const weekStart = week[0].dateStr;
  const weekEnd = week[6].dateStr;
  const segments = [];
  events.forEach((ev) => {
    if (ev.end_date < weekStart || ev.start_date > weekEnd) return;
    const segStart = ev.start_date < weekStart ? weekStart : ev.start_date;
    const segEnd = ev.end_date > weekEnd ? weekEnd : ev.end_date;
    segments.push({
      event: ev,
      startCol: daysBetween(weekStart, segStart),
      endCol: daysBetween(weekStart, segEnd),
      lane: lanes[ev.id] ?? 0,
      continuesLeft: ev.start_date < weekStart,
      continuesRight: ev.end_date > weekEnd,
    });
  });
  return segments;
}

// 할 일 한 줄 (보기 모드 / 인라인 수정 모드) - 목록 보기와 달력 사이드 패널에서 공용으로 사용
// 토글로 펼치면 시작 시간 / 메모 같은 세부 내용을 입력할 수 있음
function TodoRow({
  todo, editing, editTitle, editDueDate, editPriority, editCategory,
  setEditTitle, setEditDueDate, setEditPriority, setEditCategory,
  onToggle, onDelete, onStartEdit, onCancelEdit, onSaveEdit, onSaveDetails, onPostpone,
  draggable, onDragStart, onDragOver, onDrop, overdue, t, compact = false, hideDate = false,
  // planMode: 플랜 보기 전용 - 마감일/우선순위/시간선택/미루기를 전부 빼고
  // 제목 · 세부사항(토글) · 메모 · 카테고리만 남기는 단순한 형태로 표시
  planMode = false, categoryOptions = [],
}) {
  const meta = priorityMeta(todo.priority);
  const [detailOpen, setDetailOpen] = useState(false);
  const [postponeOpen, setPostponeOpen] = useState(false);
  const [draftStartTime, setDraftStartTime] = useState(todo.start_time || "");
  const [draftEndTime, setDraftEndTime] = useState(todo.end_time || "");
  const [draftMemo, setDraftMemo] = useState(todo.memo || "");
  // 저장 버튼을 잠깐 초록색으로 바꿔서 "저장 완료"임을 눈에 띄게 보여줌
  const [justSaved, setJustSaved] = useState(false);
  const savedTimeoutRef = useRef(null);
  const hasDetail = planMode ? Boolean(todo.memo) : Boolean(todo.start_time || todo.memo);

  useEffect(() => () => { if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current); }, []);

  const toggleDetail = () => {
    if (!detailOpen) {
      // 펼칠 때는 현재 저장된 값으로 다시 맞춰서 편집 시작
      setDraftStartTime(todo.start_time || "");
      setDraftEndTime(todo.end_time || "");
      setDraftMemo(todo.memo || "");
    }
    setDetailOpen((prev) => !prev);
  };

  const handleDraftStartTimeChange = (value) => {
    setJustSaved(false);
    setDraftStartTime(value);
  };

  const handleDraftEndTimeChange = (value) => {
    setJustSaved(false);
    setDraftEndTime(value);
  };

  const handleDraftMemoChange = (e) => {
    setJustSaved(false);
    setDraftMemo(e.target.value);
  };

  const handleSaveDetail = async () => {
    // 종료 시간을 안 넣었으면 null로 보내고, 백엔드가 시작 시간+1시간으로 채워줌
    const success = await onSaveDetails(draftStartTime || null, draftEndTime || null, draftMemo.trim() || null);
    if (success) {
      setJustSaved(true);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = setTimeout(() => setJustSaved(false), 1500);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 ${todo.is_done ? "opacity-60" : ""}`}>
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="group flex items-center gap-3 px-4 py-3"
      >
        {draggable ? (
          <GripVertical size={14} className="text-gray-300 dark:text-gray-600 cursor-grab shrink-0" />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        <button onClick={onToggle} className="shrink-0">
          {todo.is_done
            ? <CheckCircle2 size={20} className="text-blue-600 dark:text-blue-400" />
            : <Circle size={20} className="text-gray-300 dark:text-gray-600" />}
        </button>

        {editing ? (
          <div className="flex-1 flex items-center gap-2 flex-wrap">
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              className="flex-1 min-w-[160px] text-sm border border-blue-300 dark:border-blue-500 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1 focus:outline-none"
            />
            {/* 마감일은 플랜에서도 선택적으로 넣을 수 있게 함 - 넣으면 그 날짜의 목록/달력
                보기로 넘어가고, 비워두면(플랜에서 원래 하던 대로) 계속 플랜에 남음 */}
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              title={planMode ? t("todo.optionalDueDate") : undefined}
              className="text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1 focus:outline-none"
            />
            {!planMode && <PriorityDropdown value={editPriority} onChange={setEditPriority} />}
            {planMode && (
              <CategoryCombobox
                value={editCategory}
                onChange={setEditCategory}
                options={categoryOptions}
                placeholder={t("todo.categoryPlaceholder")}
                className="w-36"
              />
            )}
            <button onClick={onSaveEdit} className="text-green-600 dark:text-green-400 p-1" title={t("common.save")}>
              <Check size={16} />
            </button>
            <button onClick={onCancelEdit} className="text-gray-400 dark:text-gray-500 p-1" title={t("common.cancel")}>
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
            <span className={`text-sm truncate ${todo.is_done ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-800 dark:text-gray-100"}`}>
              {todo.title}
            </span>
            {!planMode && (
              compact ? (
                <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} title={t(meta.labelKey)} />
              ) : (
                <span className={`flex items-center gap-1 text-xs shrink-0 ${meta.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  {t(meta.labelKey)}
                </span>
              )
            )}
            {planMode && todo.category && (
              <span
                className={`flex items-center gap-1 text-xs shrink-0 px-1.5 py-0.5 rounded-full ${categoryMeta(todo.category).bg} ${categoryMeta(todo.category).text}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${categoryMeta(todo.category).dot}`} />
                <span className="truncate max-w-[120px]">{todo.category}</span>
              </span>
            )}
            {/* 세부사항(시작 시간/메모) 펼치기 - 우선순위 바로 옆에 둬서 눈에 잘 띄게 함 */}
            <button
              onClick={toggleDetail}
              title={t("todo.detailToggle")}
              className={`flex items-center gap-0.5 text-xs shrink-0 ${
                hasDetail ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
              } hover:text-blue-600 dark:hover:text-blue-300`}
            >
              {!compact && t("todo.detailLabel")}
              <ChevronDown size={13} className={`transition-transform ${detailOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        )}

        {/* 마감일은 항상 행의 오른쪽 끝(수정/삭제 아이콘 바로 앞)에 정렬 - 단, 달력 페이지의
            날짜별 패널처럼 이미 어떤 날짜인지 위에 표시되어 있는 목록에서는 중복이라 숨김 */}
        {!editing && !hideDate && todo.due_date && (
          <span className={`flex items-center gap-1 text-xs shrink-0 ${overdue ? "text-red-500 dark:text-red-400" : "text-gray-400 dark:text-gray-500"}`}>
            {!compact && <Calendar size={12} />}
            {compact ? formatDueDateShort(todo.due_date) : todo.due_date}
          </span>
        )}

        {!editing && (
          <div className="hidden group-hover:flex items-center gap-1 shrink-0">
            <button onClick={onStartEdit} className="text-gray-300 hover:text-blue-500 dark:text-gray-600 dark:hover:text-blue-400 p-1" title={t("common.edit")}>
              <Pencil size={14} />
            </button>
            <button onClick={onDelete} className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 p-1" title={t("common.delete")}>
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {detailOpen && !editing && (
        <div className="px-4 pb-3 pt-0 flex flex-col gap-2 border-t border-gray-50 dark:border-gray-700/60 mt-0.5">
          {!planMode && (
            <div className="flex items-center gap-2 pt-3">
              <TimePicker value={draftStartTime} onChange={handleDraftStartTimeChange} />
              <span className="text-xs text-gray-400 dark:text-gray-500">~</span>
              <TimePicker value={draftEndTime} onChange={handleDraftEndTimeChange} placeholder={t("todo.endTimeOptional")} />
            </div>
          )}
          <textarea
            value={draftMemo}
            onChange={handleDraftMemoChange}
            rows={2}
            placeholder={t("todo.memoPlaceholder")}
            className={`w-full text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${planMode ? "mt-3" : ""}`}
          />
          <div className={`flex items-center gap-2 ${planMode ? "justify-end" : "justify-between"}`}>
            {!planMode && (
              postponeOpen ? (
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    autoFocus
                    onChange={(e) => {
                      if (e.target.value) onPostpone(e.target.value);
                      setPostponeOpen(false);
                    }}
                    className="text-xs border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setPostponeOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPostponeOpen(true)}
                  className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                >
                  <Calendar size={12} /> {t("todo.postpone")}
                </button>
              )
            )}
            <button
              onClick={handleSaveDetail}
              className={`flex items-center gap-1 text-xs text-white font-medium px-3 py-1.5 rounded-lg transition-colors ${
                justSaved ? "bg-green-600 hover:bg-green-600" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <Check size={12} /> {justSaved ? t("common.saved") : t("common.save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 일정(Event) 한 줄 (보기 모드 / 인라인 수정 모드) - 달력 사이드 패널 전용.
// 할 일과 달리 체크박스가 없고, 우선순위 대신 색상을 고르며, 등록 후에는 세부사항(메모)
// 토글을 펼쳐서 나중에 내용을 추가할 수 있음(TodoRow의 세부사항 토글과 같은 패턴)
function EventRow({
  event, editing, editTitle, editStart, editEnd, editColor,
  setEditTitle, setEditStart, setEditEnd, setEditColor,
  onStartEdit, onCancelEdit, onSaveEdit, onDelete, onSaveMemo, t, i18n,
}) {
  const meta = colorByKey(event.category);
  const [detailOpen, setDetailOpen] = useState(false);
  const [draftMemo, setDraftMemo] = useState(event.memo || "");
  const [justSaved, setJustSaved] = useState(false);
  const savedTimeoutRef = useRef(null);

  useEffect(() => () => { if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current); }, []);

  const toggleDetail = () => {
    if (!detailOpen) setDraftMemo(event.memo || "");
    setDetailOpen((prev) => !prev);
  };

  const handleDraftMemoChange = (e) => {
    setJustSaved(false);
    setDraftMemo(e.target.value);
  };

  const handleSaveMemo = async () => {
    const success = await onSaveMemo(draftMemo.trim() || null);
    if (success) {
      setJustSaved(true);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = setTimeout(() => setJustSaved(false), 1500);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={editStart}
            onChange={(e) => setEditStart(e.target.value)}
            className="flex-1 min-w-0 text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400 text-xs shrink-0">–</span>
          <input
            type="date"
            value={editEnd}
            onChange={(e) => setEditEnd(e.target.value)}
            min={editStart}
            title={t("todo.eventEndDateLabel")}
            className="flex-1 min-w-0 text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <ColorPicker value={editColor} onChange={setEditColor} />
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onCancelEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60"
          >
            <X size={14} />
          </button>
          <button
            onClick={onSaveEdit}
            className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
          >
            <Check size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="group flex items-center gap-2 px-2.5 py-2">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-800 dark:text-gray-100 truncate">{event.title}</div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500">
            {event.start_date === event.end_date
              ? formatEventDate(event.start_date, i18n.language)
              : `${formatEventDate(event.start_date, i18n.language)} – ${formatEventDate(event.end_date, i18n.language)}`}
          </div>
        </div>
        {/* 세부사항(메모) 펼치기 - 일정을 등록한 다음에 여기서 내용을 추가할 수 있음 */}
        <button
          onClick={toggleDetail}
          title={t("todo.detailToggle")}
          className={`flex items-center gap-0.5 text-xs shrink-0 ${
            event.memo ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
          } hover:text-blue-600 dark:hover:text-blue-300`}
        >
          <ChevronDown size={13} className={`transition-transform ${detailOpen ? "rotate-180" : ""}`} />
        </button>
        <button
          onClick={onStartEdit}
          className="p-1 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={13} />
        </button>
      </div>
      {detailOpen && (
        <div className="px-2.5 pb-2.5 pt-0 flex flex-col gap-2 border-t border-gray-50 dark:border-gray-700/60 mt-0.5">
          <textarea
            value={draftMemo}
            onChange={handleDraftMemoChange}
            rows={2}
            placeholder={t("todo.memoPlaceholder")}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 mt-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex items-center justify-end">
            <button
              onClick={handleSaveMemo}
              className={`flex items-center gap-1 text-xs text-white font-medium px-3 py-1.5 rounded-lg transition-colors ${
                justSaved ? "bg-green-600 hover:bg-green-600" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <Check size={12} /> {justSaved ? t("common.saved") : t("common.save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// SidebarCollapsedContext의 Provider는 TodoPage가 렌더링하는 <SidebarLayout> "안"에서
// 만들어지기 때문에, TodoPage 함수 본문에서 바로 useContext를 불러도 그 값을 못 받음
// (TodoPage 자신은 트리상 Provider의 부모라서). 그래서 <SidebarLayout>의 children으로
// 이 작은 컴포넌트를 끼워 넣어 Provider "안"에서 값을 읽고, 콜백으로 부모(TodoPage)에 전달함
function LeftSidebarStateReporter({ onChange }) {
  const collapsed = useContext(SidebarCollapsedContext);
  useEffect(() => { onChange(collapsed); }, [collapsed, onChange]);
  return null;
}

function TodoPage() {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [todos, setTodos] = useState([]);
  const [events, setEvents] = useState([]); // 할 일과 별개인 "일정" - 달력 보기 전용
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [viewMode, setViewMode] = useState("list"); // "list" | "calendar" | "plan"

  // 플랜 보기 - 마감일 없이(due_date=null) 기간 제한 없이 적어두는 할 일 목록.
  // 목록/달력 보기와 달리 날짜 입력란 자체가 없고, 우선순위·시작시간·미루기도 없이
  // 제목/세부사항(메모)만 다루는 단순한 형태 - 우선순위는 항상 "medium"으로 고정
  const [planTitle, setPlanTitle] = useState("");
  const [planCategory, setPlanCategory] = useState("");
  // 마감일은 선택 입력 - 비워두면 기존처럼 플랜에 남고, 넣으면 그 날짜의 목록/달력 보기로 넘어감
  const [planDueDate, setPlanDueDate] = useState("");
  const [planAdding, setPlanAdding] = useState(false);
  // 카테고리별 그룹을 접었다 펼 수 있게 - 접힌 카테고리 이름들의 집합
  const [collapsedPlanCategories, setCollapsedPlanCategories] = useState(() => new Set());
  const togglePlanCategoryCollapse = (category) => {
    setCollapsedPlanCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  // 목록 보기 - 상단 추가 폼 (마감일은 기본으로 오늘 날짜)
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState(() => todayDateString());
  const [newPriority, setNewPriority] = useState("medium");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [adding, setAdding] = useState(false);
  // 시작/종료 시간·메모 입력란을 상시 노출하지 않고, "+추가" 버튼 옆 토글로 펼쳤을 때만 보여줌
  const [newDetailOpen, setNewDetailOpen] = useState(false);

  // 목록 보기 우측 패널 - 미완료 목록 대신 타임테이블(시작 시간이 있는 할 일만).
  // 날짜를 골라가며 볼 수 있음(캘린더 보기의 selectedDate와는 별개).
  const [timetableDate, setTimetableDate] = useState(() => todayDateString());

  // 인라인 수정 (목록 보기 / 달력 패널 공용)
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editCategory, setEditCategory] = useState("");

  const [filter, setFilter] = useState("all"); // "all" | "active"

  const dragIdRef = useRef(null);

  // 달력 보기
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(null);
  // 달력 보기는 할 일이 아니라 "일정"(Event)만 다룸 - 체크박스 없이 시작일~종료일로
  // 여러 날에 걸쳐 표시되는 별개의 항목. 끝나는 날짜를 비워두면 시작일과 같은 하루짜리 일정이 됨
  const [eventTitle, setEventTitle] = useState("");
  // 카테고리 자유 입력이 아니라 고정 팔레트 중 하나의 색상 키("blue" 등)를 저장
  const [eventCategory, setEventCategory] = useState("blue");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventAdding, setEventAdding] = useState(false);
  // 일정 인라인 수정
  const [editingEventId, setEditingEventId] = useState(null);
  const [editEventTitle, setEditEventTitle] = useState("");
  const [editEventStart, setEditEventStart] = useState("");
  const [editEventEnd, setEditEventEnd] = useState("");
  const [editEventCategory, setEditEventCategory] = useState("");

  // 달력 패널 접힘 상태를 여기서 직접 들고 있어야 날짜를 클릭했을 때 강제로 펼칠 수 있음.
  // 이 패널은 제어 컴포넌트라 ResizableRightPanel의 autoCollapseBreakpoint가 적용되지 않으므로,
  // 저장된 값이 없을 때의 기본값을 여기서 직접 화면 폭 기준으로 정해줌 - 안 그러면 좁은 화면에서
  // 패널이 기본으로 펼쳐진 채 시작해서 왼쪽 사이드바 재오픈 버튼과 겹치는 문제가 생김
  const [calendarPanelCollapsed, setCalendarPanelCollapsed] = useState(() => {
    const saved = localStorage.getItem("todoCalendarPanelCollapsed");
    if (saved !== null) return saved === "true";
    return window.innerWidth < 1024;
  });
  // 창 폭이 자동으로 접은 건지, 사용자가 버튼으로 직접 접은 건지 구분(SidebarLayout과 동일한 방식) -
  // 자동으로 접힌 경우에만 창이 다시 넓어질 때 자동으로 펼침
  const calendarPanelAutoCollapsed = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      const isSmall = window.innerWidth < 1024;
      if (isSmall && !calendarPanelCollapsed) {
        calendarPanelAutoCollapsed.current = true;
        setCalendarPanelCollapsed(true);
      } else if (!isSmall && calendarPanelCollapsed && calendarPanelAutoCollapsed.current) {
        calendarPanelAutoCollapsed.current = false;
        setCalendarPanelCollapsed(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [calendarPanelCollapsed]);

  // 왼쪽 사이드바가 펼쳐진 채로(폭을 차지하는 상태) + 화면이 좁은 상태에서 달력의 날짜별
  // 패널이 강제로 펼쳐지면(handleSelectDate가 폭과 상관없이 무조건 펼침), 셋(왼쪽 사이드바 +
  // 달력 본문 + 오른쪽 패널)이 한 화면에 다 들어가려다 달력 본문이 글자 단위로 줄바꿈될
  // 정도로 짓눌리는 문제가 있었음. 이럴 땐 달력 본문을 아예 숨기고 오른쪽 패널만 보이게 함
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(() => {
    // SidebarLayout이 실제로 Provider 값을 알려주기 전까지 잠깐 쓰는 초기 추정값 -
    // SidebarLayout 자신의 기본값 계산 방식과 똑같이 맞춰서 첫 렌더에 잘못 숨겨지는 깜빡임을 줄임
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved !== null) return saved === "true";
    return window.innerWidth < 1024;
  });
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  // 이 값은 calendarPanelCollapsed의 자동 접힘 기준(1024)과 반드시 같아야 함 - 더 크게
  // 잡으면(예전 1280) "패널은 기본적으로 펼쳐져 있는데(1024~1280 사이 폭) 숨김 조건은 이미
  // 만족하는" 사각지대가 생겨서, 화면이 꽤 넓어도(심지어 달력 페이지에 처음 들어가자마자)
  // 달력 본문이 숨어버리는 문제가 있었음. 두 기준을 맞추면: 폭이 이 값보다 좁을 땐 패널도
  // 같이 자동으로 접히므로(calendarPanelCollapsed=true) 숨김 조건 자체가 성립하지 않고,
  // 사용자가 좁은 화면에서 날짜를 클릭해 "강제로" 펼쳤을 때만 숨겨짐
  const CALENDAR_SQUEEZE_BREAKPOINT = 1024;
  const hideCalendarContent =
    viewMode === "calendar" &&
    !leftSidebarCollapsed &&
    !calendarPanelCollapsed &&
    windowWidth < CALENDAR_SQUEEZE_BREAKPOINT;

  // 목록(list) 보기의 타임테이블 패널도 같은 문제가 있음 - 왼쪽 사이드바가 펼쳐진 채로
  // 화면이 좁아지면 타임테이블 패널이 열려있을 때 본문이 짓눌림. 이 패널은 자체적으로
  // autoCollapseBreakpoint={1024}로 접히므로, 위 달력과 동일한 이유로 기준을 반드시
  // 1024로 똑같이 맞춰야 사각지대(dead zone)가 생기지 않음
  const [timetablePanelCollapsed, setTimetablePanelCollapsed] = useState(() => {
    const saved = localStorage.getItem("todoTimetablePanelCollapsed");
    if (saved !== null) return saved === "true";
    return window.innerWidth < 1024;
  });
  const LIST_SQUEEZE_BREAKPOINT = 1024;
  const hideListContent =
    viewMode === "list" &&
    !leftSidebarCollapsed &&
    !timetablePanelCollapsed &&
    windowWidth < LIST_SQUEEZE_BREAKPOINT;

  const hideMainContent = hideCalendarContent || hideListContent;

  const handleSelectCategory = (categoryId) => {
    navigate(categoryId === null ? "/notes" : `/notes?category=${categoryId}`);
  };

  const fetchTodos = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getTodos(token);
      setTodos(data);
    } catch (err) {
      setError(t("todo.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTodos(); }, [token]);

  const fetchEvents = async () => {
    try {
      const data = await getEvents(token);
      setEvents(data);
    } catch (err) {
      setError(t("todo.loadFailed"));
    }
  };

  useEffect(() => { fetchEvents(); }, [token]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    setError("");
    try {
      // 시작/종료 시간·메모는 선택 입력 - 종료 시간을 안 넣으면 백엔드가 시작 시간+1시간으로 채움
      const created = await createTodo(
        newTitle.trim(), newDueDate || null, newPriority, token,
        newStartTime || null, newMemo.trim() || null, newEndTime || null
      );
      setTodos((prev) => [...prev, created]);
      setNewTitle("");
      setNewDueDate(todayDateString());
      setNewPriority("medium");
      setNewStartTime("");
      setNewEndTime("");
      setNewMemo("");
    } catch (err) {
      setError(t("todo.saveFailed"));
    } finally {
      setAdding(false);
    }
  };

  // 플랜 추가 - 마감일은 선택 입력이라 비워두면 null로 보내서 어떤 날짜에도 속하지 않는
  // 항목으로 생성됨(그대로 플랜에 남음). 넣으면 그 날짜를 가진 채로 생성되어 목록/달력
  // 보기에서 보이게 됨. 우선순위 선택 UI 자체가 없으므로 항상 "medium"으로 고정해서 보냄
  const handlePlanAdd = async () => {
    if (!planTitle.trim()) return;
    setPlanAdding(true);
    setError("");
    try {
      const created = await createTodo(
        planTitle.trim(), planDueDate || null, "medium", token, null, null, null, planCategory.trim() || null
      );
      setTodos((prev) => [...prev, created]);
      setPlanTitle("");
      setPlanCategory("");
      setPlanDueDate("");
    } catch (err) {
      setError(t("todo.saveFailed"));
    } finally {
      setPlanAdding(false);
    }
  };

  // 일정 추가 - 시작일은 선택된 날짜 고정, 종료일을 비워두거나 시작일보다 앞선 날짜를 넣으면
  // 시작일과 같은 값으로 보정해서 하루짜리 일정으로 만듦
  const handleEventAdd = async () => {
    const startDate = eventStartDate || selectedDate;
    if (!eventTitle.trim() || !startDate) return;
    setEventAdding(true);
    setError("");
    try {
      const endDate = eventEndDate && eventEndDate >= startDate ? eventEndDate : startDate;
      const created = await createEvent(eventTitle.trim(), startDate, endDate, eventCategory || null, token);
      setEvents((prev) => [...prev, created]);
      setEventTitle("");
      setEventCategory("blue");
      setEventStartDate(selectedDate || "");
      setEventEndDate("");
    } catch (err) {
      setError(t("todo.saveFailed"));
    } finally {
      setEventAdding(false);
    }
  };

  const handleEventDelete = async (eventId) => {
    if (!window.confirm(t("todo.confirmDelete"))) return;
    try {
      await deleteEvent(eventId, token);
      setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
    } catch (err) {
      setError(t("todo.saveFailed"));
    }
  };

  const startEventEdit = (ev) => {
    setEditingEventId(ev.id);
    setEditEventTitle(ev.title);
    setEditEventStart(ev.start_date);
    setEditEventEnd(ev.end_date);
    setEditEventCategory(ev.category || "blue");
  };

  const cancelEventEdit = () => setEditingEventId(null);

  const saveEventEdit = async (eventId) => {
    if (!editEventTitle.trim() || !editEventStart) return;
    // 제목/기간/색상만 고치는 편집 폼이라, 세부사항(메모)은 건드리지 않고 기존 값 그대로 보냄
    const current = events.find((ev) => ev.id === eventId);
    try {
      const endDate = editEventEnd && editEventEnd >= editEventStart ? editEventEnd : editEventStart;
      const updated = await updateEvent(
        eventId, editEventTitle.trim(), editEventStart, endDate, editEventCategory || null, token,
        current?.memo ?? null
      );
      setEvents((prev) => prev.map((ev) => (ev.id === eventId ? updated : ev)));
      setEditingEventId(null);
    } catch (err) {
      setError(t("todo.saveFailed"));
    }
  };

  // 일정 등록 후에 세부사항(메모)만 따로 추가/수정 - 나머지 필드는 그대로 유지
  const saveEventMemo = async (eventId, memo) => {
    const current = events.find((ev) => ev.id === eventId);
    if (!current) return false;
    try {
      const updated = await updateEvent(
        eventId, current.title, current.start_date, current.end_date, current.category ?? null, token, memo
      );
      setEvents((prev) => prev.map((ev) => (ev.id === eventId ? updated : ev)));
      return true;
    } catch (err) {
      setError(t("todo.saveFailed"));
      return false;
    }
  };

  const handleToggle = async (todoId) => {
    // 낙관적 업데이트: 화면에 바로 반영하고, 실패하면 되돌림
    setTodos((prev) => prev.map((td) => (td.id === todoId ? { ...td, is_done: !td.is_done } : td)));
    try {
      await toggleTodo(todoId, token);
    } catch (err) {
      setTodos((prev) => prev.map((td) => (td.id === todoId ? { ...td, is_done: !td.is_done } : td)));
      setError(t("todo.saveFailed"));
    }
  };

  const handleDelete = async (todoId) => {
    if (!window.confirm(t("todo.confirmDelete"))) return;
    try {
      await deleteTodo(todoId, token);
      setTodos((prev) => prev.filter((td) => td.id !== todoId));
    } catch (err) {
      setError(t("todo.saveFailed"));
    }
  };

  const startEdit = (todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDueDate(todo.due_date || "");
    setEditPriority(todo.priority);
    setEditCategory(todo.category || "");
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (todoId) => {
    if (!editTitle.trim()) return;
    const current = todos.find((td) => td.id === todoId);
    try {
      // 제목/마감일/우선순위/카테고리만 수정 - 이미 있는 시작·종료시간/메모는 그대로 유지
      const updated = await updateTodo(
        todoId, editTitle.trim(), editDueDate || null, editPriority,
        current?.start_time ?? null, current?.end_time ?? null, current?.memo ?? null, token,
        editCategory.trim() || null
      );
      setTodos((prev) => prev.map((td) => (td.id === todoId ? updated : td)));
      setEditingId(null);
    } catch (err) {
      setError(t("todo.saveFailed"));
    }
  };

  // 세부 내용(시작·종료 시간/메모)만 저장 - 제목/마감일/우선순위/카테고리는 그대로 유지
  // 성공/실패 여부를 반환해서, 호출한 쪽(TodoRow)이 저장 버튼을 초록색으로 바꿔
  // "저장 완료"를 보여줄지 판단할 수 있게 함
  const saveDetails = async (todoId, startTime, endTime, memo) => {
    const current = todos.find((td) => td.id === todoId);
    if (!current) return false;
    try {
      const updated = await updateTodo(
        todoId, current.title, current.due_date, current.priority, startTime, endTime, memo, token,
        current.category ?? null
      );
      setTodos((prev) => prev.map((td) => (td.id === todoId ? updated : td)));
      return true;
    } catch (err) {
      setError(t("todo.saveFailed"));
      return false;
    }
  };

  // 할 일 미루기: 마감일만 선택한 날짜로 변경하고 나머지 필드는 그대로 유지
  const postponeTodo = async (todoId, newDueDate) => {
    const current = todos.find((td) => td.id === todoId);
    if (!current) return;
    try {
      const updated = await updateTodo(
        todoId, current.title, newDueDate, current.priority, current.start_time, current.end_time, current.memo, token,
        current.category ?? null
      );
      setTodos((prev) => prev.map((td) => (td.id === todoId ? updated : td)));
    } catch (err) {
      setError(t("todo.saveFailed"));
    }
  };

  // 드래그 정렬: 완료되지 않은 항목끼리만 순서 변경 가능 (완료 항목은 항상 맨 아래)
  const handleDragStart = (todoId) => { dragIdRef.current = todoId; };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    const draggedId = dragIdRef.current;
    dragIdRef.current = null;
    if (!draggedId || draggedId === targetId) return;

    const active = todos.filter((td) => !td.is_done);
    const done = todos.filter((td) => td.is_done);
    const fromIndex = active.findIndex((td) => td.id === draggedId);
    const toIndex = active.findIndex((td) => td.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...active];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const newTodos = [...reordered, ...done];
    setTodos(newTodos);

    try {
      await reorderTodos(newTodos.map((td) => td.id), token);
    } catch (err) {
      setError(t("todo.saveFailed"));
      fetchTodos();
    }
  };

  const todayStr = todayDateString();

  // 목록 보기는 오늘 마감인 항목만 표시 (다른 날짜 항목은 달력 보기에서 확인)
  const todayTodos = todos.filter((td) => td.due_date === todayStr);
  const activeTodos = todayTodos.filter((td) => !td.is_done);
  const doneTodos = todayTodos.filter((td) => td.is_done);

  // 플랜 보기는 마감일이 아예 없는(due_date=null) 항목만 표시
  const planTodos = todos.filter((td) => !td.due_date);
  const planActiveTodos = planTodos.filter((td) => !td.is_done);
  const planDoneTodos = planTodos.filter((td) => td.is_done);

  // 지금까지 한 번이라도 쓰인 카테고리 목록(할 일=플랜 전용) - 콤보박스 자동완성용.
  // 일정(Event)의 category는 더 이상 자유 입력 텍스트가 아니라 고정 팔레트 색상 키라
  // 여기 자동완성 목록에는 포함하지 않음
  const categoryOptions = useMemo(() => {
    const fromTodos = todos.map((td) => td.category);
    return Array.from(new Set(fromTodos.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [todos]);

  // 플랜의 미완료 항목을 카테고리별로 묶어서 보여줌 - 카테고리가 없는 항목은 헤더 없이
  // 맨 앞에 그대로 두고, 카테고리가 있는 항목만 그룹 헤더를 붙여 구분되게 표시
  const planActiveGroupsRaw = useMemo(() => {
    const map = new Map();
    planActiveTodos.forEach((td) => {
      const key = td.category || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(td);
    });
    return map;
  }, [planActiveTodos]);

  // 현재 실제로 쓰이고 있는 카테고리 이름들 (미분류 제외)
  const usedPlanCategories = useMemo(
    () => Array.from(planActiveGroupsRaw.keys()).filter(Boolean),
    [planActiveGroupsRaw]
  );

  // 카테고리 그룹을 드래그로 순서 바꿀 수 있게 - 사용자가 정한 순서를 localStorage에 저장해서
  // 새로고침해도 유지함. 아직 순서가 정해지지 않은(새로 생긴) 카테고리는 이름순으로 뒤에 붙임
  const [planCategoryOrder, setPlanCategoryOrder] = useState(() => {
    try {
      const saved = localStorage.getItem("planCategoryOrder");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const orderedPlanCategories = useMemo(() => {
    const known = planCategoryOrder.filter((c) => usedPlanCategories.includes(c));
    const unknown = usedPlanCategories.filter((c) => !planCategoryOrder.includes(c)).sort((a, b) => a.localeCompare(b));
    return [...known, ...unknown];
  }, [planCategoryOrder, usedPlanCategories]);

  const planActiveGroups = useMemo(() => {
    const entries = orderedPlanCategories.map((cat) => [cat, planActiveGroupsRaw.get(cat) || []]);
    if (planActiveGroupsRaw.has("")) entries.unshift(["", planActiveGroupsRaw.get("")]);
    return entries;
  }, [orderedPlanCategories, planActiveGroupsRaw]);

  // 카테고리 그룹 드래그 정렬
  const categoryDragRef = useRef(null);
  const handleCategoryDragStart = (category) => { categoryDragRef.current = category; };
  const handleCategoryDragOver = (e) => e.preventDefault();
  const handleCategoryDrop = (e, targetCategory) => {
    e.preventDefault();
    const draggedCategory = categoryDragRef.current;
    categoryDragRef.current = null;
    if (!draggedCategory || draggedCategory === targetCategory) return;

    const current = [...orderedPlanCategories];
    const fromIndex = current.indexOf(draggedCategory);
    const toIndex = current.indexOf(targetCategory);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...current];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    setPlanCategoryOrder(reordered);
    localStorage.setItem("planCategoryOrder", JSON.stringify(reordered));
  };

  const rowProps = (todo, draggable, compact = false, hideDate = false, planMode = false) => ({
    todo,
    editing: editingId === todo.id,
    editTitle, editDueDate, editPriority, editCategory,
    setEditTitle, setEditDueDate, setEditPriority, setEditCategory,
    categoryOptions,
    onToggle: () => handleToggle(todo.id),
    onDelete: () => handleDelete(todo.id),
    onStartEdit: () => startEdit(todo),
    onCancelEdit: cancelEdit,
    onSaveEdit: () => saveEdit(todo.id),
    onSaveDetails: (startTime, endTime, memo) => saveDetails(todo.id, startTime, endTime, memo),
    onPostpone: (newDueDate) => postponeTodo(todo.id, newDueDate),
    draggable,
    onDragStart: draggable ? () => handleDragStart(todo.id) : undefined,
    onDragOver: draggable ? handleDragOver : undefined,
    onDrop: draggable ? (e) => handleDrop(e, todo.id) : undefined,
    overdue: isOverdue(todo),
    t,
    compact,
    hideDate,
    planMode,
  });

  // 달력 보기 관련 파생값
  const todosByDate = useMemo(() => {
    const map = {};
    todos.forEach((td) => {
      if (!td.due_date) return;
      (map[td.due_date] ||= []).push(td);
    });
    return map;
  }, [todos]);

  // 목록 보기 우측 타임테이블 - 시작 시간이 있는 할 일만 대상으로, 고른 날짜(timetableDate)의
  // 항목을 시간(hour)별로 묶어서 보여줌. 0시/1시는 그 날짜의 "늦은 밤"으로 취급해 맨 아래에 이어 붙임
  const timetableTodos = (todosByDate[timetableDate] || []).filter((td) => td.start_time);
  const timetableItemsByHour = useMemo(() => {
    const map = {};
    timetableTodos.forEach((td) => {
      const hour = Number(td.start_time.split(":")[0]);
      (map[hour] ||= []).push(td);
    });
    Object.values(map).forEach((list) => list.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return map;
  }, [timetableTodos]);
  const goToPrevTimetableDay = () => setTimetableDate((prev) => addDaysToDateStr(prev, -1));
  const goToNextTimetableDay = () => setTimetableDate((prev) => addDaysToDateStr(prev, 1));
  const goToTodayTimetable = () => setTimetableDate(todayDateString());
  const timetableDateLabel = new Intl.DateTimeFormat(i18n.language === "ko" ? "ko-KR" : "en-US", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parseLocalDate(timetableDate));

  const calendarCells = useMemo(
    () => buildCalendarCells(calendarMonth.getFullYear(), calendarMonth.getMonth()),
    [calendarMonth]
  );
  const monthLabel = new Intl.DateTimeFormat(i18n.language === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
  }).format(calendarMonth);
  const weekdayLabels = WEEKDAY_LABELS[i18n.language] || WEEKDAY_LABELS.en;

  const goToPrevMonth = () => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const goToToday = () => {
    const now = new Date();
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(todayDateString());
  };

  const handleSelectDate = (dateStr) => {
    setSelectedDate(dateStr);
    setEventTitle("");
    setEventCategory("blue");
    setEventStartDate(dateStr);
    setEventEndDate("");
    // 날짜를 고르면 그날 일정이 바로 보이도록 패널이 접혀 있었다면 강제로 펼침
    setCalendarPanelCollapsed(false);
    localStorage.setItem("todoCalendarPanelCollapsed", "false");
  };

  // 선택된 날짜에 걸쳐있는 일정들 (시작일~종료일 사이에 그 날짜가 포함되면 전부)
  const selectedDateEvents = selectedDate
    ? events.filter((ev) => ev.start_date <= selectedDate && ev.end_date >= selectedDate)
    : [];

  // 일정 아래 구분선 밑에 토글로 접어서 보여주는 그 날짜의 할 일 목록
  const [showDayTodos, setShowDayTodos] = useState(false);
  const selectedDateTodos = selectedDate ? (todosByDate[selectedDate] || []) : [];

  // 달력에 보이는 6주 전체 범위와 겹치는 일정만 추림
  const calendarViewStart = calendarCells[0]?.dateStr;
  const calendarViewEnd = calendarCells[calendarCells.length - 1]?.dateStr;
  const visibleEvents = useMemo(
    () => events.filter((ev) => ev.start_date <= calendarViewEnd && ev.end_date >= calendarViewStart),
    [events, calendarViewStart, calendarViewEnd]
  );

  // 겹치는 일정끼리 서로 다른 "레인"(세로 줄)에 배치 - 달력에 보이는 전체 기간을 기준으로
  // 한 번만 배정해서, 여러 주에 걸친 일정이라도 매주 같은 레인에 그려지게 함(자연스러운 이어짐)
  const eventLanes = useMemo(() => {
    const sorted = [...visibleEvents].sort((a, b) => {
      if (a.start_date !== b.start_date) return a.start_date < b.start_date ? -1 : 1;
      return b.end_date.localeCompare(a.end_date);
    });
    const laneEndDates = [];
    const lanes = {};
    sorted.forEach((ev) => {
      let lane = laneEndDates.findIndex((endDate) => endDate < ev.start_date);
      if (lane === -1) {
        lane = laneEndDates.length;
        laneEndDates.push(ev.end_date);
      } else {
        laneEndDates[lane] = ev.end_date;
      }
      lanes[ev.id] = lane;
    });
    return lanes;
  }, [visibleEvents]);

  // calendarCells(6주 x 7일 평탄한 배열)를 한 주 단위(7개씩)로 묶음
  const calendarWeeks = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < calendarCells.length; i += 7) weeks.push(calendarCells.slice(i, i + 7));
    return weeks;
  }, [calendarCells]);

  const selectedDateLabel = selectedDate
    ? new Intl.DateTimeFormat(i18n.language === "ko" ? "ko-KR" : "en-US", {
        month: "long",
        day: "numeric",
        weekday: "short",
      }).format(parseLocalDate(selectedDate))
    : "";

  return (
    <SidebarLayout selectedCategoryId={null} onSelectCategory={handleSelectCategory}>
      <LeftSidebarStateReporter onChange={setLeftSidebarCollapsed} />
      <div className={`app-serif-panel flex-1 min-w-0 overflow-y-auto bg-gray-50 dark:bg-gray-900 ${hideMainContent ? "hidden" : ""}`}>
        <div className="sticky top-0 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 sm:px-8 py-4 flex items-center justify-between z-10">
          <h1 className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-gray-100" style={{ fontFamily: "'Newsreader', 'Noto Serif KR', Georgia, serif" }}>
            <SidebarSpacer />
            <ListTodo size={20} className="text-blue-600 dark:text-blue-400" /> {t("sidebar.todo")}
          </h1>
          {todayTodos.length > 0 && (
            <span className="text-sm text-gray-400 dark:text-gray-500">
              {t("todo.completedCount", { done: doneTodos.length, total: todayTodos.length })}
            </span>
          )}
        </div>

        {/* 창 크기와 상관없이 항상 가운데 정렬 - 보기별로 폭만 다르게(달력은 그리드가
            넓어서 5xl, 목록/플랜은 카드형 리스트라 3xl) */}
        <div className={`px-4 sm:px-8 py-8 mx-auto ${viewMode === "calendar" ? "max-w-5xl" : "max-w-3xl"}`}>
          {/* 보기 전환 */}
          <div className="flex items-center gap-1 mb-4">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                viewMode === "list"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
              }`}
            >
              <List size={14} /> {t("todo.viewList")}
            </button>
            <button
              onClick={() => {
                setViewMode("calendar");
                if (!selectedDate) handleSelectDate(todayDateString());
              }}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                viewMode === "calendar"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
              }`}
            >
              <CalendarDays size={14} /> {t("todo.viewCalendar")}
            </button>
            <button
              onClick={() => setViewMode("plan")}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                viewMode === "plan"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
              }`}
            >
              <ClipboardList size={14} /> {t("todo.viewPlan")}
            </button>
          </div>

          {error && <div className="text-sm text-red-500 dark:text-red-400 mb-3">{error}</div>}

          {viewMode === "list" ? (
            <>
              {/* 추가 폼 - 시작/종료 시간·메모는 "세부사항" 토글을 눌러야만 보이는 선택 입력 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 mb-6 flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    placeholder={t("todo.addPlaceholder")}
                    className="flex-1 min-w-[200px] border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <PriorityDropdown value={newPriority} onChange={setNewPriority} />
                  <button
                    onClick={() => setNewDetailOpen((prev) => !prev)}
                    title={t("todo.detailToggle")}
                    className={`flex items-center gap-1 text-xs shrink-0 px-2 py-2 rounded-lg border transition-colors ${
                      newDetailOpen
                        ? "border-blue-200 dark:border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"
                        : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                    }`}
                  >
                    {t("todo.detailLabel")}
                    <ChevronDown size={13} className={`transition-transform ${newDetailOpen ? "rotate-180" : ""}`} />
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={adding || !newTitle.trim()}
                    className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Plus size={14} /> {t("todo.add")}
                  </button>
                </div>
                {newDetailOpen && (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <TimePicker value={newStartTime} onChange={setNewStartTime} placeholder={t("todo.startTimeOptional")} />
                      <span className="text-xs text-gray-400 dark:text-gray-500">~</span>
                      <TimePicker value={newEndTime} onChange={setNewEndTime} placeholder={t("todo.endTimeOptional")} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        value={newMemo}
                        onChange={(e) => setNewMemo(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                        placeholder={t("todo.memoPlaceholder")}
                        className="flex-1 min-w-[200px] border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* 필터 */}
              <div className="flex items-center gap-1 mb-3">
                {[
                  { value: "all", labelKey: "todo.filterAll" },
                  { value: "active", labelKey: "todo.filterActive" },
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                      filter === f.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
                    }`}
                  >
                    {t(f.labelKey)}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="text-center text-gray-400 dark:text-gray-500 py-16">{t("common.loading")}</div>
              ) : todayTodos.length === 0 ? (
                <div className="text-center text-gray-400 dark:text-gray-500 py-16">
                  <ListTodo size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <div>{t("todo.emptyStateToday")}</div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {activeTodos.map((todo) => (
                    <TodoRow key={todo.id} {...rowProps(todo, true)} />
                  ))}

                  {activeTodos.length === 0 && filter === "active" && (
                    <div className="text-center text-gray-400 dark:text-gray-500 py-10 text-sm">{t("todo.emptyState")}</div>
                  )}

                  {filter === "all" && doneTodos.length > 0 && (
                    <>
                      <div className="mt-4 mb-1 px-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {t("todo.completedSection")}
                      </div>
                      {doneTodos.map((todo) => (
                        <TodoRow key={todo.id} {...rowProps(todo, false)} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          ) : viewMode === "plan" ? (
            <>
              {/* 플랜 추가 폼 - 우선순위는 없이 제목/카테고리/마감일(선택)만.
                  마감일은 비워두면 기존처럼 플랜에 남고, 넣으면 목록/달력 보기로 넘어감 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 mb-6 flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePlanAdd()}
                  placeholder={t("todo.planAddPlaceholder")}
                  className="flex-1 min-w-[200px] border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <CategoryCombobox
                  value={planCategory}
                  onChange={setPlanCategory}
                  options={categoryOptions}
                  placeholder={t("todo.categoryPlaceholder")}
                  className="w-40"
                />
                <input
                  type="date"
                  value={planDueDate}
                  onChange={(e) => setPlanDueDate(e.target.value)}
                  title={t("todo.optionalDueDate")}
                  className="border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handlePlanAdd}
                  disabled={planAdding || !planTitle.trim()}
                  className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Plus size={14} /> {t("todo.add")}
                </button>
              </div>

              {loading ? (
                <div className="text-center text-gray-400 dark:text-gray-500 py-16">{t("common.loading")}</div>
              ) : planTodos.length === 0 ? (
                <div className="text-center text-gray-400 dark:text-gray-500 py-16">
                  <ClipboardList size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <div>{t("todo.emptyStatePlan")}</div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {planActiveGroups.map(([category, items]) => {
                    const collapsed = category && collapsedPlanCategories.has(category);
                    return (
                      <div
                        key={category || "__none__"}
                        className="flex flex-col gap-2"
                        onDragOver={category ? handleCategoryDragOver : undefined}
                        onDrop={category ? (e) => handleCategoryDrop(e, category) : undefined}
                      >
                        {category && (
                          // 목록 항목(TodoRow)과 동일한 방식 - draggable/onDragStart는 작은 그립
                          // 아이콘이 아니라 이 감싸는 div 자체에 걸어야 안정적으로 잡힘 (아이콘처럼
                          // 작은 SVG 요소 단독으로는 드래그 시작이 잘 인식되지 않는 경우가 있었음)
                          <div
                            draggable
                            onDragStart={() => handleCategoryDragStart(category)}
                            className="flex items-center gap-1 mt-3 mb-0.5 first:mt-0 select-none"
                          >
                            <GripVertical size={14} className="text-gray-300 dark:text-gray-600 cursor-grab shrink-0" />
                            <button
                              type="button"
                              onClick={() => togglePlanCategoryCollapse(category)}
                              className="flex items-center gap-1.5 px-1 text-left hover:opacity-70 transition-opacity"
                            >
                              <ChevronDown size={13} className={`text-gray-400 dark:text-gray-500 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${categoryMeta(category).dot}`} />
                              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{category}</span>
                            </button>
                          </div>
                        )}
                        {!collapsed && items.map((todo) => (
                          <TodoRow key={todo.id} {...rowProps(todo, true, false, false, true)} />
                        ))}
                      </div>
                    );
                  })}

                  {planDoneTodos.length > 0 && (
                    <>
                      <div className="mt-4 mb-1 px-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {t("todo.completedSection")}
                      </div>
                      {planDoneTodos.map((todo) => (
                        <TodoRow key={todo.id} {...rowProps(todo, false, false, false, true)} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPrevMonth}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-50 dark:text-gray-500 dark:hover:text-blue-400 dark:hover:bg-gray-700/60"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 min-w-[120px] text-center">
                    {monthLabel}
                  </span>
                  <button
                    onClick={goToNextMonth}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-50 dark:text-gray-500 dark:hover:text-blue-400 dark:hover:bg-gray-700/60"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <button onClick={goToToday} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  {t("todo.today")}
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {weekdayLabels.map((label) => (
                  <div key={label} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">
                    {label}
                  </div>
                ))}
              </div>

              {/* 일정(Event)만 표시 - 할 일과 달리 체크박스가 없고, 여러 날에 걸치면
                  칸마다 따로 뜨는 대신 막대 하나로 이어서 보여줌(네이티브 캘린더 앱과 동일한 방식) */}
              <div className="flex flex-col">
                {calendarWeeks.map((week, weekIdx) => {
                  const segments = computeWeekSegments(week, visibleEvents, eventLanes);
                  const maxLane = segments.reduce((max, seg) => Math.max(max, seg.lane), -1);
                  // repeat()의 반복 횟수는 0이 될 수 없음(CSS 스펙상 0이면 grid-template-rows
                  // 선언 전체가 무효화되어 브라우저가 auto 크기로 되돌림) - 그 주에 일정이
                  // 하나도 없어서 lane이 0개일 때는 repeat 절 자체를 아예 빼야 함
                  const laneRowsTemplate = maxLane >= 0 ? ` repeat(${maxLane + 1}, 20px)` : "";
                  // 날짜 숫자 자리는 작게(24px)만 잡아서 일정이 숫자 바로 밑에서 시작하게 하고,
                  // 셀 전체 최소 높이(80px)는 맨 아래 1fr 여백 트랙이 남는 공간을 채워서 맞춤
                  return (
                    <div
                      key={weekIdx}
                      className="grid grid-cols-7 gap-x-1 border-b border-gray-50 dark:border-gray-800 last:border-b-0 py-1"
                      style={{ gridTemplateRows: `24px${laneRowsTemplate} 1fr`, minHeight: "80px" }}
                    >
                      {week.map((cell, colIdx) => {
                        // 원 표시는 기본적으로 오늘 날짜에 있다가, 사용자가 다른 날짜를 고르면
                        // 그 날짜로 옮겨감 - 달력 페이지에 처음 들어왔을 때(아직 아무 날짜도
                        // 고르지 않아 selectedDate가 없을 때)만 오늘 날짜에 고정되어 보임
                        const isCircleDate = selectedDate ? cell.dateStr === selectedDate : cell.dateStr === todayStr;
                        return (
                          <button
                            key={cell.dateStr}
                            onClick={() => handleSelectDate(cell.dateStr)}
                            style={{ gridColumn: colIdx + 1, gridRow: "1 / -1" }}
                            className={`flex items-start justify-start text-left rounded-lg px-1.5 pt-1 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40 ${
                              !cell.currentMonth ? "opacity-40" : ""
                            }`}
                          >
                            <span
                              className={
                                isCircleDate
                                  ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-semibold"
                                  : "text-xs text-gray-500 dark:text-gray-400"
                              }
                            >
                              {cell.day}
                            </span>
                          </button>
                        );
                      })}
                      {segments.map((seg) => (
                        <button
                          key={seg.event.id}
                          type="button"
                          onClick={() => handleSelectDate(seg.event.start_date)}
                          title={seg.event.title}
                          style={{ gridColumn: `${seg.startCol + 1} / ${seg.endCol + 2}`, gridRow: seg.lane + 2 }}
                          className={`mx-0.5 truncate px-1.5 text-[10px] font-medium text-left transition-colors ${
                            colorByKey(seg.event.category).bg
                          } ${colorByKey(seg.event.category).text} ${seg.continuesLeft ? "rounded-l-none" : "rounded-l"} ${
                            seg.continuesRight ? "rounded-r-none" : "rounded-r"
                          }`}
                        >
                          {/* 주가 바뀌면서 막대가 이어질 때(continuesLeft), 이전 주 칸에 이미
                              제목이 나왔으므로 여기서 또 보여주면 같은 내용이 두 번 나옴 -
                              실제로 일정이 시작하는 칸(continuesLeft가 아닌 첫 세그먼트)에서만 표시 */}
                          {!seg.continuesLeft && seg.event.title}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {viewMode === "list" && (
        <ResizableRightPanel
          className="p-5 flex flex-col gap-2 sticky top-0 h-screen"
          defaultWidth={340}
          minWidth={280}
          maxWidth={480}
          minLeftWidth={520}
          collapsible
          storageKey="todoTimetablePanelCollapsed"
          autoCollapseBreakpoint={1024}
          onCollapsedChange={setTimetablePanelCollapsed}
        >
          {/* 시작 시간을 넣은 할 일만 여기(타임테이블)에 뜨고, 안 넣은 할 일은 위 본문
              목록에 그대로 나옴. 날짜는 화살표로 골라가며 볼 수 있음(캘린더 보기와 별개) */}
          <div className="flex items-center justify-between mb-1 shrink-0">
            <button
              onClick={goToPrevTimetableDay}
              className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={goToTodayTimetable}
              title={t("todo.today")}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <Clock size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
              {timetableDateLabel}
            </button>
            <button
              onClick={goToNextTimetableDay}
              className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto border-t border-gray-100 dark:border-gray-700">
            {timetableTodos.length === 0 && (
              <div className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">{t("todo.timetableEmpty")}</div>
            )}
            {TIMETABLE_HOURS.map((hour) => {
              const items = timetableItemsByHour[hour] || [];
              return (
                <div key={hour} className="flex items-start gap-2 border-b border-gray-50 dark:border-transparent py-1.5 min-h-[40px]">
                  <span className="text-[11px] text-gray-400 dark:text-gray-100 w-14 shrink-0 pt-0.5">
                    {formatTimetableHourLabel(hour, i18n.language)}
                  </span>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {items.map((todo) => {
                      const meta = priorityMeta(todo.priority);
                      return (
                        <button
                          key={todo.id}
                          onClick={() => handleToggle(todo.id)}
                          title={todo.memo || undefined}
                          className={`flex items-center gap-1.5 text-left text-xs rounded-lg px-2 py-1.5 border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-200 dark:hover:border-blue-500/40 transition-colors ${
                            todo.is_done ? "opacity-50" : ""
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                          <span className="text-gray-400 dark:text-gray-500 shrink-0">
                            {todo.start_time}{todo.end_time ? `–${todo.end_time}` : ""}
                          </span>
                          <span
                            className={`truncate ${
                              todo.is_done ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-800 dark:text-gray-100"
                            }`}
                          >
                            {todo.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ResizableRightPanel>
      )}

      {viewMode === "calendar" && (
        <ResizableRightPanel
          className="p-5 flex flex-col gap-3 sticky top-0 h-screen"
          defaultWidth={360}
          minWidth={280}
          maxWidth={480}
          minLeftWidth={520}
          collapsible
          storageKey="todoCalendarPanelCollapsed"
          collapsed={calendarPanelCollapsed}
          onCollapsedChange={setCalendarPanelCollapsed}
        >
          {selectedDate ? (
            <>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1 shrink-0">
                <Calendar size={15} /> {selectedDateLabel}
              </div>

              {/* 일정 목록 + 그 아래 할 일 토글을 한 스크롤 영역으로 묶어서, 일정이 몇 개
                  안 될 때 남는 세로 공간이 이 영역 맨 아래(내용 밖)로 가고 할 일 토글은
                  항상 일정 바로 아래에 붙어있게 함 */}
              <div className="flex flex-col gap-2 overflow-y-auto flex-1">
                <div className="flex flex-col gap-2">
                  {selectedDateEvents.length === 0 ? (
                    <div className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">{t("todo.emptyStateEvent")}</div>
                  ) : (
                    selectedDateEvents.map((ev) => (
                      <EventRow
                        key={ev.id}
                        event={ev}
                        editing={editingEventId === ev.id}
                        editTitle={editEventTitle}
                        editStart={editEventStart}
                        editEnd={editEventEnd}
                        editColor={editEventCategory}
                        setEditTitle={setEditEventTitle}
                        setEditStart={setEditEventStart}
                        setEditEnd={setEditEventEnd}
                        setEditColor={setEditEventCategory}
                        onStartEdit={() => startEventEdit(ev)}
                        onCancelEdit={cancelEventEdit}
                        onSaveEdit={() => saveEventEdit(ev.id)}
                        onDelete={() => handleEventDelete(ev.id)}
                        onSaveMemo={(memo) => saveEventMemo(ev.id, memo)}
                        t={t}
                        i18n={i18n}
                      />
                    ))
                  )}
                </div>

                {/* 구분선 아래 토글로 그 날짜의 할 일 목록을 접었다 펼 수 있게 표시 -
                    일정과 할 일이 한 패널에 다 보이면 복잡해 보여서 기본은 접어둠 */}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowDayTodos((prev) => !prev)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} />
                      {t("todo.dayTodosToggle")}
                      {selectedDateTodos.length > 0 && (
                        <span className="text-gray-400 dark:text-gray-500 font-normal">({selectedDateTodos.length})</span>
                      )}
                    </span>
                    <ChevronDown size={14} className={`transition-transform ${showDayTodos ? "rotate-180" : ""}`} />
                  </button>
                  {showDayTodos && (
                    <div className="flex flex-col gap-2 mt-2">
                      {selectedDateTodos.length === 0 ? (
                        <div className="text-sm text-gray-400 dark:text-gray-500 py-3 text-center">{t("todo.emptyState")}</div>
                      ) : (
                        selectedDateTodos.map((todo) => (
                          <TodoRow key={todo.id} {...rowProps(todo, false, true, true)} />
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2 shrink-0">
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEventAdd()}
                  placeholder={t("todo.eventAddPlaceholder")}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <ColorPicker value={eventCategory} onChange={setEventCategory} />
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={eventStartDate}
                    onChange={(e) => setEventStartDate(e.target.value)}
                    title={t("todo.eventStartDateLabel")}
                    className="flex-1 min-w-0 text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-400 text-xs shrink-0">–</span>
                  <input
                    type="date"
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    min={eventStartDate}
                    title={t("todo.eventEndDateLabel")}
                    className="flex-1 min-w-0 text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleEventAdd}
                  disabled={eventAdding || !eventTitle.trim() || !eventStartDate}
                  className="w-full flex items-center justify-center gap-1 bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 shrink-0"
                >
                  <Plus size={13} /> {t("todo.add")}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-gray-400 dark:text-gray-500 text-sm px-4">
              {t("todo.selectDatePrompt")}
            </div>
          )}
        </ResizableRightPanel>
      )}
    </SidebarLayout>
  );
}

export default TodoPage;
