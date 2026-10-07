import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { toast } from "react-toastify";
import Modal from "../components/Modal";
import SearchableSelect from "../components/SearchableSelect";
import AdBanner from "../components/AdBanner";
import { ADSENSE_CONFIG } from "../config/ads";
import {
  getMarketDirectory,
  tagPartyQuality,
  untagPartyQuality,
} from "../lib/api";

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
  const [qualityInput, setQualityInput] = useState("");
  const [debouncedQualitySearch, setDebouncedQualitySearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [data, setData] = useState({
    topQualities: [],
    allQualities: [],
    matchedQualities: [],
    parties: [],
    selectedQuality: null,
    summary: { totalParties: 0, tradedPartiesCount: 0, taggedPartiesCount: 0, totalOrders: 0, lastMarketRate: 0, totalVolume: 0, matchedQualitiesCount: 0 },
  });
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState("");

  // Modal state for Adding New Party
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tagForm, setTagForm] = useState({
    partyType: "buyer",
    newPartyFirmName: "",
    newPartyName: "",
    newPartyPhone: "",
    newPartyAddress: "",
    qualityMode: "existing", // "existing" | "new"
    qualityId: "",
    newQualityName: "",
    notes: "",
  });
  const [tagLoading, setTagLoading] = useState(false);

  const dropdownRef = useRef(null);

  // Debounce quality search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQualitySearch(qualityInput.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [qualityInput]);

  // Close suggestions dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch market directory data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMarketDirectory({
        partyType,
        qualitySearch: debouncedQualitySearch || undefined,
        search: searchInput.trim() || undefined,
      });
      setData(res);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Failed to load directory";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [partyType, debouncedQualitySearch, searchInput]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Add Party Modal with prefilled quality if active
  const openAddPartyModal = useCallback(() => {
    const matchedId = data.matchedQualities?.[0]?.id || data.selectedQuality?.id || "";
    const matchedName = data.matchedQualities?.[0]?.name || data.selectedQuality?.name || qualityInput.trim();
    setTagForm({
      partyType,
      newPartyFirmName: "",
      newPartyName: "",
      newPartyPhone: "",
      newPartyAddress: "",
      qualityMode: matchedId ? "existing" : (matchedName ? "new" : "existing"),
      qualityId: matchedId,
      newQualityName: matchedId ? "" : matchedName,
      notes: "",
    });
    setTagModalOpen(true);
  }, [data.matchedQualities, data.selectedQuality, partyType, qualityInput]);

  // Filter all qualities for dropdown suggestion list
  const qualitySuggestions = useMemo(() => {
    const list = data.allQualities || [];
    const query = qualityInput.trim().toLowerCase();
    if (!query) return list.slice(0, 8);
    return list.filter((q) => q.name.toLowerCase().includes(query)).slice(0, 10);
  }, [data.allQualities, qualityInput]);

  const selectedQualityName = useMemo(() => {
    if (data.matchedQualities && data.matchedQualities.length > 1) {
      return `${data.matchedQualities.length} qualities matching "${debouncedQualitySearch}"`;
    }
    if (data.matchedQualities && data.matchedQualities.length === 1) {
      return data.matchedQualities[0].name;
    }
    if (data.selectedQuality?.name) return data.selectedQuality.name;
    if (debouncedQualitySearch) return debouncedQualitySearch;
    return "this quality";
  }, [data.selectedQuality, data.matchedQualities, debouncedQualitySearch]);

  const qualitySelectOptions = useMemo(() => {
    return (data.allQualities || []).map((q) => ({
      value: q.id,
      label: q.name,
      helperText: q.orderCount > 0 ? `${q.orderCount} deals` : undefined,
    }));
  }, [data.allQualities]);

  function handleOpenWhatsApp(party) {
    const cleanPhone = cleanPhoneForWhatsApp(party.phone);
    if (!cleanPhone) {
      toast.warn("No valid phone number for WhatsApp");
      return;
    }

    const qualityText = debouncedQualitySearch || selectedQualityName;
    const firm = party.firmName ? ` (${party.firmName})` : "";
    const greeting = party.name ? `Hello ${party.name}${firm}` : `Hello${firm}`;
    
    let text = "";
    if (party.orderCount === 0 && party.isTagged) {
      text = isBuyer
        ? `${greeting}, we understand you regularly purchase ${qualityText}. We have fresh availability and competitive rates. Please share your current requirements.`
        : `${greeting}, we understand you manufacture ${qualityText}. We have buyer requirements and inquiries. Please share your current availability and best rates.`;
    } else {
      text = isBuyer
        ? `${greeting}, we have availability & fresh offer for ${qualityText}. Please let us know if you have any requirements.`
        : `${greeting}, we have buyer inquiry for ${qualityText}. Please share your current availability and best rates.`;
    }

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

  async function handleSaveTag(e) {
    if (e) e.preventDefault();

    const firm = (tagForm.newPartyFirmName || "").trim();
    const name = (tagForm.newPartyName || "").trim();
    const cleanPhone = (tagForm.newPartyPhone || "").replace(/\D/g, "");

    if (!firm && !name) {
      toast.warn("Please enter a Firm Name or Contact Person Name");
      return;
    }
    if (!cleanPhone) {
      toast.warn("Please enter a Phone / WhatsApp Number");
      return;
    }
    if (cleanPhone.length !== 10) {
      toast.warn("Mobile number must be exactly 10 digits");
      return;
    }
    if (!/^[6-9]/.test(cleanPhone)) {
      toast.warn("Enter a valid Indian mobile number (must start with 6, 7, 8, or 9)");
      return;
    }

    // Validate Quality
    if (tagForm.qualityMode === "existing") {
      if (!tagForm.qualityId) {
        toast.warn("Please select a fabric quality");
        return;
      }
    } else {
      if (!tagForm.newQualityName.trim()) {
        toast.warn("Please enter a fabric quality name");
        return;
      }
    }

    setTagLoading(true);
    try {
      const payload = {
        partyType: tagForm.partyType,
        newParty: {
          firmName: firm || name,
          name: name || firm,
          phone: cleanPhone,
          address: (tagForm.newPartyAddress || "").trim() || undefined,
        },
        notes: (tagForm.notes || "").trim() || undefined,
      };

      if (tagForm.qualityMode === "existing") {
        payload.qualityId = tagForm.qualityId;
      } else {
        payload.newQualityName = tagForm.newQualityName.trim();
      }

      await tagPartyQuality(payload);
      toast.success(
        `${tagForm.partyType === "buyer" ? "Buyer" : "Seller"} added & tagged successfully!`
      );
      setTagModalOpen(false);
      fetchData();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to add party";
      toast.error(msg);
    } finally {
      setTagLoading(false);
    }
  }

  async function handleUntag(party) {
    const matchedQ = data.matchedQualities?.[0] || data.selectedQuality;
    const targetQId = matchedQ?.id || (data.allQualities || []).find((q) => q.name === debouncedQualitySearch)?.id;
    if (!targetQId) {
      toast.warn("Please select a specific quality to untag");
      return;
    }

    if (!window.confirm(`Remove quality tag for ${party.firmName || party.name}?`)) return;

    try {
      await untagPartyQuality({
        partyType,
        partyId: party.id,
        qualityId: targetQId,
      });
      toast.info("Quality association removed");
      fetchData();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to remove tag";
      toast.error(msg);
    }
  }

  const isBuyer = partyType === "buyer";
  const partyLabelSingular = isBuyer ? "Buyer" : "Seller";
  const partyLabelPlural = isBuyer ? "Buyers" : "Sellers";
  const hasQualityQuery = Boolean(debouncedQualitySearch);

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full min-w-0">
      {/* Header & Description */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-text">
            Market Directory
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm muted-text">
            Find buyers and sellers by fabric quality, gram, or weight with instant WhatsApp outreach.
          </p>
        </div>

        {/* Action Controls: Buyer/Seller Toggle + Tag New Party Button */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Segmented Party Type Toggle */}
          <div className="inline-flex rounded-xl border border-border bg-surface p-1 shadow-sm shrink-0">
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

          {/* Add New Party Button */}
          <button
            type="button"
            onClick={openAddPartyModal}
            className="primary-btn inline-flex items-center gap-1.5 py-1.5 px-3 sm:py-2 sm:px-4 text-xs sm:text-sm font-semibold shadow-sm w-auto shrink-0"
            title={`Add a new ${partyLabelSingular.toLowerCase()} to the directory`}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-none stroke-current stroke-2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Add {partyLabelSingular}</span>
          </button>
        </div>
      </div>

      {/* Main Search & Control Card */}
      <div className="rounded-xl sm:rounded-2xl border border-border bg-surface p-3 sm:p-5 shadow-sm space-y-3 w-full max-w-full min-w-0 box-border">
        <div className="grid gap-3 sm:gap-4 md:grid-cols-3 w-full min-w-0">
          {/* Smart Quality Search with Suggestions Dropdown */}
          <div className="md:col-span-2 min-w-0 relative" ref={dropdownRef}>
            <span className="mb-1 block text-xs font-medium text-text uppercase tracking-wider">
              Search Quality (Name, GSM, Gram, Weight)
            </span>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-text">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <input
                type="text"
                className="form-input w-full pl-9 pr-8 text-sm"
                placeholder="Type quality name or gram (e.g. 60s, Rayon, 14 Kg, 120 GSM)..."
                value={qualityInput}
                onChange={(e) => {
                  setQualityInput(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
              />
              {qualityInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setQualityInput("");
                    setDropdownOpen(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs muted-text hover:text-text p-1"
                  title="Clear search"
                >
                  ✕
                </button>
              ) : null}
            </div>

            {/* Suggestions Dropdown Popup */}
            {dropdownOpen && qualitySuggestions.length > 0 ? (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-border bg-surface shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                {qualityInput.trim() && qualitySuggestions.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                    }}
                    className="w-full border-b border-border/70 bg-accent/5 px-3 py-2 text-left text-xs font-semibold text-accent hover:bg-accent/10 transition flex items-center justify-between"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                      </svg>
                      <span>Search all {qualitySuggestions.length} qualities matching "{qualityInput.trim()}"</span>
                    </span>
                    <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px]">Combined</span>
                  </button>
                ) : null}

                <div className="divide-y divide-border/40">
                  {qualitySuggestions.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setQualityInput(q.name);
                        setDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-text hover:bg-bg transition flex items-center justify-between gap-2"
                    >
                      <span className="truncate font-medium">{q.name}</span>
                      {q.orderCount > 0 ? (
                        <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                          {q.orderCount} deals
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
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
              {qualityInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setQualityInput("");
                    setDropdownOpen(false);
                  }}
                  className="text-xs text-accent hover:underline font-semibold"
                >
                  Clear Search
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-24 overflow-y-auto no-scrollbar">
              {data.topQualities.map((q) => {
                const isSelected = qualityInput.toLowerCase() === q.name.toLowerCase();
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setQualityInput(isSelected ? "" : q.name);
                      setDropdownOpen(false);
                    }}
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

      {/* Matching Qualities Banner (When multiple qualities matched the query) */}
      {data.matchedQualities && data.matchedQualities.length > 1 ? (
        <div className="rounded-xl border border-accent/25 bg-accent/5 p-2.5 sm:p-3 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white shrink-0">
                {data.matchedQualities.length}
              </span>
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                Matching Qualities Found for "{debouncedQualitySearch}":
              </span>
            </div>
            <span className="text-[11px] muted-text">
              Combined {data.summary?.totalOrders || 0} deals across all variants
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
            {data.matchedQualities.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  setQualityInput(q.name);
                  setDropdownOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-accent/20 bg-surface px-2.5 py-1 text-xs font-medium text-text hover:border-accent hover:bg-accent/10 transition"
                title={`Filter specifically by ${q.name}`}
              >
                <span>{q.name}</span>
                <span className="rounded bg-accent/15 px-1 py-0.2 text-[10px] font-semibold text-accent">
                  {q.orderCount} deals
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Summary KPI Cards (When Quality Search is active and matched qualities exist) */}
      {hasQualityQuery && data.matchedQualities && data.matchedQualities.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 w-full min-w-0">
          <div className="rounded-xl border border-border bg-surface p-2.5 sm:p-4 shadow-sm min-w-0 overflow-hidden">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider muted-text truncate">
              {partyLabelPlural}
            </p>
            <p className="mt-0.5 text-lg sm:text-2xl font-bold text-text truncate">
              {data.summary?.totalParties || 0}
            </p>
            <p className="text-[10px] sm:text-xs text-emerald-500 truncate font-medium">
              {data.summary?.tradedPartiesCount || 0} Traded • {data.summary?.taggedPartiesCount || 0} Tagged
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
            <p className="text-[10px] sm:text-xs muted-text truncate">
              Across {data.matchedQualities.length} {data.matchedQualities.length === 1 ? "variant" : "variants"}
            </p>
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface p-8 text-center shadow-sm w-full min-w-0">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent mb-2" />
          <p className="text-xs sm:text-sm muted-text">Searching {partyLabelPlural.toLowerCase()}...</p>
        </div>
      ) : !hasQualityQuery ? (
        /* Empty / Discovery State: When No Quality Is Picked */
        <div className="space-y-4 sm:space-y-6 w-full min-w-0">
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-6 sm:p-10 text-center">
            <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-accent/10 text-accent mb-3">
              <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6 fill-none stroke-current stroke-2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-text">Search Any Fabric Quality</h3>
            <p className="mt-1 text-xs sm:text-sm muted-text max-w-md mx-auto">
              Type any quality name, gram, GSM, or weight in the box above, or click one of the popular qualities below to see matching {partyLabelPlural.toLowerCase()}.
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
                          setQualityInput(q.name);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-bg/50 py-1.5 text-xs font-semibold text-text hover:border-accent/50 hover:bg-bg transition text-center truncate"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2 shrink-0">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <span>Find Buyers</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPartyType("seller");
                          setQualityInput(q.name);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-bg/50 py-1.5 text-xs font-semibold text-text hover:border-accent/50 hover:bg-bg transition text-center truncate"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2 shrink-0">
                          <path d="M3 21h18" />
                          <path d="M5 21V7l8-4v18" />
                          <path d="M19 21V11l-6-4" />
                          <path d="M9 9v.01M9 13v.01M9 17v.01" />
                        </svg>
                        <span>Find Sellers</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : data.matchedQualities?.length === 0 ? (
        /* Empty State: No Qualities Matched the search query */
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 sm:p-12 text-center shadow-sm w-full min-w-0">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 mb-2.5">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-text">
            No Qualities Matched "{debouncedQualitySearch}"
          </h3>
          <p className="mt-1 text-xs sm:text-sm muted-text max-w-sm mx-auto">
            No fabric qualities match this keyword or gram weight. Try typing a shorter term (like "60s", "14 kg", "Rayon", or "GSM").
          </p>
          <div className="mt-3.5 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setQualityInput("")}
              className="ghost-btn text-xs sm:text-sm py-2 px-4"
            >
              Clear Quality Search
            </button>
          </div>
        </div>
      ) : data.parties.length === 0 ? (
        /* Empty State: Qualities Matched but No Orders/Parties Found */
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
              : `No orders or tagged parties found for ${selectedQualityName} with ${partyLabelPlural.toLowerCase()}.`}
          </p>
          <div className="mt-3.5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setPartyType(isBuyer ? "seller" : "buyer")}
              className="primary-btn sm:w-auto text-xs sm:text-sm py-2 px-4"
            >
              Switch to {isBuyer ? "Sellers" : "Buyers"}
            </button>
            <button
              type="button"
              onClick={openAddPartyModal}
              className="ghost-btn sm:w-auto text-xs sm:text-sm py-2 px-4"
            >
              + Add {partyLabelSingular} Now
            </button>
          </div>
        </div>
      ) : (
        /* Compact Party Cards Grid */
        <div className="w-full min-w-0">
          <div className="flex items-center justify-between mb-2 px-0.5 w-full min-w-0">
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider muted-text truncate">
              {partyLabelPlural} for {selectedQualityName} ({data.parties?.length || 0})
            </h3>
            <span className="text-[11px] muted-text shrink-0 pl-2">
              Traded & Tagged
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0">
            {data.parties.map((party) => {
              const cleanPhone = cleanPhoneForWhatsApp(party.phone);
              const avatarChar = (party.firmName || party.name || "P").charAt(0).toUpperCase();
              const hasOrders = party.orderCount > 0;

              return (
                <div
                  key={party.id}
                  className="w-full min-w-0 max-w-full rounded-xl border border-border bg-surface p-3 sm:p-4 shadow-sm transition hover:border-accent/40 hover:shadow-md flex flex-col justify-between gap-2.5 box-border overflow-hidden"
                >
                  {/* Top Row: Circular Avatar + Firm Name + Rate/Tag Badge */}
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
                      {hasOrders ? (
                        <>
                          <div className="text-sm sm:text-base font-bold text-accent leading-tight whitespace-nowrap">
                            {formatRate(party.lastRate)}
                          </div>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <span className="text-[11px] muted-text font-medium whitespace-nowrap">
                              {party.orderCount} {party.orderCount === 1 ? "deal" : "deals"}
                            </span>
                            {party.isTagged ? (
                              <span className="rounded bg-amber-500/15 px-1 py-0.2 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                Tagged
                              </span>
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                            ⭐ Tagged {partyLabelSingular}
                          </span>
                          <div className="text-[10px] muted-text font-medium mt-0.5">
                            No prior orders
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Inline Stats Strip */}
                  {hasOrders ? (
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
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-muted-text border-t border-border/50 pt-2 min-w-0 w-full">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-medium text-text">Known to {isBuyer ? "purchase" : "manufacture"} this quality</span>
                    </div>
                  )}

                  {/* Tagged Notes / Remarks */}
                  {party.taggedNotes ? (
                    <div className="rounded-lg bg-bg/70 border border-border/60 px-2 py-1 text-[11px] text-muted-text truncate min-w-0 w-full" title={party.taggedNotes}>
                      <span className="font-medium text-text">Note:</span> {party.taggedNotes}
                    </div>
                  ) : null}

                  {/* Quality Breakdown: Shown when multiple qualities are matched */}
                  {party.qualities && party.qualities.length > 0 && data.matchedQualities?.length > 1 ? (
                    <div className="flex flex-wrap items-center gap-1 text-[11px] border-t border-border/40 pt-1.5 min-w-0 w-full">
                      <span className="text-muted-text text-[10px] uppercase font-semibold tracking-wider shrink-0">
                        Dealt In:
                      </span>
                      {party.qualities.map((q) => (
                        <span
                          key={q.name}
                          className="inline-flex items-center gap-1 rounded bg-bg/80 border border-border/70 px-1.5 py-0.5 text-text text-[10px] shrink-0"
                          title={`${q.name}: ${q.count} deals`}
                        >
                          <span className="truncate max-w-[130px]">{q.name}</span>
                          <span className="text-accent font-semibold">({q.count})</span>
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {/* Address Line (if present) */}
                  {party.address ? (
                    <p className="inline-flex items-center gap-1 text-[11px] text-muted-text truncate w-full min-w-0" title={party.address}>
                      <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current stroke-2 shrink-0">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span className="truncate">{party.address}</span>
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

                    {/* Untag Button (if party is tagged) */}
                    {party.isTagged ? (
                      <button
                        type="button"
                        onClick={() => handleUntag(party)}
                        className="inline-flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/15 transition"
                        title="Remove quality tag"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Directory Page Bottom Ad Slot */}
      <AdBanner
        format="horizontal"
        slot={ADSENSE_CONFIG.slots.directoryBottom}
        className="mt-6"
      />

      {/* Modal for Tagging a Party with a Quality */}
      {tagModalOpen ? (
        <Modal
          title={`Add New ${tagForm.partyType === "buyer" ? "Buyer (Customer)" : "Seller (Manufacturer)"}`}
          onClose={() => setTagModalOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setTagModalOpen(false)}
                disabled={tagLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn w-auto"
                onClick={handleSaveTag}
                disabled={tagLoading}
              >
                {tagLoading ? "Adding..." : `+ Add ${tagForm.partyType === "buyer" ? "Buyer" : "Seller"}`}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Party Role */}
            <div>
              <span className="mb-1 block text-xs font-semibold text-text uppercase tracking-wider">
                Party Role
              </span>
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-bg/60 p-1">
                <button
                  type="button"
                  onClick={() => setTagForm((prev) => ({ ...prev, partyType: "buyer" }))}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-xs font-semibold transition text-center ${
                    tagForm.partyType === "buyer"
                      ? "bg-accent text-white shadow-sm"
                      : "text-muted-text hover:text-text hover:bg-surface/60"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2 shrink-0">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span>Buyer (Customer)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTagForm((prev) => ({ ...prev, partyType: "seller" }))}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-xs font-semibold transition text-center ${
                    tagForm.partyType === "seller"
                      ? "bg-accent text-white shadow-sm"
                      : "text-muted-text hover:text-text hover:bg-surface/60"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2 shrink-0">
                    <path d="M3 21h18" />
                    <path d="M5 21V7l8-4v18" />
                    <path d="M19 21V11l-6-4" />
                    <path d="M9 9v.01M9 13v.01M9 17v.01" />
                  </svg>
                  <span>Seller (Manufacturer)</span>
                </button>
              </div>
            </div>

            {/* Party Info Fields */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-text uppercase tracking-wider">
                      Firm / Company Name *
                    </span>
                    <input
                      type="text"
                      className="form-input text-xs sm:text-sm"
                      placeholder="e.g. Radhey Shyam Fabrics"
                      value={tagForm.newPartyFirmName}
                      onChange={(e) => setTagForm((prev) => ({ ...prev, newPartyFirmName: e.target.value }))}
                      autoFocus
                    />
                  </label>
                </div>
                <div>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-text uppercase tracking-wider">
                      Contact Person Name
                    </span>
                    <input
                      type="text"
                      className="form-input text-xs sm:text-sm"
                      placeholder="e.g. Ramesh Bhai"
                      value={tagForm.newPartyName}
                      onChange={(e) => setTagForm((prev) => ({ ...prev, newPartyName: e.target.value }))}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-text uppercase tracking-wider">
                      Phone / WhatsApp Number *
                    </span>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-semibold text-muted-text">
                        +91
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        className="form-input text-xs sm:text-sm pl-11"
                        placeholder="9825012345"
                        value={tagForm.newPartyPhone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setTagForm((prev) => ({ ...prev, newPartyPhone: digits }));
                        }}
                      />
                    </div>
                  </label>
                  <p className="mt-1 text-[11px] muted-text">
                    10-digit Indian mobile number (starts with 6, 7, 8, 9).
                  </p>
                </div>
                <div>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-text uppercase tracking-wider">
                      City / Market Address
                    </span>
                    <input
                      type="text"
                      className="form-input text-xs sm:text-sm"
                      placeholder="e.g. Ring Road, Surat"
                      value={tagForm.newPartyAddress}
                      onChange={(e) => setTagForm((prev) => ({ ...prev, newPartyAddress: e.target.value }))}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Fabric Quality Section */}
            <div className="rounded-xl border border-border bg-surface-muted/30 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-text uppercase tracking-wider">
                  Fabric Quality
                </span>
                <div className="inline-flex rounded-lg border border-border bg-bg/80 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setTagForm((prev) => ({ ...prev, qualityMode: "existing" }))}
                    className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold transition ${
                      tagForm.qualityMode === "existing"
                        ? "bg-accent text-white shadow-xs"
                        : "text-muted-text hover:text-text"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current stroke-2 shrink-0">
                      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    </svg>
                    <span>Select Existing</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTagForm((prev) => ({ ...prev, qualityMode: "new" }))}
                    className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold transition ${
                      tagForm.qualityMode === "new"
                        ? "bg-accent text-white shadow-xs"
                        : "text-muted-text hover:text-text"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current stroke-2 shrink-0">
                      <path d="M5 12h14" />
                      <path d="M12 5v14" />
                    </svg>
                    <span>New Quality</span>
                  </button>
                </div>
              </div>

              {tagForm.qualityMode === "existing" ? (
                <div>
                  <SearchableSelect
                    label="Select Fabric Quality"
                    value={tagForm.qualityId}
                    onChange={(val) => setTagForm((prev) => ({ ...prev, qualityId: val }))}
                    options={qualitySelectOptions}
                    placeholder="Search quality..."
                  />
                </div>
              ) : (
                <div>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-muted-text uppercase">
                      New Quality Name / Specs *
                    </span>
                    <input
                      type="text"
                      className="form-input text-xs sm:text-sm"
                      placeholder="e.g. 60s Cambric, Rayon 14 Kg, 120 GSM"
                      value={tagForm.newQualityName}
                      onChange={(e) => setTagForm((prev) => ({ ...prev, newQualityName: e.target.value }))}
                    />
                  </label>
                  <p className="mt-1 text-[11px] muted-text">
                    Will be added as a quality in your ledger directory.
                  </p>
                </div>
              )}
            </div>

            {/* Notes / Remarks */}
            <div>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-text uppercase tracking-wider">
                  Remarks / Quoted Rate / Notes (Optional)
                </span>
                <input
                  type="text"
                  className="form-input text-xs sm:text-sm"
                  placeholder="e.g. Quoted ₹18.50, regular 200 Takka monthly requirement"
                  value={tagForm.notes}
                  onChange={(e) => setTagForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </label>
              <p className="mt-1 text-[11px] muted-text">
                Visible directly in the Market Directory card for quick reference.
              </p>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default MarketDirectoryPage;

