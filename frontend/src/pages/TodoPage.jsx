import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getTodos, createTodo, updateTodo, toggleTodo, deleteTodo, reorderTodos } from "../api/todos";
import SidebarLayout, { SidebarSpacer } from "../components/SidebarLayout";
import ResizableRightPanel from "../components/ResizableRightPanel";
import TimePicker from "../components/TimePicker";
import {
  ListTodo, Plus, Trash2, GripVertical, Pencil, CheckCircle2, Circle, Calendar, X, Check,
  List, ChevronLeft, ChevronRight, ChevronDown, CalendarDays, ListChecks, Flag,
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

// 달력 옆 패널의 일정 추가 폼처럼 항상 3개뿐이고 자주 바꾸는 자리에서는, 펼쳐야 보이는
// 드롭다운보다 한눈에 다 보이고 바로 누를 수 있는 버튼(세그먼트 컨트롤) 방식이 더 편함
function PriorityButtonGroup({ value, onChange, className = "" }) {
  const { t } = useTranslation();
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {PRIORITIES.map((p) => {
        const selected = value === p.value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm rounded-lg py-1.5 border transition-colors ${
              selected
                ? `${p.dot} text-white border-transparent`
                : "bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selected ? "bg-white/80" : p.dot}`} />
            {t(p.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

// "YYYY-MM-DD" 문자열을 로컬 자정 기준 Date로 변환 (new Date(str)는 UTC로 해석돼서 하루 밀릴 수 있음)
function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
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

// 할 일 한 줄 (보기 모드 / 인라인 수정 모드) - 목록 보기와 달력 사이드 패널에서 공용으로 사용
// 토글로 펼치면 시작 시간 / 메모 같은 세부 내용을 입력할 수 있음
function TodoRow({
  todo, editing, editTitle, editDueDate, editPriority,
  setEditTitle, setEditDueDate, setEditPriority,
  onToggle, onDelete, onStartEdit, onCancelEdit, onSaveEdit, onSaveDetails,
  draggable, onDragStart, onDragOver, onDrop, overdue, t, compact = false, hideDate = false,
}) {
  const meta = priorityMeta(todo.priority);
  const [detailOpen, setDetailOpen] = useState(false);
  const [draftStartTime, setDraftStartTime] = useState(todo.start_time || "");
  const [draftMemo, setDraftMemo] = useState(todo.memo || "");
  // 저장 버튼을 잠깐 초록색으로 바꿔서 "저장 완료"임을 눈에 띄게 보여줌
  const [justSaved, setJustSaved] = useState(false);
  const savedTimeoutRef = useRef(null);
  const hasDetail = Boolean(todo.start_time || todo.memo);

  useEffect(() => () => { if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current); }, []);

  const toggleDetail = () => {
    if (!detailOpen) {
      // 펼칠 때는 현재 저장된 값으로 다시 맞춰서 편집 시작
      setDraftStartTime(todo.start_time || "");
      setDraftMemo(todo.memo || "");
    }
    setDetailOpen((prev) => !prev);
  };

  const handleDraftStartTimeChange = (value) => {
    setJustSaved(false);
    setDraftStartTime(value);
  };

  const handleDraftMemoChange = (e) => {
    setJustSaved(false);
    setDraftMemo(e.target.value);
  };

  const handleSaveDetail = async () => {
    const success = await onSaveDetails(draftStartTime || null, draftMemo.trim() || null);
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
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1 focus:outline-none"
            />
            <PriorityDropdown value={editPriority} onChange={setEditPriority} />
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
            {compact ? (
              <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} title={t(meta.labelKey)} />
            ) : (
              <span className={`flex items-center gap-1 text-xs shrink-0 ${meta.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                {t(meta.labelKey)}
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
          <div className="flex items-center gap-2 pt-3">
            <TimePicker value={draftStartTime} onChange={handleDraftStartTimeChange} />
          </div>
          <textarea
            value={draftMemo}
            onChange={handleDraftMemoChange}
            rows={2}
            placeholder={t("todo.memoPlaceholder")}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button
            onClick={handleSaveDetail}
            className={`self-end flex items-center gap-1 text-xs text-white font-medium px-3 py-1.5 rounded-lg transition-colors ${
              justSaved ? "bg-green-600 hover:bg-green-600" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <Check size={12} /> {justSaved ? t("common.saved") : t("common.save")}
          </button>
        </div>
      )}
    </div>
  );
}

function TodoPage() {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [viewMode, setViewMode] = useState("list"); // "list" | "calendar"

  // 목록 보기 - 상단 추가 폼 (마감일은 기본으로 오늘 날짜)
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState(() => todayDateString());
  const [newPriority, setNewPriority] = useState("medium");
  const [newStartTime, setNewStartTime] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [adding, setAdding] = useState(false);

  // 인라인 수정 (목록 보기 / 달력 패널 공용)
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState("medium");

  const [filter, setFilter] = useState("all"); // "all" | "active"

  const dragIdRef = useRef(null);

  // 달력 보기
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [panelTitle, setPanelTitle] = useState("");
  const [panelPriority, setPanelPriority] = useState("medium");
  const [panelAdding, setPanelAdding] = useState(false);

  // 달력 패널 접힘 상태를 여기서 직접 들고 있어야 날짜를 클릭했을 때 강제로 펼칠 수 있음
  const [calendarPanelCollapsed, setCalendarPanelCollapsed] = useState(() => {
    const saved = localStorage.getItem("todoCalendarPanelCollapsed");
    return saved === "true";
  });

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

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    setError("");
    try {
      // 시작 시간/메모는 선택 입력 - 비어 있어도 그냥 null로 생성됨
      const created = await createTodo(
        newTitle.trim(), newDueDate || null, newPriority, token,
        newStartTime || null, newMemo.trim() || null
      );
      setTodos((prev) => [...prev, created]);
      setNewTitle("");
      setNewDueDate(todayDateString());
      setNewPriority("medium");
      setNewStartTime("");
      setNewMemo("");
    } catch (err) {
      setError(t("todo.saveFailed"));
    } finally {
      setAdding(false);
    }
  };

  const handlePanelAdd = async () => {
    if (!panelTitle.trim() || !selectedDate) return;
    setPanelAdding(true);
    setError("");
    try {
      const created = await createTodo(panelTitle.trim(), selectedDate, panelPriority, token);
      setTodos((prev) => [...prev, created]);
      setPanelTitle("");
      setPanelPriority("medium");
    } catch (err) {
      setError(t("todo.saveFailed"));
    } finally {
      setPanelAdding(false);
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
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (todoId) => {
    if (!editTitle.trim()) return;
    const current = todos.find((td) => td.id === todoId);
    try {
      // 제목/마감일/우선순위만 수정 - 이미 있는 시작시간/메모는 그대로 유지
      const updated = await updateTodo(
        todoId, editTitle.trim(), editDueDate || null, editPriority,
        current?.start_time ?? null, current?.memo ?? null, token
      );
      setTodos((prev) => prev.map((td) => (td.id === todoId ? updated : td)));
      setEditingId(null);
    } catch (err) {
      setError(t("todo.saveFailed"));
    }
  };

  // 세부 내용(시작 시간/메모)만 저장 - 제목/마감일/우선순위는 그대로 유지
  // 성공/실패 여부를 반환해서, 호출한 쪽(TodoRow)이 저장 버튼을 초록색으로 바꿔
  // "저장 완료"를 보여줄지 판단할 수 있게 함
  const saveDetails = async (todoId, startTime, memo) => {
    const current = todos.find((td) => td.id === todoId);
    if (!current) return false;
    try {
      const updated = await updateTodo(
        todoId, current.title, current.due_date, current.priority, startTime, memo, token
      );
      setTodos((prev) => prev.map((td) => (td.id === todoId ? updated : td)));
      return true;
    } catch (err) {
      setError(t("todo.saveFailed"));
      return false;
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

  // 오른쪽 패널: 오늘 것을 제외한 미완료 항목 전체 (지난 항목 + 예정 항목), 마감일 오름차순
  const pendingTodos = todos
    .filter((td) => !td.is_done && td.due_date !== todayStr)
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));

  const rowProps = (todo, draggable, compact = false, hideDate = false) => ({
    todo,
    editing: editingId === todo.id,
    editTitle, editDueDate, editPriority,
    setEditTitle, setEditDueDate, setEditPriority,
    onToggle: () => handleToggle(todo.id),
    onDelete: () => handleDelete(todo.id),
    onStartEdit: () => startEdit(todo),
    onCancelEdit: cancelEdit,
    onSaveEdit: () => saveEdit(todo.id),
    onSaveDetails: (startTime, memo) => saveDetails(todo.id, startTime, memo),
    draggable,
    onDragStart: draggable ? () => handleDragStart(todo.id) : undefined,
    onDragOver: draggable ? handleDragOver : undefined,
    onDrop: draggable ? (e) => handleDrop(e, todo.id) : undefined,
    overdue: isOverdue(todo),
    t,
    compact,
    hideDate,
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
    setPanelTitle("");
    setPanelPriority("medium");
    // 날짜를 고르면 그날 할 일이 바로 보이도록 패널이 접혀 있었다면 강제로 펼침
    setCalendarPanelCollapsed(false);
    localStorage.setItem("todoCalendarPanelCollapsed", "false");
  };

  const selectedDateTodos = selectedDate ? (todosByDate[selectedDate] || []) : [];
  const selectedDateLabel = selectedDate
    ? new Intl.DateTimeFormat(i18n.language === "ko" ? "ko-KR" : "en-US", {
        month: "long",
        day: "numeric",
        weekday: "short",
      }).format(parseLocalDate(selectedDate))
    : "";

  return (
    <SidebarLayout selectedCategoryId={null} onSelectCategory={handleSelectCategory}>
      <div className="flex-1 min-w-[520px] overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-8 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-gray-100">
            <SidebarSpacer />
            <ListTodo size={20} className="text-blue-600 dark:text-blue-400" /> {t("sidebar.todo")}
          </div>
          {todayTodos.length > 0 && (
            <span className="text-sm text-gray-400 dark:text-gray-500">
              {t("todo.completedCount", { done: doneTodos.length, total: todayTodos.length })}
            </span>
          )}
        </div>

        <div className={`px-8 py-8 ${viewMode === "calendar" ? "max-w-5xl" : "w-full"}`}>
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
          </div>

          {error && <div className="text-sm text-red-500 dark:text-red-400 mb-3">{error}</div>}

          {viewMode === "list" ? (
            <>
              {/* 추가 폼 - 시작 시간/메모는 안 채워도 생성 가능한 선택 입력이라 아래 줄에 상시 노출 */}
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
                    onClick={handleAdd}
                    disabled={adding || !newTitle.trim()}
                    className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Plus size={14} /> {t("todo.add")}
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <TimePicker value={newStartTime} onChange={setNewStartTime} placeholder={t("todo.startTimeOptional")} />
                  <input
                    type="text"
                    value={newMemo}
                    onChange={(e) => setNewMemo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    placeholder={t("todo.memoPlaceholder")}
                    className="flex-1 min-w-[200px] border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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

              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell) => {
                  const dayTodos = todosByDate[cell.dateStr] || [];
                  const isToday = cell.dateStr === todayStr;
                  const isSelected = cell.dateStr === selectedDate;
                  const visible = dayTodos.slice(0, 3);
                  const extra = dayTodos.length - visible.length;

                  return (
                    <button
                      key={cell.dateStr}
                      onClick={() => handleSelectDate(cell.dateStr)}
                      className={`text-left rounded-lg border p-1.5 min-h-[76px] transition-colors ${
                        isSelected
                          ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                          : "border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-500/40"
                      } ${!cell.currentMonth ? "opacity-40" : ""}`}
                    >
                      <div
                        className={`text-xs mb-1 ${
                          isToday
                            ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white font-semibold"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {cell.day}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {visible.map((td) => (
                          <div
                            key={td.id}
                            className={`flex items-center gap-1 text-[11px] truncate ${td.is_done ? "opacity-50 line-through" : ""}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityMeta(td.priority).dot}`} />
                            <span className="truncate text-gray-600 dark:text-gray-300">{td.title}</span>
                          </div>
                        ))}
                        {extra > 0 && <div className="text-[11px] text-gray-400 dark:text-gray-500">+{extra}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {viewMode === "list" && (
        <ResizableRightPanel
          className="p-5 flex flex-col gap-3 sticky top-0 h-screen"
          defaultWidth={320}
          minWidth={260}
          maxWidth={480}
          minLeftWidth={520}
          collapsible
          storageKey="todoListPanelCollapsed"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1 shrink-0">
            <ListChecks size={15} className="text-blue-600 dark:text-blue-400" />
            {t("todo.pendingTitle")}
            <span className="ml-auto text-xs font-normal text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {pendingTodos.length}
            </span>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto flex-1">
            {pendingTodos.length === 0 ? (
              <div className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">{t("todo.pendingEmpty")}</div>
            ) : (
              pendingTodos.map((todo) => (
                <TodoRow key={todo.id} {...rowProps(todo, false, true)} />
              ))
            )}
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

              <div className="flex flex-col gap-2 overflow-y-auto flex-1">
                {selectedDateTodos.length === 0 ? (
                  <div className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">{t("todo.emptyState")}</div>
                ) : (
                  selectedDateTodos.map((todo) => (
                    <TodoRow key={todo.id} {...rowProps(todo, false, false, true)} />
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2 shrink-0">
                <input
                  type="text"
                  value={panelTitle}
                  onChange={(e) => setPanelTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePanelAdd()}
                  placeholder={t("todo.addPlaceholder")}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <PriorityButtonGroup value={panelPriority} onChange={setPanelPriority} />
                <button
                  onClick={handlePanelAdd}
                  disabled={panelAdding || !panelTitle.trim()}
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
