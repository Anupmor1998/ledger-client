import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfToday,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function CalendarIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  minDate,
  disabled = false,
  className = "",
  showPresets = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 288, openAbove: false });
  const containerRef = useRef(null);
  const popoverRef = useRef(null);

  // Parse current selected date
  const selectedDate = value
    ? (() => {
        try {
          const parsed = typeof value === "string" ? parseISO(value) : new Date(value);
          return isValid(parsed) ? parsed : null;
        } catch {
          return null;
        }
      })()
    : null;

  // Currently viewed month in calendar
  const [viewDate, setViewDate] = useState(() => selectedDate || startOfToday());

  // Keep viewDate in sync when value changes
  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [value]);

  // Position calculation: calculates floating viewport coordinates so it never affects modal layout
  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 288;
    const popoverHeight = 350;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Flip above if tight on bottom space
    const openAbove = spaceBelow < popoverHeight && spaceAbove > spaceBelow;

    const top = openAbove
      ? Math.max(8, rect.top - popoverHeight - 6)
      : Math.min(window.innerHeight - popoverHeight - 8, rect.bottom + 6);

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12);
    }

    setCoords({
      top,
      left,
      width: popoverWidth,
      openAbove,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    function handleScrollOrResize() {
      updatePosition();
    }

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  // Handle outside click to close popover
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const today = startOfToday();
  const effectiveMinDate = minDate ? startOfToday() : null;

  // Calendar dates generation
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  function handleSelectDate(day) {
    const formatted = format(day, "yyyy-MM-dd");
    onChange?.(formatted);
    setIsOpen(false);
  }

  function handleClear(e) {
    e?.stopPropagation();
    onChange?.("");
    setIsOpen(false);
  }

  function handleQuickPreset(daysToAdd) {
    const target = addDays(today, daysToAdd);
    handleSelectDate(target);
  }

  const currentYear = today.getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear + i);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Input Trigger */}
      <div
        onClick={() => {
          if (!disabled) {
            updatePosition();
            setIsOpen((prev) => !prev);
          }
        }}
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-bg text-xs cursor-pointer transition select-none ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-accent/60"
        } ${isOpen ? "ring-1 ring-accent border-accent" : ""}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-text" />
          <span
            className={`truncate font-medium ${
              selectedDate ? "text-text font-semibold" : "text-muted-text"
            }`}
          >
            {selectedDate ? format(selectedDate, "dd MMM yyyy") : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedDate && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded text-muted-text hover:text-red-500 hover:bg-red-500/10 transition"
              title="Clear date"
            >
              ✕
            </button>
          )}
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 text-muted-text transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Floating Popup mounted outside modal DOM tree (zero space in modal) */}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 9999,
            }}
            className="w-72 rounded-xl border border-border bg-surface p-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Quick Presets */}
            {showPresets && (
              <div className="mb-3 border-b border-border pb-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-text mb-1.5">
                  Quick Presets
                </p>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: "+7 Days", days: 7 },
                    { label: "+15 Days", days: 15 },
                    { label: "+30 Days", days: 30 },
                    { label: "+90 Days", days: 90 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleQuickPreset(preset.days)}
                      className="px-1.5 py-1 rounded text-[10px] font-bold border border-border bg-bg hover:bg-accent/10 hover:border-accent/40 text-muted-text hover:text-accent transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Month & Year Navigation Header */}
            <div className="flex items-center justify-between gap-1 mb-2.5">
              <button
                type="button"
                onClick={() => setViewDate((prev) => subMonths(prev, 1))}
                className="p-1 rounded-lg border border-border bg-bg text-muted-text hover:text-text hover:bg-surface transition"
                title="Previous month"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <div className="flex items-center gap-1.5">
                {/* Month Selector */}
                <select
                  value={viewDate.getMonth()}
                  onChange={(e) => {
                    const newDate = new Date(viewDate);
                    newDate.setMonth(parseInt(e.target.value, 10));
                    setViewDate(newDate);
                  }}
                  className="text-xs font-bold bg-transparent text-text cursor-pointer focus:outline-none"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx} className="bg-surface text-text">
                      {name}
                    </option>
                  ))}
                </select>

                {/* Year Selector */}
                <select
                  value={viewDate.getFullYear()}
                  onChange={(e) => {
                    const newDate = new Date(viewDate);
                    newDate.setFullYear(parseInt(e.target.value, 10));
                    setViewDate(newDate);
                  }}
                  className="text-xs font-bold bg-transparent text-text cursor-pointer focus:outline-none"
                >
                  {years.map((yr) => (
                    <option key={yr} value={yr} className="bg-surface text-text">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setViewDate((prev) => addMonths(prev, 1))}
                className="p-1 rounded-lg border border-border bg-bg text-muted-text hover:text-text hover:bg-surface transition"
                title="Next month"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-text mb-1 uppercase tracking-wider">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, today);
                const isPast = effectiveMinDate && isBefore(day, effectiveMinDate);

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isPast}
                    onClick={() => handleSelectDate(day)}
                    className={`h-7 w-7 rounded-lg text-xs font-medium flex items-center justify-center transition select-none ${
                      isSelected
                        ? "bg-accent text-white font-bold shadow-xs"
                        : isPast
                        ? "opacity-30 cursor-not-allowed text-muted-text"
                        : !isCurrentMonth
                        ? "text-muted-text/40 hover:bg-bg"
                        : isToday
                        ? "border border-accent/40 font-bold text-accent hover:bg-accent/10"
                        : "text-text hover:bg-bg"
                    }`}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            {/* Footer Controls */}
            <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => handleSelectDate(today)}
                className="text-[11px] font-bold text-accent hover:underline"
              >
                Today
              </button>

              {selectedDate && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] font-semibold text-muted-text hover:text-red-500"
                >
                  Clear / Never Expire
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-bold text-muted-text hover:text-text px-2 py-0.5 rounded border border-border bg-bg"
              >
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
