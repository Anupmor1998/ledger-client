import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { format, isValid, parseISO } from "date-fns";
import CopyableText from "../components/CopyableText";
import OrderActivityModal from "../components/OrderActivityModal";
import useDebounce from "../hooks/useDebounce";
import { useAppSelector } from "../store/hooks";
import { getCurrentFinancialYearStart, getFinancialYearLabel } from "../utils/financialYear";
import { getOrderActivity, getOrderActivityFeed } from "../lib/api";

const SEARCH_FIELDS = [
  { value: "orderNo", label: "Order No" },
  { value: "action", label: "Action" },
  { value: "customerName", label: "Customer Name" },
  { value: "customerFirmName", label: "Customer Firm" },
  { value: "manufacturerName", label: "Manufacturer Name" },
  { value: "manufacturerFirmName", label: "Manufacturer Firm" },
  { value: "qualityName", label: "Quality" },
];

const ACTION_META = {
  CREATED: { label: "Created", tone: "border-emerald-400/40 bg-emerald-500/10 text-emerald-600" },
  UPDATED: { label: "Updated", tone: "border-blue-400/40 bg-blue-500/10 text-blue-600" },
  PROGRESS_UPDATED: { label: "Progress changed", tone: "border-cyan-400/40 bg-cyan-500/10 text-cyan-600" },
  COMPLETED: { label: "Completed", tone: "border-emerald-400/40 bg-emerald-500/10 text-emerald-600" },
  REOPENED: { label: "Reopened", tone: "border-amber-400/40 bg-amber-500/10 text-amber-600" },
  CANCELLED: { label: "Cancelled", tone: "border-red-400/40 bg-red-500/10 text-red-600" },
  DELETED: { label: "Deleted", tone: "border-red-400/40 bg-red-500/10 text-red-600" },
  CARRIED_FORWARD: { label: "Carried forward", tone: "border-violet-400/40 bg-violet-500/10 text-violet-600" },
};

const BATCH_SIZES = [10, 20, 50];
const COLLAPSED_HEIGHT = 72;
const EXPANDED_HEIGHT = 168;

function parseListResponse(payload) {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      pagination: {
        total: payload.length,
        page: 1,
        limit: payload.length || 10,
        totalPages: 1,
      },
    };
  }

  return {
    items: payload?.items || [],
    pagination: payload?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 },
  };
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  return isValid(date) ? format(date, "dd-MM-yyyy, HH:mm") : "-";
}

function formatPartyName(party) {
  if (!party) return "-";
  return party.firmName || party.name || "-";
}

function getActionMeta(action) {
  return ACTION_META[action] || { label: action || "Activity", tone: "border-border bg-bg text-foreground" };
}

function getChangedFields(activity) {
  const fields = activity?.metadata?.changedFields;
  return Array.isArray(fields) ? fields : [];
}

function estimateRowHeight(activity, expanded, heightMap) {
  const measured = heightMap.get(activity.id);
  if (Number.isFinite(measured)) {
    return measured;
  }
  return expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
}

function buildPrefix(items, expandedMap, heightMap) {
  const prefix = [0];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const height = estimateRowHeight(item, Boolean(expandedMap[item.id]), heightMap);
    prefix[index + 1] = prefix[index] + height;
  }
  return prefix;
}

function findIndexByScroll(prefix, scrollTop) {
  let low = 0;
  let high = prefix.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (prefix[mid] <= scrollTop && prefix[mid + 1] > scrollTop) {
      return mid;
    }
    if (prefix[mid] < scrollTop) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return Math.max(0, low - 1);
}

function getActivitySummary(activity) {
  const action = activity?.action || "";
  const orderNo = activity?.order?.orderNo ? `Order #${activity.order.orderNo}` : "Order";
  const customer = formatPartyName(activity?.order?.customer);
  const manufacturer = formatPartyName(activity?.order?.manufacturer);
  const quality = activity?.order?.quality?.name || "-";

  if (action === "PROGRESS_UPDATED") {
    return `${orderNo} progress was changed for ${customer}, handled by ${manufacturer} (${quality}).`;
  }
  if (action === "COMPLETED") {
    return `${orderNo} was marked completed for ${customer}.`;
  }
  if (action === "REOPENED") {
    return `${orderNo} was reopened so work could continue.`;
  }
  if (action === "CANCELLED") {
    return `${orderNo} was cancelled.`;
  }
  if (action === "CARRIED_FORWARD") {
    return `${orderNo} was carried forward into the new financial year.`;
  }
  if (action === "CREATED") {
    return `${orderNo} was created for ${customer}.`;
  }
  return `${orderNo} was updated.`;
}

function CompactActivityRow({ activity, expanded, onToggle, onOpenTimeline, onMeasure, financialYearStart }) {
  const rowRef = useRef(null);
  const changedFields = useMemo(() => getChangedFields(activity), [activity]);
  const actionMeta = useMemo(() => getActionMeta(activity.action), [activity.action]);
  const order = activity.order || null;
  const customerName = formatPartyName(order?.customer);
  const manufacturerName = formatPartyName(order?.manufacturer);

  useEffect(() => {
    const node = rowRef.current;
    if (!node) return undefined;

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
    <article ref={rowRef} className="rounded-xl border border-border bg-surface px-2 py-2 sm:px-3 sm:py-2.5">
      <button
        type="button"
        onClick={() => onToggle(activity.id)}
        className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-left xl:flex-nowrap"
        aria-expanded={expanded}
      >
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 fill-none stroke-current stroke-2 transition-transform ${
            expanded ? "rotate-90" : "rotate-0"
          }`}
        >
          <path d="M9 6l6 6-6 6" />
        </svg>

        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] sm:text-[11px] font-medium uppercase tracking-wide ${actionMeta.tone}`}>
          {actionMeta.label}
        </span>

        <span className="hidden shrink-0 rounded-full border border-border bg-bg px-2 py-0.5 text-[10px] xl:inline-flex xl:text-[11px] uppercase tracking-wide muted-text">
          {formatDateTime(activity.createdAt)}
        </span>

        <span className="hidden shrink-0 rounded-full border border-border bg-bg px-2 py-0.5 text-[10px] sm:inline-flex sm:text-[11px] uppercase tracking-wide muted-text">
          FY {order?.fyStartYear || financialYearStart}
        </span>

        <span className="shrink-0 rounded-full border border-border bg-bg px-2 py-0.5 text-[10px] sm:text-[11px] uppercase tracking-wide muted-text">
          #{order?.orderNo ?? "-"}
        </span>

        <span className="min-w-0 flex-1 truncate text-xs sm:text-sm font-medium">
          <span className="xl:hidden">{customerName}</span>
          <span className="hidden xl:inline">
            {customerName} | {manufacturerName} | {order?.quality?.name || "-"}
          </span>
        </span>

        <span className="hidden shrink-0 text-xs muted-text xl:inline">{changedFields.length || 0} changes</span>
      </button>

      {expanded ? (
        <div className="mt-2 grid gap-2 border-t border-border pt-2 sm:grid-cols-[1.5fr_1fr_1fr]">
          <div className="rounded-lg border border-border bg-bg/40 px-3 py-2 text-sm">
            <p className="text-[11px] uppercase tracking-wide muted-text">What happened</p>
            <p className="mt-1 text-sm">{getActivitySummary(activity)}</p>
          </div>
          <div className="rounded-lg border border-border bg-bg/40 px-3 py-2 text-sm">
            <p className="text-[11px] uppercase tracking-wide muted-text">Changed fields</p>
            <p className="mt-1 text-sm">{changedFields.slice(0, 4).join(", ") || "No tracked field diff."}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-sky-400/40 px-3 py-2 text-sm text-sky-500 hover:bg-sky-50"
              onClick={() => onOpenTimeline(order)}
              disabled={!order?.id}
            >
              Timeline
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function OrderActivityPage() {
  const selectedFinancialYearStart = useAppSelector(
    (state) => state.auth.user?.selectedFinancialYearStart || getCurrentFinancialYearStart()
  );
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextPage, setNextPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchField, setSearchField] = useState("orderNo");
  const [searchInput, setSearchInput] = useState("");
  const [batchSize, setBatchSize] = useState(20);
  const [sortOrder, setSortOrder] = useState("desc");
  const [expandedMap, setExpandedMap] = useState({});
  const [timelineOrder, setTimelineOrder] = useState(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(720);
  const debouncedSearch = useDebounce(searchInput.trim(), 300);

  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);
  const heightMapRef = useRef(new Map());
  const requestIdRef = useRef(0);

  const loadPage = useCallback(
    async ({ page, replace = false }) => {
      const requestId = ++requestIdRef.current;
      replace ? setLoading(true) : setLoadingMore(true);

      try {
        const payload = await getOrderActivityFeed({
          page,
          limit: batchSize,
          search: debouncedSearch,
          searchField,
          sortBy: "createdAt",
          sortOrder,
        });

        if (requestId !== requestIdRef.current) return;

        const parsed = parseListResponse(payload);
        const nextItems = Array.isArray(parsed.items) ? parsed.items : [];
        const totalCount = Number(parsed.pagination?.total || 0);

        setItems((current) => (replace ? nextItems : [...current, ...nextItems]));
        setTotal(totalCount);
        setHasMore(page * batchSize < totalCount && nextItems.length > 0);
        setNextPage(page + 1);
      } catch (error) {
        if (requestId === requestIdRef.current) {
          const message = error?.response?.data?.message || error?.message || "Unable to load order activities.";
          toast.error(message);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [batchSize, debouncedSearch, searchField, sortOrder]
  );

  useEffect(() => {
    setItems([]);
    setExpandedMap({});
    setHasMore(true);
    setNextPage(1);
    setTotal(0);
    heightMapRef.current.clear();
    setScrollTop(0);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    loadPage({ page: 1, replace: true });
  }, [batchSize, debouncedSearch, loadPage, searchField, sortOrder]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return undefined;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry?.contentRect?.height) {
        setViewportHeight(entry.contentRect.height);
      }
    });

    observer.observe(root);
    setViewportHeight(root.getBoundingClientRect().height || 720);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    const target = sentinelRef.current;
    if (!root || !target) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading && !loadingMore) {
          loadPage({ page: nextPage, replace: false });
        }
      },
      { root, rootMargin: "300px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadPage, loading, loadingMore, nextPage]);

  const prefix = useMemo(
    () => buildPrefix(items, expandedMap, heightMapRef.current),
    [items, expandedMap]
  );
  const totalHeight = prefix[prefix.length - 1] || 0;

  const { startIndex, endIndex } = useMemo(() => {
    if (items.length === 0) return { startIndex: 0, endIndex: -1 };
    const overscan = 6;
    const start = Math.max(0, findIndexByScroll(prefix, scrollTop) - overscan);
    const visibleBottom = scrollTop + viewportHeight;
    let end = start;
    while (end < items.length && prefix[end] < visibleBottom) {
      end += 1;
    }
    return { startIndex: start, endIndex: Math.min(items.length - 1, end + overscan) };
  }, [items.length, prefix, scrollTop, viewportHeight]);

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const topSpacer = prefix[startIndex] || 0;
  const bottomSpacer = Math.max(0, totalHeight - (prefix[endIndex + 1] || totalHeight));

  const handleMeasure = useCallback((id, height) => {
    const nextHeight = Math.max(64, Number(height || 0));
    if (heightMapRef.current.get(id) !== nextHeight) {
      heightMapRef.current.set(id, nextHeight);
      setExpandedMap((current) => ({ ...current }));
    }
  }, []);

  const handleToggle = useCallback((id) => {
    setExpandedMap((current) => ({ ...current, [id]: !current[id] }));
  }, []);

  const handleOpenTimeline = useCallback((order) => {
    if (order?.id) setTimelineOrder(order);
  }, []);

  return (
    <section className="auth-card p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center rounded-full border border-border bg-bg px-3 py-1 text-xs uppercase tracking-[0.2em] muted-text">
            Order activity feed
          </div>
          <h2 className="mt-2 text-xl font-semibold">Order Activity</h2>
          <p className="mt-1 max-w-2xl text-sm muted-text">
            Compact, expandable activity log for FY {getFinancialYearLabel(selectedFinancialYearStart)}.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-bg px-4 py-3">
            <p className="text-xs uppercase tracking-wide muted-text">Events</p>
            <p className="mt-1 text-lg font-semibold">{total || 0}</p>
          </div>
          <div className="rounded-2xl border border-border bg-bg px-4 py-3">
            <p className="text-xs uppercase tracking-wide muted-text">Loaded</p>
            <p className="mt-1 text-lg font-semibold">{items.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-bg px-4 py-3">
            <p className="text-xs uppercase tracking-wide muted-text">Mode</p>
            <p className="mt-1 text-sm font-medium">{hasMore ? "Infinite scroll" : "All loaded"}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-bg/50 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center">
          <select
            className="form-input w-full lg:w-52"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
          >
            {SEARCH_FIELDS.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
          <input
            className="form-input w-full lg:min-w-[320px]"
            placeholder={`Search ${searchField === "orderNo" ? "order no" : "activity"}...`}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
          <select
            className="form-input w-full py-2 lg:w-28"
            value={batchSize}
            onChange={(e) => setBatchSize(Number(e.target.value))}
          >
            {BATCH_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="ghost-btn w-full whitespace-nowrap lg:w-auto"
            onClick={() => setSortOrder((current) => (current === "asc" ? "desc" : "asc"))}
          >
            {sortOrder === "desc" ? "Newest first" : "Oldest first"}
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        className="mt-4 h-[calc(100dvh-280px)] min-h-[22rem] overflow-y-auto rounded-2xl border border-border bg-surface p-2 sm:h-[calc(100dvh-320px)] sm:min-h-[24rem]"
      >
        {loading && items.length === 0 ? (
          <div className="rounded-xl border border-border bg-bg p-4 text-sm muted-text">Loading activity feed...</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-border bg-bg p-4 text-sm muted-text">
            No order activity found for the selected filters.
          </div>
        ) : (
          <div style={{ height: totalHeight, position: "relative" }}>
            <div style={{ transform: `translateY(${topSpacer}px)` }} className="space-y-2">
              {visibleItems.map((activity) => (
                <CompactActivityRow
                  key={activity.id}
                  activity={activity}
                  expanded={Boolean(expandedMap[activity.id])}
                  onToggle={handleToggle}
                  onOpenTimeline={handleOpenTimeline}
                  onMeasure={handleMeasure}
                  financialYearStart={selectedFinancialYearStart}
                />
              ))}
            </div>
            <div style={{ height: bottomSpacer }} />
            <div ref={sentinelRef} className="h-6" />
          </div>
        )}

        {loadingMore ? <div className="mt-2 p-3 text-sm muted-text">Loading more activity...</div> : null}
        {!hasMore && items.length > 0 ? <div className="mt-2 p-3 text-sm muted-text">End of activity feed.</div> : null}
      </div>

      {timelineOrder ? (
        <OrderActivityModal
          order={timelineOrder}
          onClose={() => setTimelineOrder(null)}
          getActivity={getOrderActivity}
        />
      ) : null}
    </section>
  );
}

export default OrderActivityPage;
