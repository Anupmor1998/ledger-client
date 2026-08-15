import { useEffect, useMemo, useRef } from "react";
import {
  describeChanges,
  formatDateTime,
  getActionLabel,
  getActionTone,
  getActorLabel,
  getChangeEntries,
  getOrderSummary,
} from "../utils/orderActivityView";

function OrderActivityAccordionRow({
  activity,
  expanded,
  onToggle,
  onMeasure,
  onOpenTimeline,
  financialYearStart,
  showTimelineButton = true,
}) {
  const rowRef = useRef(null);
  const changeEntries = useMemo(() => getChangeEntries(activity), [activity]);
  const summary = useMemo(() => getOrderSummary(activity), [activity]);
  const rowId = `activity-${activity.id}`;
  const panelId = `${rowId}-panel`;
  const actionLabel = getActionLabel(activity.action);
  const tone = getActionTone(activity.action);
  const actorLabel = getActorLabel(activity);
  const order = activity.order || null;

  useEffect(() => {
    const node = rowRef.current;
    if (!node || typeof onMeasure !== "function") {
      return undefined;
    }

    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => onMeasure(activity.id, Math.ceil(node.getBoundingClientRect().height)));
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      return () => cancelAnimationFrame(raf);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [activity.id, expanded, onMeasure]);

  return (
    <article
      ref={rowRef}
      className="rounded-2xl border border-border bg-surface px-3 py-3 sm:px-4 sm:py-4"
    >
      <h3 className="text-inherit">
        <button
          type="button"
          id={rowId}
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => onToggle(activity.id)}
          className="flex w-full min-w-0 items-start gap-3 text-left"
        >
          <svg
            viewBox="0 0 24 24"
            className={`mt-0.5 h-5 w-5 shrink-0 fill-none stroke-current stroke-2 transition-transform ${
              expanded ? "rotate-90" : "rotate-0"
            }`}
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tone}`}>
                {actionLabel}
              </span>
              <span className="shrink-0 rounded-full border border-border bg-bg px-2.5 py-0.5 text-[11px] uppercase tracking-wide muted-text">
                {formatDateTime(activity.createdAt)}
              </span>
              <span className="shrink-0 rounded-full border border-border bg-bg px-2.5 py-0.5 text-[11px] uppercase tracking-wide muted-text">
                FY {order?.fyStartYear || financialYearStart}
              </span>
              <span className="shrink-0 rounded-full border border-border bg-bg px-2.5 py-0.5 text-[11px] uppercase tracking-wide muted-text">
                #{order?.orderNo ?? "-"}
              </span>
              <span className="shrink-0 rounded-full border border-border bg-bg px-2.5 py-0.5 text-[11px] uppercase tracking-wide muted-text">
                {actorLabel}
              </span>
            </div>

            <p className="mt-2 truncate text-sm font-medium sm:text-base">{summary}</p>
            <p className="mt-1 text-xs muted-text">
              {changeEntries.length > 0
                ? `${changeEntries.length} meaningful field change${changeEntries.length === 1 ? "" : "s"}`
                : "No meaningful field changes recorded"}
            </p>
          </div>
        </button>
      </h3>

      {expanded ? (
        <div id={panelId} role="region" aria-labelledby={rowId} className="mt-4 border-t border-border pt-4">
          <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-xl border border-border bg-bg/40 p-3">
              <p className="text-xs uppercase tracking-wide muted-text">What changed</p>
              <p className="mt-1 text-sm">{describeChanges(activity, changeEntries)}</p>
            </div>

            <div className="rounded-xl border border-border bg-bg/40 p-3">
              <p className="text-xs uppercase tracking-wide muted-text">Order context</p>
              <div className="mt-2 grid gap-2 text-sm">
                <p>
                  <span className="muted-text">Customer:</span> {order?.customer?.firmName || order?.customer?.name || "-"}
                </p>
                <p>
                  <span className="muted-text">Manufacturer:</span> {order?.manufacturer?.firmName || order?.manufacturer?.name || "-"}
                </p>
                <p>
                  <span className="muted-text">Quality:</span> {order?.quality?.name || "-"}
                </p>
              </div>
            </div>
          </div>

          {changeEntries.length > 0 ? (
            <div className="mt-3 space-y-2">
              {changeEntries.map((entry) => (
                <div key={entry.field} className="rounded-xl border border-border bg-bg/30 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{entry.label}</p>
                      <p className="mt-1 text-xs muted-text">
                        Changed from {entry.beforeValue} to {entry.afterValue}
                      </p>
                    </div>
                    <div className="grid min-w-0 gap-2 sm:min-w-[240px] sm:grid-cols-2">
                      <div className="rounded-lg border border-border bg-surface p-2">
                        <p className="text-[10px] uppercase tracking-wide muted-text">Before</p>
                        <p className="mt-1 text-sm font-medium">{entry.beforeValue}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-surface p-2">
                        <p className="text-[10px] uppercase tracking-wide muted-text">Now</p>
                        <p className="mt-1 text-sm font-medium">{entry.afterValue}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-border bg-bg/30 p-4 text-sm muted-text">
              This change did not contain any meaningful before/after value differences.
            </div>
          )}

          {showTimelineButton ? (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="ghost-btn w-auto"
                onClick={() => onOpenTimeline?.(order)}
                disabled={!order?.id}
              >
                Timeline
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default OrderActivityAccordionRow;
