import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getInAppReminders } from "../lib/api";
import { useAppSelector } from "../store/hooks";

function getStoredIds(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (_e) {
    return new Set();
  }
}

function saveStoredIds(storageKey, idSet) {
  try {
    const arr = Array.from(idSet).slice(-200); // Retain last 200 IDs to avoid unbounded storage
    localStorage.setItem(storageKey, JSON.stringify(arr));
  } catch (_e) {
    // Ignore storage quota errors
  }
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const lastFetchTimeRef = useRef(0);

  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.id || user?.userId || "global";
  const readStorageKey = `sauda_read_reminders_${userId}`;
  const dismissStorageKey = `sauda_dismissed_reminders_${userId}`;

  const [readIds, setReadIds] = useState(() => getStoredIds(readStorageKey));
  const [dismissedIds, setDismissedIds] = useState(() => getStoredIds(dismissStorageKey));

  // Sync state if userId changes (e.g. login/switch account)
  useEffect(() => {
    setReadIds(getStoredIds(readStorageKey));
    setDismissedIds(getStoredIds(dismissStorageKey));
  }, [readStorageKey, dismissStorageKey]);

  const fetchReminders = useCallback(async (force = false) => {
    const now = Date.now();
    // Throttle duplicate fetches within 15 seconds unless explicitly forced
    if (!force && now - lastFetchTimeRef.current < 15000) {
      return;
    }

    try {
      setLoading(true);
      lastFetchTimeRef.current = now;
      const data = await getInAppReminders();
      const allReminders = data?.reminders || [];
      const currentReadIds = getStoredIds(readStorageKey);
      const currentDismissedIds = getStoredIds(dismissStorageKey);

      // Filter out dismissed reminders
      const visible = allReminders.filter((r) => !currentDismissedIds.has(r.id));
      const unread = visible.filter((r) => !currentReadIds.has(r.id));

      setReminders(visible);
      setReadIds(currentReadIds);
      setDismissedIds(currentDismissedIds);
      setUnreadCount(unread.length);
    } catch (_err) {
      // Ignore background reminder fetch error
    } finally {
      setLoading(false);
    }
  }, [readStorageKey, dismissStorageKey]);

  // 1. Initial fetch on mount
  useEffect(() => {
    fetchReminders(true);
  }, [fetchReminders]);

  // 2. Smart Event-Driven listeners:
  // - Visibility Change: Only fetch when user switches back to active tab
  // - Window Focus: Fetch when returning to browser window
  // - Online event: Re-sync when network reconnects
  useEffect(() => {
    function handleVisibilityOrFocus() {
      if (document.visibilityState === "visible") {
        fetchReminders();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
    window.addEventListener("online", handleVisibilityOrFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("online", handleVisibilityOrFocus);
    };
  }, [fetchReminders]);

  // 3. Fallback idle interval: Every 3 minutes ONLY while the document is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchReminders();
      }
    }, 180000); // 3 minutes idle refresh

    return () => clearInterval(interval);
  }, [fetchReminders]);

  // 4. Close dropdown on click or touch outside
  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleOutside);
      document.addEventListener("touchstart", handleOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  // 5. Open bell: Trigger a fresh check when user opens the menu
  function handleToggleOpen() {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        fetchReminders();
      }
      return next;
    });
  }

  // Mark single reminder as read
  const handleMarkAsRead = useCallback((id) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveStoredIds(readStorageKey, next);
      return next;
    });
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, [readStorageKey]);

  // Mark all visible reminders as read
  const handleMarkAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      reminders.forEach((r) => next.add(r.id));
      saveStoredIds(readStorageKey, next);
      return next;
    });
    setUnreadCount(0);
  }, [readStorageKey, reminders]);

  // Dismiss a reminder (persisted in localStorage)
  const handleDismiss = useCallback((id) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveStoredIds(dismissStorageKey, next);
      return next;
    });
    setReminders((prev) => prev.filter((r) => r.id !== id));
    if (!readIds.has(id)) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, [dismissStorageKey, readIds]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggleOpen}
        className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-border bg-surface text-muted-text hover:bg-bg hover:text-text transition-colors"
        aria-label="Open reminders and notifications"
        title="Reminders & Notifications"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5 fill-none stroke-current stroke-2 shrink-0">
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
        <div className="fixed left-3 right-3 top-[70px] sm:left-auto sm:right-0 sm:top-full mt-1 sm:mt-2 sm:w-96 max-w-md mx-auto sm:max-w-none sm:mx-0 rounded-2xl border border-border bg-surface p-3 sm:p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-border pb-2.5 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text">Reminders & Alerts</span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-extrabold text-red-600 dark:text-red-400">
                  {unreadCount} unread
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  All read
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline cursor-pointer transition-colors"
                  title="Mark all notifications as read"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current stroke-2 shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => fetchReminders(true)}
                className="text-[11px] text-muted-text hover:text-text cursor-pointer transition-colors"
                disabled={loading}
                title="Check for new updates"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="max-h-[min(24rem,65vh)] overflow-y-auto space-y-2.5 pr-1">
            {reminders.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2 shrink-0">
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
                const isRead = readIds.has(r.id);
                const isUrgent = r.type === "URGENT";
                const isWarning = r.type === "WARNING";
                const isSuccess = r.type === "SUCCESS";
                const isOffer = r.type === "OFFER";

                const badgeBg = isUrgent
                  ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                  : isWarning
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                  : isSuccess
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : isOffer
                  ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 font-extrabold"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";

                return (
                  <div
                    key={r.id}
                    onClick={(e) => {
                      if (e.target.closest("button") || e.target.closest("a")) return;
                      if (!isRead) handleMarkAsRead(r.id);
                    }}
                    className={`relative rounded-xl border p-3 transition-all text-left ${
                      isRead
                        ? "border-border/60 bg-bg/40 opacity-80 hover:opacity-100 hover:border-border"
                        : "border-border bg-surface hover:border-accent/40 shadow-xs cursor-pointer"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeBg}`}
                        >
                          {r.category}
                        </span>
                        {!isRead && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-accent">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                            New
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!isRead && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(r.id);
                            }}
                            className="p-1 rounded text-muted-text hover:text-accent hover:bg-bg transition-colors"
                            title="Mark as read"
                            aria-label="Mark as read"
                          >
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2 shrink-0">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss(r.id);
                          }}
                          className="p-1 rounded text-muted-text hover:text-red-500 hover:bg-bg transition-colors"
                          title="Dismiss"
                          aria-label="Dismiss reminder"
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2 shrink-0">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <p className={`mt-1.5 text-xs break-words ${isRead ? "font-medium text-text/80" : "font-bold text-text"}`}>
                      {r.title}
                    </p>
                    <p className={`mt-0.5 text-[11px] leading-relaxed break-words ${isRead ? "text-muted-text/80" : "text-muted-text"}`}>
                      {r.message}
                    </p>

                    {r.actionLabel && r.actionUrl && (
                      <div className="mt-2.5 pt-2 border-t border-border/50 flex justify-end">
                        <Link
                          to={r.actionUrl.includes("/subscription") && !r.actionUrl.includes("#") ? `${r.actionUrl}#plans-grid` : r.actionUrl}
                          onClick={() => {
                            handleMarkAsRead(r.id);
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
                          <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current stroke-2 shrink-0">
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