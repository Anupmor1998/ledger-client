import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import SearchableSelect from "../components/SearchableSelect";
import { getMarketDirectory } from "../lib/api";

function formatRate(val) {
  const num = Number(val || 0);
  if (!num) return "-";
  return `₹${num.toFixed(2)}`;
}

function formatDateDisplay(val) {
  if (!val) return "-";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "-";
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()] || "";
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (_e) {
    return "-";
  }
}

function cleanPhoneForWhatsApp(phone) {
  if (!phone) return "";
  let digits = String(phone).replace(/\D/g, "");
  if (digits.length === 10) {
    digits = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = `91${digits.slice(1)}`;
  }
  return digits;
}

function MarketDirectoryPage() {
  const [partyType, setPartyType] = useState("buyer"); // "buyer" | "seller"
  const [selectedQualityId, setSelectedQualityId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [data, setData] = useState({
    topQualities: [],
    allQualities: [],
    parties: [],
    selectedQuality: null,
    summary: { totalParties: 0, totalOrders: 0, lastMarketRate: 0, totalVolume: 0 },
  });
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState("");

  // Load directory data whenever partyType, selectedQualityId, or searchInput changes
  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      setLoading(true);
      try {
        const res = await getMarketDirectory({
          partyType,
          qualityId: selectedQualityId || undefined,
          search: searchInput.trim() || undefined,
        });
        if (isMounted) {
          setData(res);
        }
      } catch (error) {
        if (isMounted) {
          const message =
            error?.response?.data?.message || error?.message || "Failed to load directory";
          toast.error(message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [partyType, selectedQualityId, searchInput]);

  const qualityOptions = useMemo(() => {
    return (data.allQualities || []).map((q) => ({
      value: q.id,
      label: q.name,
      badge: q.orderCount > 0 ? `${q.orderCount} deals` : undefined,
    }));
  }, [data.allQualities]);

  const selectedQualityName = useMemo(() => {
    if (data.selectedQuality?.name) return data.selectedQuality.name;
    const found = (data.allQualities || []).find((q) => q.id === selectedQualityId);
    if (found?.name) return found.name;
    const topFound = (data.topQualities || []).find((q) => q.id === selectedQualityId);
    if (topFound?.name) return topFound.name;
    return "this quality";
  }, [data.selectedQuality, data.allQualities, data.topQualities, selectedQualityId]);

  function handleOpenWhatsApp(party) {
    const cleanPhone = cleanPhoneForWhatsApp(party.phone);
    if (!cleanPhone) {
      toast.warn("No valid phone number for WhatsApp");
      return;
    }

    const qualityName = selectedQualityName;
    const firm = party.firmName ? ` (${party.firmName})` : "";
    const greeting = party.name ? `Hello ${party.name}${firm}` : `Hello${firm}`;
    const text = isBuyer
      ? `${greeting}, we have availability & fresh offer for ${qualityName}. Please let us know if you have any requirements.`
      : `${greeting}, we have buyer inquiry for ${qualityName}. Please share your current availability and best rates.`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleCopyPhone(party) {
    if (!party.phone) return;
    navigator.clipboard.writeText(party.phone);
    setCopiedId(party.id);
    toast.info("Phone copied to clipboard");
    setTimeout(() => setCopiedId(""), 2000);
  }

  const isBuyer = partyType === "buyer";
  const partyLabelSingular = isBuyer ? "Buyer" : "Seller";
  const partyLabelPlural = isBuyer ? "Buyers" : "Sellers";

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full min-w-0">
      {/* Header & Description */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-text">
            Market Directory
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm muted-text">
            Find buyers and sellers by fabric quality with instant WhatsApp outreach.
          </p>
        </div>

        {/* Segmented Party Type Toggle */}
        <div className="inline-flex rounded-xl border border-border bg-surface p-1 shadow-sm shrink-0 self-start sm:self-auto max-w-full">
          <button
            type="button"
            onClick={() => setPartyType("buyer")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition ${
              isBuyer
                ? "bg-accent text-white shadow-sm"
                : "text-muted-text hover:text-text hover:bg-bg"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-none stroke-current stroke-2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Buyers</span>
          </button>
          <button
            type="button"
            onClick={() => setPartyType("seller")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition ${
              !isBuyer
                ? "bg-accent text-white shadow-sm"
                : "text-muted-text hover:text-text hover:bg-bg"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-none stroke-current stroke-2">
              <path d="M3 21h18" />
              <path d="M5 21V7l8-4v18" />
              <path d="M19 21V11l-6-4" />
              <path d="M9 9v.01M9 13v.01M9 17v.01" />
            </svg>
            <span>Sellers</span>
          </button>
        </div>
      </div>

      {/* Main Search & Control Card */}
      <div className="rounded-xl sm:rounded-2xl border border-border bg-surface p-3 sm:p-5 shadow-sm space-y-3 w-full max-w-full min-w-0 box-border overflow-hidden">
        <div className="grid gap-3 sm:gap-4 md:grid-cols-3 w-full min-w-0">
          {/* Quality Selector */}
          <div className="md:col-span-2 min-w-0">
            <SearchableSelect
              label="Select Fabric Quality"
              value={selectedQualityId}
              onChange={(val) => setSelectedQualityId(val)}
              options={qualityOptions}
              placeholder="Search & choose a quality..."
            />
          </div>

          {/* Party Search Filter */}
          <div className="min-w-0">
            <span className="mb-1 block text-xs font-medium text-text uppercase tracking-wider">
              Filter by Party / Phone
            </span>
            <div className="relative">
              <input
                type="text"
                className="form-input w-full pr-8 text-sm"
                placeholder={`Search ${partyLabelPlural.toLowerCase()}...`}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs muted-text hover:text-text"
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Quick Quality Chips */}
        {data.topQualities && data.topQualities.length > 0 ? (
          <div className="border-t border-border/70 pt-2.5 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider muted-text">
                Popular Qualities:
              </span>
              {selectedQualityId ? (
                <button
                  type="button"
                  onClick={() => setSelectedQualityId("")}
                  className="text-xs text-accent hover:underline font-semibold"
                >
                  Clear Quality
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-24 overflow-y-auto no-scrollbar">
              {data.topQualities.map((q) => {
                const isSelected = selectedQualityId === q.id;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setSelectedQualityId(isSelected ? "" : q.id)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                      isSelected
                        ? "bg-accent text-white shadow-sm ring-2 ring-accent/30"
                        : "border border-border/80 bg-bg/60 text-muted-text hover:border-accent/40 hover:text-text hover:bg-bg"
                    }`}
                  >
                    <span className="truncate max-w-[140px] sm:max-w-none">{q.name}</span>
                    <span
                      className={`rounded px-1 text-[10px] ${
                        isSelected ? "bg-white/20 text-white" : "bg-border text-muted-text"
                      }`}
                    >
                      {q.orderCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* Summary KPI Cards (When Quality is Selected) */}
      {selectedQualityId ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 w-full min-w-0">
          <div className="rounded-xl border border-border bg-surface p-2.5 sm:p-4 shadow-sm min-w-0 overflow-hidden">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider muted-text truncate">
              {partyLabelPlural}
            </p>
            <p className="mt-0.5 text-lg sm:text-2xl font-bold text-text truncate">
              {data.summary?.totalParties || 0}
            </p>
            <p className="text-[10px] sm:text-xs text-emerald-500 truncate font-medium">
              In {selectedQualityName}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-2.5 sm:p-4 shadow-sm min-w-0 overflow-hidden">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider muted-text truncate">
              Last Rate
            </p>
            <p className="mt-0.5 text-lg sm:text-2xl font-bold text-accent truncate">
              {formatRate(data.summary?.lastMarketRate)}
            </p>
            <p className="text-[10px] sm:text-xs muted-text truncate">Latest deal</p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-2.5 sm:p-4 shadow-sm min-w-0 overflow-hidden">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider muted-text truncate">
              Total Deals
            </p>
            <p className="mt-0.5 text-lg sm:text-2xl font-bold text-text truncate">
              {data.summary?.totalOrders || 0}
            </p>
            <p className="text-[10px] sm:text-xs muted-text truncate">Orders</p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-2.5 sm:p-4 shadow-sm min-w-0 overflow-hidden">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider muted-text truncate">
              Traded Qty
            </p>
            <p className="mt-0.5 text-lg sm:text-2xl font-bold text-text truncate">
              {(data.summary?.totalVolume || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] sm:text-xs muted-text truncate">Units</p>
          </div>
        </div>
      ) : null}

      {/* Content Body */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent mb-2" />
          <p className="text-xs sm:text-sm muted-text">Loading {partyLabelPlural.toLowerCase()}...</p>
        </div>
      ) : !selectedQualityId ? (
        /* Empty / Discovery State: When No Quality Is Picked */
        <div className="space-y-4 sm:space-y-6">
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-6 sm:p-10 text-center">
            <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-accent/10 text-accent mb-3">
              <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6 fill-none stroke-current stroke-2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-text">Select a Fabric Quality</h3>
            <p className="mt-1 text-xs sm:text-sm muted-text max-w-md mx-auto">
              Choose a quality above or tap one of the top qualities below to see matching {partyLabelPlural.toLowerCase()}.
            </p>
          </div>

          {/* Trending Qualities Grid */}
          {data.topQualities && data.topQualities.length > 0 ? (
            <div className="w-full min-w-0">
              <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider muted-text mb-2.5">
                Top Traded Qualities
              </h3>
              <div className="grid grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0">
                {data.topQualities.map((q) => (
                  <div
                    key={q.id}
                    className="flex flex-col justify-between rounded-xl border border-border bg-surface p-3 sm:p-4 transition hover:border-accent/40 shadow-sm w-full min-w-0 max-w-full overflow-hidden box-border"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <h4 className="font-semibold text-text text-sm sm:text-base truncate">{q.name}</h4>
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent shrink-0">
                          {q.orderCount} deals
                        </span>
                      </div>
                      <p className="mt-1 text-xs muted-text truncate">
                        Volume: {q.totalQuantity.toLocaleString("en-IN")} units
                      </p>
                    </div>

                    <div className="mt-3 flex gap-2 border-t border-border/60 pt-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => {
                          setPartyType("buyer");
                          setSelectedQualityId(q.id);
                        }}
                        className="flex-1 rounded-lg border border-border bg-bg/50 py-1.5 text-xs font-semibold text-text hover:border-accent/50 hover:bg-bg transition text-center truncate"
                      >
                        🛍️ Find Buyers
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPartyType("seller");
                          setSelectedQualityId(q.id);
                        }}
                        className="flex-1 rounded-lg border border-border bg-bg/50 py-1.5 text-xs font-semibold text-text hover:border-accent/50 hover:bg-bg transition text-center truncate"
                      >
                        🏭 Find Sellers
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : data.parties.length === 0 ? (
        /* Empty State: Quality Selected but No Parties Found */
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 sm:p-12 text-center shadow-sm w-full min-w-0">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 mb-2.5">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-text">
            No {partyLabelPlural} Found
          </h3>
          <p className="mt-1 text-xs sm:text-sm muted-text max-w-sm mx-auto">
            {searchInput
              ? `No ${partyLabelPlural.toLowerCase()} match "${searchInput}" for ${selectedQualityName}.`
              : `No orders recorded for ${selectedQualityName} with ${partyLabelPlural.toLowerCase()}. Try toggling to ${isBuyer ? "Sellers" : "Buyers"}.`}
          </p>
          <div className="mt-3.5 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setPartyType(isBuyer ? "seller" : "buyer")}
              className="primary-btn sm:w-auto text-xs sm:text-sm py-2 px-4"
            >
              Switch to {isBuyer ? "Sellers" : "Buyers"}
            </button>
          </div>
        </div>
      ) : (
        /* Compact Party Cards Grid */
        <div className="w-full min-w-0">
          <div className="flex items-center justify-between mb-2 px-0.5 w-full min-w-0">
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider muted-text truncate">
              {partyLabelPlural} in {selectedQualityName} ({data.parties?.length || 0})
            </h3>
            <span className="text-[11px] muted-text shrink-0 pl-2">
              Sorted by deals
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0">
            {data.parties.map((party) => {
              const cleanPhone = cleanPhoneForWhatsApp(party.phone);
              const avatarChar = (party.firmName || party.name || "P").charAt(0).toUpperCase();

              return (
                <div
                  key={party.id}
                  className="w-full min-w-0 max-w-full rounded-xl border border-border bg-surface p-3 sm:p-4 shadow-sm transition hover:border-accent/40 hover:shadow-md flex flex-col justify-between gap-2.5 box-border overflow-hidden"
                >
                  {/* Top Row: Avatar + Firm Name + Rate Badge */}
                  <div className="flex items-start justify-between gap-2 min-w-0 w-full">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Circular Avatar */}
                      <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent font-bold text-xs sm:text-sm border border-accent/25 shadow-sm">
                        {avatarChar}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4
                          className="font-semibold text-text text-sm sm:text-base leading-tight truncate"
                          title={party.firmName || party.name}
                        >
                          {party.firmName || party.name}
                        </h4>
                        {party.firmName && party.name ? (
                          <p className="text-xs text-muted-text truncate mt-0.5">
                            {party.name}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Rate & Deals Top-Right Badge */}
                    <div className="text-right shrink-0 pl-1">
                      <div className="text-sm sm:text-base font-bold text-accent leading-tight whitespace-nowrap">
                        {formatRate(party.lastRate)}
                      </div>
                      <div className="text-[11px] muted-text font-medium mt-0.5 whitespace-nowrap">
                        {party.orderCount} {party.orderCount === 1 ? "deal" : "deals"}
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Inline Stats Strip */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-text border-t border-border/50 pt-2 min-w-0 w-full">
                    <div className="inline-flex items-center gap-1 shrink-0">
                      <span className="text-muted-text text-[11px]">Last:</span>
                      <span className="font-semibold text-text">{formatDateDisplay(party.lastOrderDate)}</span>
                    </div>

                    <div className="inline-flex items-center gap-1 shrink-0">
                      <span className="text-muted-text text-[11px]">Qty:</span>
                      <span className="font-semibold text-text">
                        {(party.totalQuantity || 0).toLocaleString("en-IN")} {party.quantityUnit || "Takka"}
                      </span>
                    </div>

                    {party.avgRate && party.avgRate !== party.lastRate ? (
                      <div className="inline-flex items-center gap-1 shrink-0">
                        <span className="text-muted-text text-[11px]">Avg:</span>
                        <span className="font-semibold text-accent">{formatRate(party.avgRate)}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Address Line (if present) */}
                  {party.address ? (
                    <p className="text-[11px] text-muted-text truncate w-full min-w-0" title={party.address}>
                      📍 {party.address}
                    </p>
                  ) : null}

                  {/* Bottom Row: Actions */}
                  <div className="flex items-center gap-1.5 border-t border-border/50 pt-2 w-full min-w-0">
                    {/* Primary WhatsApp Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenWhatsApp(party)}
                      disabled={!cleanPhone}
                      className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={cleanPhone ? `Chat on WhatsApp (${party.phone})` : "No phone number available"}
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-none stroke-current stroke-2">
                        <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.5L3 21l2-5.1A8.5 8.5 0 1 1 21 11.5z" />
                      </svg>
                      <span className="truncate">WhatsApp</span>
                    </button>

                    {/* Direct Call Button */}
                    {party.phone ? (
                      <a
                        href={`tel:${party.phone}`}
                        className="inline-flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-bg/50 text-muted-text hover:text-text hover:bg-bg transition"
                        title={`Call ${party.phone}`}
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      </a>
                    ) : null}

                    {/* Copy Phone Button */}
                    {party.phone ? (
                      <button
                        type="button"
                        onClick={() => handleCopyPhone(party)}
                        className="inline-flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-bg/50 text-muted-text hover:text-text hover:bg-bg transition"
                        title="Copy phone"
                      >
                        {copiedId === party.id ? (
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-emerald-500 stroke-2">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketDirectoryPage;
