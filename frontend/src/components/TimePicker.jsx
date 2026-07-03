import { useState, useRef, useEffect } from "react";
import { Clock, X } from "lucide-react";

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1~12
const MINUTES_5 = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...,55

function to24Hour(hour12, isPM) {
  const base = hour12 % 12;
  return isPM ? base + 12 : base;
}

function from24Hour(h24) {
  const isPM = h24 >= 12;
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, isPM };
}

// 시간 선택 전용 커스텀 드롭다운 (브라우저 기본 time 피커 대체)
export default function TimePicker({ value, onChange, placeholder = "시간 선택" }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const hasValue = Boolean(value);
  const [h24Raw, mRaw] = hasValue ? value.split(":").map(Number) : [9, 0];
  const { hour12, isPM } = from24Hour(h24Raw);
  const minute = mRaw;

  const displayLabel = hasValue
    ? `${isPM ? "오후" : "오전"} ${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    : placeholder;

  const commit = (nextHour12, nextIsPM, nextMinute) => {
    const hh = to24Hour(nextHour12, nextIsPM);
    onChange(`${String(hh).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`);
  };

  return (
    <div className="relative inline-block" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-sm border rounded-lg pl-2.5 pr-2 py-1.5 transition-colors ${
          hasValue
            ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            : "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
        }`}
      >
        <Clock size={13} className="shrink-0" />
        <span>{displayLabel}</span>
        {hasValue && (
          <X
            size={12}
            className="ml-0.5 text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
          />
        )}
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg p-2 flex gap-1.5 w-[216px]">
          <div className="flex flex-col gap-0.5 w-14 shrink-0">
            {[
              { label: "오전", pm: false },
              { label: "오후", pm: true },
            ].map(({ label, pm }) => (
              <button
                key={label}
                type="button"
                onClick={() => commit(hour12, pm, minute)}
                className={`text-xs font-medium rounded-lg px-2 py-1.5 transition-colors ${
                  isPM === pm
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-2 gap-1.5">
            <div className="h-40 overflow-y-auto flex flex-col gap-0.5 pr-1">
              {HOURS_12.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => commit(h, isPM, minute)}
                  className={`text-sm rounded-lg py-1 transition-colors ${
                    hour12 === h
                      ? "bg-blue-50 text-blue-600 font-medium dark:bg-blue-900/40 dark:text-blue-300"
                      : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {String(h).padStart(2, "0")}
                </button>
              ))}
            </div>
            <div className="h-40 overflow-y-auto flex flex-col gap-0.5 pl-1 border-l border-gray-100 dark:border-gray-700">
              {MINUTES_5.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => commit(hour12, isPM, m)}
                  className={`text-sm rounded-lg py-1 transition-colors ${
                    minute === m
                      ? "bg-blue-50 text-blue-600 font-medium dark:bg-blue-900/40 dark:text-blue-300"
                      : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {String(m).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
