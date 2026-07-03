import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { PanelLeftOpen } from "lucide-react";
import Sidebar from "./Sidebar";

const BREAKPOINT = 1024; // 이 너비 미만이면 사이드바 자동으로 숨김
const DEFAULT_WIDTH = 256;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

// 사이드바를 쓰는 페이지(HomePage, QuizPage, DocumentsPage)들이 공통으로 사용하는 래퍼.
// 접힘/폭 상태를 여기 한 군데서만 관리해서 페이지마다 중복 구현되지 않게 함.
function SidebarLayout({ children, ...sidebarProps }) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved !== null) return saved === "true";
    return window.innerWidth < BREAKPOINT;
  });
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem("sidebarWidth"));
    return saved >= MIN_WIDTH && saved <= MAX_WIDTH ? saved : DEFAULT_WIDTH;
  });
  // 화면이 좁아져서 "자동으로" 접힌 건지, 사용자가 "직접" 접은 건지 구분.
  // 자동으로 접힌 경우에만 화면이 다시 넓어질 때 자동으로 펼침.
  const autoCollapsed = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      const isSmall = window.innerWidth < BREAKPOINT;
      if (isSmall && !collapsed) {
        autoCollapsed.current = true;
        setCollapsed(true);
      } else if (!isSmall && collapsed && autoCollapsed.current) {
        autoCollapsed.current = false;
        setCollapsed(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [collapsed]);

  const toggleCollapsed = () => {
    autoCollapsed.current = false;
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", String(next));
      return next;
    });
  };

  // 드래그로 폭 조절 (ResizableRightPanel과 동일한 방식, 방향만 반대)
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(width);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [width]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const delta = e.clientX - startX.current;
    const newWidth = Math.min(Math.max(startWidth.current + delta, MIN_WIDTH), MAX_WIDTH);
    setWidth(newWidth);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    setWidth((w) => {
      localStorage.setItem("sidebarWidth", String(w));
      return w;
    });
  }, []);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (collapsed) {
    return (
      <>
        <button
          onClick={toggleCollapsed}
          title={t("sidebar.expand")}
          className="fixed top-4 left-4 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500"
        >
          <PanelLeftOpen size={18} />
        </button>
        {children}
      </>
    );
  }

  return (
    <>
      <div style={{ width: `${width}px` }} className="shrink-0 h-full">
        <Sidebar {...sidebarProps} onCollapse={toggleCollapsed} />
      </div>
      <div
        onMouseDown={handleMouseDown}
        className="w-1 shrink-0 bg-gray-100 dark:bg-gray-700 hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors cursor-col-resize"
      />
      {children}
    </>
  );
}

export default SidebarLayout;
