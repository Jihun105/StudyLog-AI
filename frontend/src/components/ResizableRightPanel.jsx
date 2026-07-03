import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

// minLeftWidth: 패널을 늘릴 때 왼쪽 콘텐츠(사이드바 제외)가 이 값보다 좁아지지 않도록 제한.
// 0이면 기존처럼 제한 없음(다른 페이지의 기존 동작 그대로 유지).
// collapsible: true면 왼쪽 사이드바처럼 접었다 펼 수 있는 버튼이 생김 (기본값 false = 기존 페이지들 동작 그대로 유지).
// storageKey: 접힘 상태를 localStorage에 저장할 때 쓸 키. 안 주면 새로고침 시 항상 펼쳐진 상태로 시작.
// collapsed/onCollapsedChange: 둘 다 주면 "제어 컴포넌트"로 동작 - 부모가 접힘 상태를 직접 갖고 있다가
// 특정 동작(예: 달력에서 날짜 클릭) 시 강제로 펼치고 싶을 때 사용. 안 주면 기존처럼 내부에서 알아서 관리.
// autoCollapseBreakpoint: 왼쪽 사이드바(SidebarLayout)와 동일한 방식 - 창 폭이 이 값보다 좁아지면
// 자동으로 접히고, 다시 넓어지면 자동으로 펼쳐짐(단, 사용자가 직접 펼치고 좁아진 경우엔 그대로 유지).
// 제어 컴포넌트일 때는 부모가 알아서 관리하는 게 맞으므로 적용 안 함.
function ResizableRightPanel({
  children, defaultWidth = 288, minWidth = 200, maxWidth = 560, minLeftWidth = 0, className = "",
  collapsible = false, storageKey = null, collapsed: collapsedProp, onCollapsedChange, autoCollapseBreakpoint = 0,
}) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(defaultWidth);
  const isControlled = collapsedProp !== undefined;
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    if (!collapsible) return false;
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) return saved === "true";
    }
    if (autoCollapseBreakpoint) return window.innerWidth < autoCollapseBreakpoint;
    return false;
  });
  const collapsed = isControlled ? collapsedProp : internalCollapsed;
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(defaultWidth);
  const dynamicMaxWidth = useRef(maxWidth);
  const panelRef = useRef(null);
  // 창 크기 때문에 "자동으로" 접힌 건지, 사용자가 버튼을 눌러 "직접" 접은 건지 구분.
  // 자동으로 접힌 경우에만 창이 다시 넓어질 때 자동으로 펼침.
  const autoCollapsedRef = useRef(false);

  const toggleCollapsed = () => {
    const next = !collapsed;
    if (storageKey) localStorage.setItem(storageKey, String(next));
    if (isControlled) {
      onCollapsedChange?.(next);
    } else {
      autoCollapsedRef.current = false;
      setInternalCollapsed(next);
    }
  };

  useEffect(() => {
    if (!collapsible || isControlled || !autoCollapseBreakpoint) return;
    const handleResize = () => {
      const isSmall = window.innerWidth < autoCollapseBreakpoint;
      if (isSmall && !internalCollapsed) {
        autoCollapsedRef.current = true;
        setInternalCollapsed(true);
      } else if (!isSmall && internalCollapsed && autoCollapsedRef.current) {
        autoCollapsedRef.current = false;
        setInternalCollapsed(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [collapsible, isControlled, autoCollapseBreakpoint, internalCollapsed]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;

    // 왼쪽 콘텐츠(드래그 핸들 기준 두 칸 앞 형제 요소)의 현재 폭을 측정해서,
    // "패널폭 + 왼쪽폭" 총합이 드래그 도중 바뀌지 않는다는 점을 이용해 늘릴 수 있는 최대치를 계산
    if (minLeftWidth > 0) {
      const leftContentEl = panelRef.current?.previousElementSibling?.previousElementSibling;
      const leftContentWidth = leftContentEl ? leftContentEl.getBoundingClientRect().width : Infinity;
      dynamicMaxWidth.current = Math.min(maxWidth, width + leftContentWidth - minLeftWidth);
    } else {
      dynamicMaxWidth.current = maxWidth;
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [width, maxWidth, minLeftWidth]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const delta = startX.current - e.clientX;
    const newWidth = Math.min(Math.max(startWidth.current + delta, minWidth), dynamicMaxWidth.current);
    setWidth(newWidth);
  }, [minWidth]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (collapsible && collapsed) {
    return (
      <button
        onClick={toggleCollapsed}
        title={t("common.expandPanel")}
        className="fixed top-4 right-4 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500"
      >
        <PanelRightOpen size={18} />
      </button>
    );
  }

  return (
    <>
      {/* 드래그 핸들 (+ 접기 버튼) */}
      <div className="relative shrink-0 h-full">
        <div
          onMouseDown={handleMouseDown}
          className="w-1 h-full bg-gray-100 dark:bg-gray-700 hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors cursor-col-resize"
        />
        {collapsible && (
          <button
            onClick={toggleCollapsed}
            title={t("common.collapsePanel")}
            className="absolute top-4 -left-2.5 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-full p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500"
          >
            <PanelRightClose size={12} />
          </button>
        )}
      </div>
      {/* 패널 */}
      <div
        ref={panelRef}
        style={{ width: `${width}px` }}
        className={`shrink-0 bg-white dark:bg-gray-800 border-l border-gray-100 dark:border-gray-700 overflow-y-auto overflow-x-auto min-w-0 ${className}`}
      >
        {children}
      </div>
    </>
  );
}

export default ResizableRightPanel;
