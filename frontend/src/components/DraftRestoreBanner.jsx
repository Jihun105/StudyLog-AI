// 저장 실패/새로고침 등으로 인한 데이터 유실을 막기 위해 브라우저에 자동 임시저장해둔
// 내용이 있을 때, 그걸 불러올지 무시할지 사용자에게 물어보는 배너
function DraftRestoreBanner({ message, restoreLabel, discardLabel, onRestore, onDiscard }) {
  return (
    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 px-4 py-3 rounded-lg mb-4 text-sm flex items-center justify-between gap-3">
      <span>{message}</span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onRestore}
          className="px-3 py-1 rounded-md bg-amber-600 text-white text-xs font-medium hover:bg-amber-700"
        >
          {restoreLabel}
        </button>
        <button
          onClick={onDiscard}
          className="px-3 py-1 rounded-md border border-amber-300 dark:border-amber-500/40 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-500/20"
        >
          {discardLabel}
        </button>
      </div>
    </div>
  );
}

export default DraftRestoreBanner;
