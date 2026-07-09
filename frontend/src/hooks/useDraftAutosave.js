import { useEffect, useRef } from "react";

// 저장 실패(또는 새로고침/탭 닫힘)로 작성 중이던 내용이 통째로 날아가는 사고를 막기 위한
// 안전망. 서버 저장과는 완전히 별개로, 타이핑하는 동안 주기적으로 브라우저에만
// 임시저장해둔다. 실제 저장(서버)에 성공하면 clearDraft()로 지워야 함.
const DEBOUNCE_MS = 1500;

export function loadDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // localStorage를 못 쓰는 환경(사파일 프라이빗 모드 등)이거나 저장된 값이 깨져있어도
    // 임시저장 기능 자체가 페이지를 못 쓰게 만들면 안 되므로 조용히 무시
    return null;
  }
}

export function clearDraft(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

// data가 바뀔 때마다 DEBOUNCE_MS 뒤에 localStorage에 저장. enabled=false면 아무것도 안 함
// (예: 아직 서버에서 원본 데이터를 불러오는 중일 때 빈 값으로 덮어쓰는 것을 방지)
export function useDraftAutosave(key, data, enabled = true) {
  const timerRef = useRef(null);
  // data를 매 렌더마다 새 객체로 넘겨도 실제 내용이 같으면 다시 저장하지 않도록 문자열로 비교
  const serialized = JSON.stringify(data);

  useEffect(() => {
    if (!enabled) return undefined;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify({ ...data, savedAt: Date.now() }));
      } catch {}
    }, DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, serialized]);
}

// 새로고침/탭 닫기/외부 링크 이동 시, 저장 안 된 내용이 있으면 브라우저 기본 확인창을 띄움.
// (같은 앱 안에서 사이드바 클릭 등으로 이동하는 경우는 React Router가 data router가
// 아니라서 여기서는 막지 못함 - 다만 자동 임시저장이 있어서 그 경우도 draft로 복구 가능)
export function useBeforeUnloadWarning(shouldWarn) {
  useEffect(() => {
    const handler = (e) => {
      if (!shouldWarn) return;
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [shouldWarn]);
}
