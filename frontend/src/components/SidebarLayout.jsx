import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { useTranslation } from "react-i18next";
import { PanelLeftOpen } from "lucide-react";
import Sidebar from "./Sidebar";

// 사이드바가 접혔는지를 각 페이지의 헤더에 전달하기 위한 컨텍스트.
// 접혔을 때 뜨는 재오픈 버튼은 fixed라 실제 레이아웃 공간을 차지하지 않는데, 그렇다고 헤더 위에
// 별도의 "여백용 박스"를 겹쳐 그리면 헤더 배경/높이를 페이지마다 따로 추정해야 해서 색/높이가
// 미묘하게 안 맞는 단차가 생김. 대신 각 페이지의 헤더 "안"에 여백을 두면(SidebarSpacer 참고)
// 헤더 자체의 배경이 그대로 이어지므로 색/높이를 맞출 필요 자체가 없어짐
export const SidebarCollapsedContext = createContext(false);

// 페이지 헤더 맨 앞에 넣는 여백 - 사이드바가 접혔을 때만 재오픈 버튼과 안 겹치도록 폭을 확보함
export function SidebarSpacer() {
  const collapsed = useContext(SidebarCollapsedContext);
  if (!collapsed) return null;
  return <span className="w-6 shrink-0" />;
}

const BREAKPOINT = 1024; // 이 너비 미만이면 사이드바 자동으로 숨김
const MOBILE_BREAKPOINT = 640; // 이 너비 미만(휴대폰)에서 사이드바를 다시 열면, 콘텐츠를 밀어내는 대신 오버레이(드로어)로 띄움
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

  // 휴대폰 폭(MOBILE_BREAKPOINT 미만)에서 사이드바를 펼치면, 콘텐츠 폭을 밀어내는
  // 기존 방식 대신 화면 위에 오버레이(드로어)로 띄움 - 안 그러면 사이드바 폭만큼
  // 본문이 밀려나면서 화면이 옆으로 잘려 보이는 문제가 있음
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);

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
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
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
      <SidebarCollapsedContext.Provider value={true}>
        {/* 위치는 그대로 두고(fixed top-4 left-4), 카드처럼 튀는 테두리/그림자를 없애서
            헤더 바 자체에 원래 있던 아이콘 버튼처럼 자연스럽게 녹아들도록 스타일만 변경.
            여백은 더 이상 여기서 별도 박스로 흉내내지 않고, 각 페이지 헤더 안의
            <SidebarSpacer />가 담당함 (헤더 자신의 배경/높이를 그대로 쓰므로 단차가 생기지 않음) */}
        <button
          onClick={toggleCollapsed}
          title={t("sidebar.expand")}
          className="fixed top-4 left-4 z-20 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 p-2 rounded-lg"
        >
          <PanelLeftOpen size={18} />
        </button>
        {children}
      </SidebarCollapsedContext.Provider>
    );
  }

  // 휴대폰 폭에서는 사이드바가 콘텐츠를 밀어내지 않고, 화면 위에 오버레이(드로어)로
  // 뜨도록 함 - 뒤에 반투명 배경을 깔아서 탭하면 닫히고, 콘텐츠는 원래 폭 그대로 유지됨
  if (isMobile) {
    return (
      <SidebarCollapsedContext.Provider value={false}>
        <div className="fixed inset-0 bg-black/40 z-30" onClick={toggleCollapsed} />
        <div
          style={{ width: `${Math.min(width, 300)}px` }}
          className="fixed inset-y-0 left-0 z-40 h-full shadow-xl"
        >
          <Sidebar {...sidebarProps} onCollapse={toggleCollapsed} />
        </div>
        {children}
      </SidebarCollapsedContext.Provider>
    );
  }

  return (
    <SidebarCollapsedContext.Provider value={false}>
      <div style={{ width: `${width}px` }} className="shrink-0 h-full">
        <Sidebar {...sidebarProps} onCollapse={toggleCollapsed} />
      </div>
      <div
        onMouseDown={handleMouseDown}
        className="w-1 shrink-0 bg-gray-100 dark:bg-gray-700 hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors cursor-col-resize"
      />
      {children}
    </SidebarCollapsedContext.Provider>
  );
}

export default SidebarLayout;
