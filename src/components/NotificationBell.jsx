import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getInAppReminders } from "../lib/api";

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  async function fetchReminders() {
    try {
      setLoading(true);
      const data = await getInAppReminders();
      setReminders(data?.reminders || []);
      setUnreadCount(data?.unreadCount || 0);
    } catch (_err) {
      // Ignore background reminder fetch error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, 60000); // 1 min refresh
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function handleDismiss(id) {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-border bg-surface text-muted-text hover:bg-bg hover:text-text transition-colors"
        aria-label="Open reminders and notifications"
        title="Reminders & Notifications"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5 fill-none stroke-current stroke-2">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-4.5 sm:w-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-surface animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-surface p-3 sm:p-4 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-border pb-2.5 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text">Reminders & Alerts</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-extrabold text-red-600 dark:text-red-400">
                  {unreadCount} action{unreadCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={fetchReminders}
              className="text-[11px] text-accent hover:underline"
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
            {reminders.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-text">All caught up!</p>
                <p className="text-[11px] text-muted-text mt-0.5">
                  No pending reminders or urgent alerts.
                </p>
              </div>
            ) : (
              reminders.map((r) => {
                const isUrgent = r.type === "URGENT";
                const isWarning = r.type === "WARNING";
                const isSuccess = r.type === "SUCCESS";

                const badgeBg = isUrgent
                  ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                  : isWarning
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                  : isSuccess
                  ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";

                return (
                  <div
                    key={r.id}
                    className="relative rounded-xl border border-border bg-bg/60 p-3 hover:border-accent/40 transition-all text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeBg}`}
                      >
                        {r.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDismiss(r.id)}
                        className="text-muted-text hover:text-text text-xs p-0.5"
                        title="Dismiss"
                        aria-label="Dismiss reminder"
                      >
                        &times;
                      </button>
                    </div>

                    <p className="mt-1.5 text-xs font-bold text-text">{r.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-text leading-relaxed">
                      {r.message}
                    </p>

                    {r.actionLabel && r.actionUrl && (
                      <div className="mt-2.5 pt-2 border-t border-border/50 flex justify-end">
                        <Link
                          to={r.actionUrl.includes("/subscription") && !r.actionUrl.includes("#") ? `${r.actionUrl}#plans-grid` : r.actionUrl}
                          onClick={() => {
                            setOpen(false);
                            if (r.actionUrl.includes("/subscription")) {
                              setTimeout(() => {
                                const el = document.getElementById("plans-grid");
                                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                              }, 100);
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                        >
                          <span>{r.actionLabel}</span>
                          <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current stroke-2">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;

