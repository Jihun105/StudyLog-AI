import { useEffect, useRef } from "react";

// 좌우로 갈수록 작아지고 흐려지며 살짝 회전한 카드들이 가운데의 큰 카드를 감싸는
// "커버플로우"형 캐러셀. 마우스 휠을 돌리면 가운데 카드가 옆으로 밀리듯 바뀜
// (레퍼런스: 포켓몬 카드 게임 앱의 확장팩 선택 화면 - 옆 카드들이 작고 비스듬하게 보임)
function NoteCarousel({ items, activeIndex, setActiveIndex }) {
  const containerRef = useRef(null);
  // wheel 핸들러(아래 useEffect)는 마운트 시 한 번만 붙기 때문에, 그 안에서 최신
  // items.length를 읽으려면 매 렌더마다 갱신되는 ref로 참조해야 함(안 그러면 클로저에
  // 갇힌 최초 길이값으로 클램핑돼서 노트가 늘어나도 마지막 카드까지 못 감)
  const itemsLengthRef = useRef(items.length);
  itemsLengthRef.current = items.length;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (Math.abs(e.deltaY) < 2) return;
      // 카드 영역 위에서 휠을 돌릴 때 페이지 전체가 같이 스크롤되지 않도록 막음.
      // React의 onWheel prop은 브라우저 스크롤 성능을 위해 기본적으로 패시브 리스너로
      // 등록돼서 그 안에서 preventDefault()를 호출해도 무시됨(콘솔 경고만 뜸) - 그래서
      // ref + addEventListener로 직접 { passive: false } 리스너를 등록해야 실제로 먹힘
      e.preventDefault();
      const dir = e.deltaY > 0 ? 1 : -1;
      setActiveIndex((prev) => Math.min(itemsLengthRef.current - 1, Math.max(0, prev + dir)));
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [setActiveIndex]);

  // 아이템 개수가 줄어들 때(로딩 등) activeIndex가 범위를 벗어나지 않도록 보정
  const safeActive = Math.min(Math.max(activeIndex, 0), Math.max(items.length - 1, 0));

  return (
    <div
      ref={containerRef}
      className="relative h-[300px] overflow-hidden [perspective:1200px]"
    >
      {items.map((item, i) => {
        const offset = i - safeActive;
        const abs = Math.abs(offset);
        if (abs > 2) return null; // 너무 멀리 있는 카드는 그리지 않음(성능 + 어차피 안 보임)

        const translateX = offset * 150;
        const scale = abs === 0 ? 1 : abs === 1 ? 0.82 : 0.66;
        const rotateY = abs === 0 ? 0 : offset > 0 ? -16 * abs : 16 * abs;
        const opacity = abs === 0 ? 1 : abs === 1 ? 0.8 : 0.4;
        const zIndex = 30 - abs;

        return (
          <div
            key={item.id}
            onClick={() => (offset === 0 ? item.onActivate?.() : setActiveIndex(i))}
            style={{
              transform: `translate(-50%, -50%) translateX(${translateX}px) scale(${scale}) rotateY(${rotateY}deg)`,
              opacity,
              zIndex,
            }}
            className="absolute top-1/2 left-1/2 w-56 aspect-[4/5] cursor-pointer transition-all duration-300 ease-out"
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
}

export default NoteCarousel;
