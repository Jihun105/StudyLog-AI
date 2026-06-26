import { useState, useRef, useCallback, useEffect } from "react";

function ResizableRightPanel({ children, defaultWidth = 288, minWidth = 200, maxWidth = 560, className = "" }) {
  const [width, setWidth] = useState(defaultWidth);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(defaultWidth);

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
    const delta = startX.current - e.clientX;
    const newWidth = Math.min(Math.max(startWidth.current + delta, minWidth), maxWidth);
    setWidth(newWidth);
  }, [minWidth, maxWidth]);

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

  return (
    <>
      {/* 드래그 핸들 */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1 shrink-0 bg-gray-100 hover:bg-blue-400 transition-colors cursor-col-resize"
      />
      {/* 패널 */}
      <div
        style={{ width: `${width}px` }}
        className={`shrink-0 bg-white overflow-y-auto ${className}`}
      >
        {children}
      </div>
    </>
  );
}

export default ResizableRightPanel;
