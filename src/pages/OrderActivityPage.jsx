import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import OrderActivityAccordionRow from "../components/OrderActivityAccordionRow";
import OrderActivityModal from "../components/OrderActivityModal";
import SearchableSelect from "../components/SearchableSelect";
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

const BATCH_SIZES = [10, 20, 50];
const COLLAPSED_HEIGHT = 104;
const EXPANDED_HEIGHT = 260;

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
    const overscan = 4;
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
    const nextHeight = Math.max(COLLAPSED_HEIGHT, Number(height || 0));
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
            Compact, understandable activity log for FY {getFinancialYearLabel(selectedFinancialYearStart)}.
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
          <SearchableSelect
            label=""
            value={searchField}
            onChange={setSearchField}
            options={SEARCH_FIELDS}
            placeholder="Search field"
            className="w-full lg:w-52"
          />
          <input
            className="form-input w-full lg:min-w-[320px]"
            placeholder={`Search ${searchField === "orderNo" ? "order no" : "activity"}...`}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
          <SearchableSelect
            label=""
            value={String(batchSize)}
            onChange={(nextValue) => setBatchSize(Number(nextValue))}
            options={BATCH_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
            placeholder="Rows"
            className="w-full lg:w-28"
          />
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
          <div className="rounded-xl border border-border bg-bg p-4 text-sm muted-text">
            Loading activity feed...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-border bg-bg p-4 text-sm muted-text">
            No order activity found for the selected filters.
          </div>
        ) : (
          <div style={{ height: totalHeight, position: "relative" }}>
            <div style={{ transform: `translateY(${topSpacer}px)` }} className="space-y-2">
              {visibleItems.map((activity) => (
                <OrderActivityAccordionRow
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
