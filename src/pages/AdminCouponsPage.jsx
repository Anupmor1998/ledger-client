import { format, isValid, parseISO } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import Modal from "../components/Modal";
import DatePicker from "../components/DatePicker";
import OfferBanner, { BANNER_THEMES } from "../components/OfferBanner";
import useDebounce from "../hooks/useDebounce";
import {
  createAdminCoupon,
  deleteAdminCoupon,
  generateAdminCouponBatch,
  getAdminCoupons,
  updateAdminCoupon,
} from "../lib/api";

function TagIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function CopyIcon({ className = "h-3.5 w-3.5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ className = "h-3.5 w-3.5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function formatDate(dateValue) {
  if (!dateValue) return "No Expiry";
  try {
    const d = typeof dateValue === "string" ? parseISO(dateValue) : new Date(dateValue);
    if (!isValid(d)) return "Invalid Date";
    return format(d, "dd MMM yyyy");
  } catch {
    return "Invalid Date";
  }
}

function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, totalRedemptions: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  const filtersRef = useRef({
    statusFilter: "ALL",
    debouncedSearch: "",
  });

  useEffect(() => {
    filtersRef.current = {
      statusFilter,
      debouncedSearch,
    };
  }, [statusFilter, debouncedSearch]);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  // Form states
  const [singleForm, setSingleForm] = useState({
    code: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: "",
    maxDiscount: "",
    minOrderAmount: "0",
    maxUses: "",
    maxUsesPerUser: "1",
    isPublic: true,
    showBanner: false,
    bannerTheme: "EMERALD",
    bannerHeadline: "",
    bannerSubtitle: "",
    bannerBadge: "",
    expiresAt: "",
  });

  const [batchForm, setBatchForm] = useState({
    count: 10,
    prefix: "SAVE",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: "20",
    maxDiscount: "",
    minOrderAmount: "0",
    maxUses: "1",
    maxUsesPerUser: "1",
    isPublic: false,
    expiresAt: "",
  });

  const [submitting, setSubmitting] = useState(false);

  async function fetchCoupons() {
    try {
      setLoading(true);
      const { statusFilter: sFilter, debouncedSearch: dSearch } = filtersRef.current;
      const params = {};
      if (sFilter !== "ALL") params.status = sFilter;
      if (dSearch.trim()) params.search = dSearch.trim();

      const res = await getAdminCoupons(params);
      setCoupons(Array.isArray(res?.coupons) ? res.coupons : []);
      if (res?.stats) {
        setStats({
          total: res.stats.total ?? res.stats.totalCoupons ?? 0,
          active: res.stats.active ?? res.stats.activeCoupons ?? 0,
          expired: res.stats.expired ?? res.stats.expiredCoupons ?? 0,
          totalRedemptions: res.stats.totalRedemptions ?? 0,
        });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCoupons();
  }, [statusFilter, debouncedSearch]);

  function handleCopy(code) {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied "${code}" to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  async function handleToggleStatus(coupon) {
    try {
      const updated = await updateAdminCoupon(coupon.id, {
        isActive: !coupon.isActive,
      });
      toast.success(
        `Coupon "${coupon.code}" ${updated.coupon.isActive ? "activated" : "deactivated"}`
      );
      fetchCoupons();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update coupon status");
    }
  }

  async function handleDeleteCoupon(coupon) {
    if (
      !window.confirm(
        `Are you sure you want to delete coupon "${coupon.code}"? If payments are already linked to it, it will be safely deactivated instead.`
      )
    ) {
      return;
    }

    try {
      const res = await deleteAdminCoupon(coupon.id);
      toast.success(res?.message || "Coupon processed successfully");
      fetchCoupons();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete coupon");
    }
  }

  async function handleCreateSingle(e) {
    e.preventDefault();
    if (!singleForm.code.trim()) {
      toast.error("Please provide a coupon code");
      return;
    }
    if (!singleForm.discountValue || Number(singleForm.discountValue) <= 0) {
      toast.error("Please provide a valid discount value");
      return;
    }

    try {
      setSubmitting(true);
      await createAdminCoupon(singleForm);
      toast.success(`Coupon "${singleForm.code.toUpperCase()}" created successfully!`);
      setShowCreateModal(false);
      setSingleForm({
        code: "",
        description: "",
        discountType: "PERCENTAGE",
        discountValue: "",
        maxDiscount: "",
        minOrderAmount: "0",
        maxUses: "",
        maxUsesPerUser: "1",
        isPublic: true,
        showBanner: false,
        bannerTheme: "EMERALD",
        bannerHeadline: "",
        bannerSubtitle: "",
        bannerBadge: "",
        expiresAt: "",
      });
      fetchCoupons();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create coupon");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateBatch(e) {
    e.preventDefault();
    const count = Number(batchForm.count);
    if (!count || count < 1 || count > 100) {
      toast.error("Batch count must be between 1 and 100");
      return;
    }
    if (!batchForm.discountValue || Number(batchForm.discountValue) <= 0) {
      toast.error("Please enter a valid discount value");
      return;
    }

    try {
      setSubmitting(true);
      const res = await generateAdminCouponBatch(batchForm);
      toast.success(res?.message || `Generated ${res?.count} coupons!`);
      setShowBatchModal(false);
      setBatchResults(res?.coupons || []);
      fetchCoupons();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to generate coupon batch");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateCoupon(e) {
    e.preventDefault();
    if (!editingCoupon) return;

    try {
      setSubmitting(true);
      await updateAdminCoupon(editingCoupon.id, {
        description: editingCoupon.description,
        isActive: editingCoupon.isActive,
        isPublic: Boolean(editingCoupon.isPublic),
        maxUses: editingCoupon.maxUses ? Number(editingCoupon.maxUses) : null,
        maxUsesPerUser: editingCoupon.maxUsesPerUser ? Number(editingCoupon.maxUsesPerUser) : 1,
        expiresAt: editingCoupon.expiresAt || null,
        showBanner: Boolean(editingCoupon.showBanner),
        bannerTheme: editingCoupon.bannerTheme || "EMERALD",
        bannerHeadline: editingCoupon.bannerHeadline || null,
        bannerSubtitle: editingCoupon.bannerSubtitle || null,
        bannerBadge: editingCoupon.bannerBadge || null,
      });
      toast.success("Coupon updated successfully");
      setEditingCoupon(null);
      fetchCoupons();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update coupon");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
              <TagIcon className="h-3.5 w-3.5" />
              <span>Subscription Growth</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-text">
              Discount Coupons
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-text">
              Create promo codes, generate batches for marketing campaigns, set expiry limits, and monitor live redemptions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="ghost-btn border border-border text-xs py-2 px-3.5 font-bold hover:bg-bg inline-flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
                <rect width="8" height="8" x="2" y="2" rx="1" />
                <rect width="8" height="8" x="14" y="2" rx="1" />
                <rect width="8" height="8" x="2" y="14" rx="1" />
                <rect width="8" height="8" x="14" y="14" rx="1" />
              </svg>
              <span>Generate Batch</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="primary-btn !w-auto text-xs py-2 px-4 font-bold inline-flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Create Coupon</span>
            </button>

            <button
              type="button"
              onClick={fetchCoupons}
              disabled={loading}
              className="ghost-btn border border-border text-xs p-2 font-semibold hover:bg-bg"
              title="Refresh list"
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 fill-none stroke-current stroke-2 ${loading ? "animate-spin" : ""}`}
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div
            onClick={() => setStatusFilter("ALL")}
            className={`cursor-pointer rounded-xl border p-3.5 transition ${
              statusFilter === "ALL"
                ? "border-accent bg-accent/10 shadow-xs"
                : "border-border bg-bg hover:border-accent/40"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">
              Total Coupons
            </p>
            <p className="mt-1 text-2xl font-black text-text">{stats?.total ?? 0}</p>
          </div>

          <div
            onClick={() => setStatusFilter("ACTIVE")}
            className={`cursor-pointer rounded-xl border p-3.5 transition ${
              statusFilter === "ACTIVE"
                ? "border-emerald-500 bg-emerald-500/10 shadow-xs"
                : "border-border bg-bg hover:border-emerald-500/40"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Active Coupons
            </p>
            <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats?.active ?? 0}
            </p>
          </div>

          <div
            onClick={() => setStatusFilter("EXPIRED")}
            className={`cursor-pointer rounded-xl border p-3.5 transition ${
              statusFilter === "EXPIRED"
                ? "border-amber-500 bg-amber-500/10 shadow-xs"
                : "border-border bg-bg hover:border-amber-500/40"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Expired
            </p>
            <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">
              {stats?.expired ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-bg p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-text">
              Total Redemptions
            </p>
            <p className="mt-1 text-2xl font-black text-accent">
              {stats?.totalRedemptions ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search coupon code or description..."
            className="w-full text-xs font-medium px-3.5 py-2 pl-9 rounded-xl border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <svg
            viewBox="0 0 24 24"
            className="absolute left-3 top-2.5 h-4 w-4 fill-none stroke-current stroke-2 text-muted-text pointer-events-none"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "ACTIVE", "EXPIRED", "DISABLED"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition capitalize ${
                statusFilter === status
                  ? "bg-accent text-white shadow-xs"
                  : "border border-border bg-surface text-muted-text hover:bg-bg"
              }`}
            >
              {status.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Coupons Table */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-text">
            <svg className="animate-spin h-6 w-6 mb-2 text-accent" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-xs font-semibold">Loading coupon codes...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-text">
            <TagIcon className="h-10 w-10 stroke-1 text-muted-text/40 mb-3" />
            <p className="text-sm font-bold text-text">No coupons found</p>
            <p className="text-xs mt-1">
              {debouncedSearch
                ? `No results matching "${debouncedSearch}"`
                : "Create your first coupon code or batch to start offering subscription discounts."}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="primary-btn !w-auto text-xs py-2 px-4"
              >
                Create Single Coupon
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-bg/60 text-muted-text text-[11px] uppercase tracking-wider font-semibold">
                  <th className="px-4 py-3">Coupon Code</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Min Order</th>
                  <th className="px-4 py-3">Global Usage</th>
                  <th className="px-4 py-3">Per User</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3">Visibility</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.map((coupon) => {
                  const isExpired = coupon.expiresAt && new Date() > new Date(coupon.expiresAt);
                  const isExhausted = coupon.maxUses && coupon.usedCount >= coupon.maxUses;

                  return (
                    <tr key={coupon.id} className="hover:bg-bg/40 transition">
                      <td className="px-4 py-3.5 font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(coupon.code)}
                            className="group inline-flex items-center gap-1.5 font-mono font-bold tracking-wider text-xs px-2.5 py-1 rounded-md bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition cursor-pointer"
                            title="Click to copy coupon code"
                          >
                            <span>{coupon.code}</span>
                            {copiedCode === coupon.code ? (
                              <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <CopyIcon className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                            )}
                          </button>
                          {coupon.showBanner && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30"
                              title={`Featured Offer Banner (${coupon.bannerTheme || "EMERALD"})`}
                            >
                              <span>★</span>
                              <span>Banner</span>
                            </span>
                          )}
                        </div>
                        {coupon.description && (
                          <p className="mt-1 text-[11px] text-muted-text truncate max-w-xs">
                            {coupon.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-text">
                          {coupon.discountType === "PERCENTAGE"
                            ? `${coupon.discountValue}% OFF`
                            : `₹${coupon.discountValue.toLocaleString("en-IN")} FLAT`}
                        </div>
                        {coupon.discountType === "PERCENTAGE" && coupon.maxDiscount && (
                          <p className="text-[10px] text-muted-text">
                            Up to ₹{coupon.maxDiscount.toLocaleString("en-IN")}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted-text">
                        {coupon.minOrderAmount > 0
                          ? `₹${coupon.minOrderAmount.toLocaleString("en-IN")}`
                          : "₹0 (No min)"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-text">
                          <span className="text-accent font-bold">{coupon.usedCount}</span>
                          <span className="text-muted-text"> / {coupon.maxUses || "∞"}</span>
                        </div>
                        {isExhausted && (
                          <span className="inline-block mt-0.5 text-[10px] font-bold text-amber-600 uppercase">
                            Limit Reached
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted-text">
                        <span className="font-semibold text-text">
                          {coupon.maxUsesPerUser || 1}
                        </span>
                        <span className="text-[11px] text-muted-text ml-1">
                          {(coupon.maxUsesPerUser || 1) === 1 ? "use/user" : "uses/user"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-muted-text">
                        <span className={isExpired ? "text-red-500 font-semibold" : ""}>
                          {formatDate(coupon.expiresAt)}
                        </span>
                        {isExpired && (
                          <span className="block text-[10px] text-red-500 font-bold uppercase">
                            Expired
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                            coupon.isPublic
                              ? "bg-sky-500/10 text-sky-600 border border-sky-500/20"
                              : "bg-gray-500/10 text-muted-text border border-gray-500/20"
                          }`}
                        >
                          {coupon.isPublic ? "Public" : "Private"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                            !coupon.isActive
                              ? "bg-gray-500/10 text-gray-500 border border-gray-500/20"
                              : isExpired
                              ? "bg-red-500/10 text-red-600 border border-red-500/20"
                              : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          }`}
                        >
                          {!coupon.isActive ? "Disabled" : isExpired ? "Expired" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Active Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(coupon)}
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition ${
                              coupon.isActive
                                ? "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                                : "border-gray-500/30 text-muted-text hover:bg-bg"
                            }`}
                            title={coupon.isActive ? "Click to deactivate" : "Click to activate"}
                          >
                            {coupon.isActive ? "Disable" : "Enable"}
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() =>
                              setEditingCoupon({
                                ...coupon,
                                showBanner: Boolean(coupon.showBanner),
                                bannerTheme: coupon.bannerTheme || "EMERALD",
                                bannerHeadline: coupon.bannerHeadline || "",
                                bannerSubtitle: coupon.bannerSubtitle || "",
                                bannerBadge: coupon.bannerBadge || "",
                                expiresAt: coupon.expiresAt
                                  ? format(new Date(coupon.expiresAt), "yyyy-MM-dd")
                                  : "",
                              })
                            }
                            className="p-1.5 rounded-lg border border-border text-text hover:bg-bg transition"
                            title="Edit coupon"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5 fill-none stroke-current stroke-2"
                            >
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            </svg>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteCoupon(coupon)}
                            className="p-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 transition"
                            title="Delete coupon"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5 fill-none stroke-current stroke-2"
                            >
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Single Coupon Modal */}
      {showCreateModal && (
        <Modal
          title="Create New Coupon"
          onClose={() => setShowCreateModal(false)}
          footer={
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="ghost-btn text-xs py-2 px-4"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateSingle}
                className="primary-btn !w-auto text-xs py-2 px-5 font-bold"
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Save Coupon"}
              </button>
            </div>
          }
        >
          <form onSubmit={handleCreateSingle} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                Coupon Code *
              </label>
              <input
                type="text"
                required
                value={singleForm.code}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, code: e.target.value.toUpperCase() })
                }
                placeholder="e.g. FESTIVE50, WELCOME20"
                className="w-full uppercase font-mono font-bold tracking-wider px-3 py-2 rounded-lg border border-border bg-bg focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                Description / Campaign Note
              </label>
              <input
                type="text"
                value={singleForm.description}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, description: e.target.value })
                }
                placeholder="e.g. Diwali discount promo for starter and growth plans"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Discount Type *
                </label>
                <select
                  value={singleForm.discountType}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, discountType: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FLAT">Flat Amount (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Discount Value * ({singleForm.discountType === "PERCENTAGE" ? "%" : "₹"})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={singleForm.discountValue}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, discountValue: e.target.value })
                  }
                  placeholder={singleForm.discountType === "PERCENTAGE" ? "e.g. 20" : "e.g. 100"}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg font-bold focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            {singleForm.discountType === "PERCENTAGE" && (
              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Max Discount Cap (₹) (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  value={singleForm.maxDiscount}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, maxDiscount: e.target.value })
                  }
                  placeholder="e.g. 150 (leave empty for unlimited)"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Min Order Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={singleForm.minOrderAmount}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, minOrderAmount: e.target.value })
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Total Global Usage Limit
                </label>
                <input
                  type="number"
                  min="1"
                  value={singleForm.maxUses}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, maxUses: e.target.value })
                  }
                  placeholder="Unlimited (empty)"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Limit Per User *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={singleForm.maxUsesPerUser}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, maxUsesPerUser: e.target.value })
                  }
                  placeholder="1 (Default: single use per user)"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg font-bold focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <p className="mt-1 text-[10px] text-muted-text">
                  How many times each user can use this code (standard is 1).
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Expiry Date (Optional)
                </label>
                <DatePicker
                  value={singleForm.expiresAt}
                  onChange={(val) =>
                    setSingleForm({ ...singleForm, expiresAt: val })
                  }
                  placeholder="Pick an expiry date"
                  minDate={new Date()}
                />
                <p className="mt-1 text-[10px] text-muted-text">
                  Leave empty for no expiry.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-border bg-bg/50">
              <input
                type="checkbox"
                id="single-isPublic"
                checked={singleForm.isPublic}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, isPublic: e.target.checked })
                }
                className="mt-0.5 rounded border-border text-accent focus:ring-accent h-4 w-4 cursor-pointer"
              />
              <label htmlFor="single-isPublic" className="text-xs cursor-pointer select-none">
                <span className="font-bold text-text block">
                  Show in "Available Offers" on Checkout (Public)
                </span>
                <span className="text-muted-text text-[11px] block mt-0.5">
                  When enabled, all users will see this coupon on the subscription checkout modal and can apply it with 1 click.
                </span>
              </label>
            </div>

            {/* Banner & Occasion Styling Section */}
            <div className="rounded-xl border border-border bg-bg/40 p-3.5 space-y-3">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="single-showBanner"
                  checked={singleForm.showBanner}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, showBanner: e.target.checked })
                  }
                  className="mt-0.5 rounded border-border text-accent focus:ring-accent h-4 w-4 cursor-pointer"
                />
                <label htmlFor="single-showBanner" className="text-xs cursor-pointer select-none">
                  <span className="font-bold text-text flex items-center gap-1.5">
                    <span>🎉 Feature as Festive / Occasion Offer Banner</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      Hero & Compact Banner
                    </span>
                  </span>
                  <span className="text-muted-text text-[11px] block mt-0.5">
                    Displays an eye-catching interactive offer banner on the Subscription & Pricing pages to boost conversions.
                  </span>
                </label>
              </div>

              {singleForm.showBanner && (
                <div className="pt-2 border-t border-border space-y-3">
                  {/* Occasion / Theme Selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                      Occasion & Visual Style Theme
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.values(BANNER_THEMES).map((thm) => {
                        const isSelected = (singleForm.bannerTheme || "EMERALD") === thm.id;
                        return (
                          <button
                            key={thm.id}
                            type="button"
                            onClick={() => setSingleForm({ ...singleForm, bannerTheme: thm.id })}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition ${
                              isSelected
                                ? "border-accent bg-accent/10 text-text font-bold shadow-xs"
                                : "border-border bg-surface text-muted-text hover:bg-bg hover:text-text"
                            }`}
                          >
                            <span
                              className="h-3.5 w-3.5 rounded-full shrink-0"
                              style={{ backgroundColor: thm.accentColor }}
                            />
                            <span className="truncate">{thm.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Banner Badge */}
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                        Badge Tag (e.g. DIWALI SPECIAL)
                      </label>
                      <input
                        type="text"
                        value={singleForm.bannerBadge}
                        onChange={(e) =>
                          setSingleForm({ ...singleForm, bannerBadge: e.target.value })
                        }
                        placeholder={
                          BANNER_THEMES[singleForm.bannerTheme || "EMERALD"]?.badgeDefault || "EXCLUSIVE OFFER"
                        }
                        className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>

                    {/* Headline */}
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                        Headline (Optional)
                      </label>
                      <input
                        type="text"
                        value={singleForm.bannerHeadline}
                        onChange={(e) =>
                          setSingleForm({ ...singleForm, bannerHeadline: e.target.value })
                        }
                        placeholder="e.g. 🪔 Happy Diwali Special Discount!"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>

                  {/* Subtitle */}
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                      Subtitle / Subtext (Optional)
                    </label>
                    <input
                      type="text"
                      value={singleForm.bannerSubtitle}
                      onChange={(e) =>
                        setSingleForm({ ...singleForm, bannerSubtitle: e.target.value })
                      }
                      placeholder="e.g. Get flat ₹500 off on all annual subscription plans for a limited period."
                      className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  {/* Live Preview */}
                  <div>
                    <label className="block text-[11px] font-bold text-accent uppercase tracking-wider mb-1.5">
                      Live Banner Preview
                    </label>
                    <div className="rounded-xl border border-border p-2 bg-bg/80">
                      <OfferBanner
                        coupon={{
                          code: singleForm.code || "SAMPLE20",
                          discountType: singleForm.discountType,
                          discountValue: singleForm.discountValue || 20,
                          bannerTheme: singleForm.bannerTheme || "EMERALD",
                          bannerHeadline: singleForm.bannerHeadline,
                          bannerSubtitle: singleForm.bannerSubtitle,
                          bannerBadge: singleForm.bannerBadge,
                        }}
                        variant="compact"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </Modal>
      )}

      {/* Generate Batch Modal */}
      {showBatchModal && (
        <Modal
          title="Generate Coupon Batch"
          onClose={() => setShowBatchModal(false)}
          footer={
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="ghost-btn text-xs py-2 px-4"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateBatch}
                className="primary-btn !w-auto text-xs py-2 px-5 font-bold"
                disabled={submitting}
              >
                {submitting ? "Generating..." : `Generate ${batchForm.count} Coupons`}
              </button>
            </div>
          }
        >
          <form onSubmit={handleCreateBatch} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Quantity (1 - 100) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={batchForm.count}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, count: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg font-bold focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Code Prefix *
                </label>
                <input
                  type="text"
                  required
                  value={batchForm.prefix}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, prefix: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g. PROMO"
                  className="w-full uppercase font-mono font-bold tracking-wider px-3 py-2 rounded-lg border border-border bg-bg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <p className="text-[11px] text-muted-text">
              Preview code format: <span className="font-mono font-bold text-accent">{batchForm.prefix || "CODE"}-XXXXXX</span>
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Discount Type *
                </label>
                <select
                  value={batchForm.discountType}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, discountType: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FLAT">Flat Amount (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Discount Value *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={batchForm.discountValue}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, discountValue: e.target.value })
                  }
                  placeholder="20"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg font-bold focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Total Uses Per Voucher
                </label>
                <input
                  type="number"
                  min="1"
                  value={batchForm.maxUses}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, maxUses: e.target.value })
                  }
                  placeholder="1 (Single use)"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Limit Per User *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={batchForm.maxUsesPerUser}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, maxUsesPerUser: e.target.value })
                  }
                  placeholder="1 (Default)"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg font-bold focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                Expiry Date (Optional)
              </label>
              <DatePicker
                value={batchForm.expiresAt}
                onChange={(val) =>
                  setBatchForm({ ...batchForm, expiresAt: val })
                }
                placeholder="Pick an expiry date"
                minDate={new Date()}
              />
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-border bg-bg/50">
              <input
                type="checkbox"
                id="batch-isPublic"
                checked={batchForm.isPublic}
                onChange={(e) =>
                  setBatchForm({ ...batchForm, isPublic: e.target.checked })
                }
                className="mt-0.5 rounded border-border text-accent focus:ring-accent h-4 w-4 cursor-pointer"
              />
              <label htmlFor="batch-isPublic" className="text-xs cursor-pointer select-none">
                <span className="font-bold text-text block">
                  Show batch in "Available Offers" on Checkout (Public)
                </span>
                <span className="text-muted-text text-[11px] block mt-0.5">
                  Keep unchecked (default) for private single-use vouchers given directly to individual customers.
                </span>
              </label>
            </div>
          </form>
        </Modal>
      )}

      {/* Batch Generation Results Modal */}
      {batchResults && (
        <Modal
          title={`Batch Generated Successfully (${batchResults.length} Coupons)`}
          onClose={() => setBatchResults(null)}
          footer={
            <div className="flex items-center justify-between w-full pt-1">
              <button
                type="button"
                onClick={() => {
                  const allCodes = batchResults.map((c) => c.code).join("\n");
                  navigator.clipboard.writeText(allCodes);
                  toast.success(`Copied all ${batchResults.length} codes to clipboard!`);
                }}
                className="secondary-btn text-xs py-2 px-4 font-bold inline-flex items-center gap-1.5"
              >
                <CopyIcon className="h-3.5 w-3.5" />
                <span>Copy All Codes</span>
              </button>

              <button
                type="button"
                onClick={() => setBatchResults(null)}
                className="primary-btn !w-auto text-xs py-2 px-4 font-bold"
              >
                Done
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <p className="text-muted-text">
              Below are your newly created coupons. You can copy them individually or click "Copy All Codes" below to copy the complete list.
            </p>
            <div className="max-h-60 overflow-y-auto rounded-xl border border-border bg-bg p-3 divide-y divide-border/60">
              {batchResults.map((coupon) => (
                <div
                  key={coupon.id}
                  className="py-2 first:pt-0 last:pb-0 flex items-center justify-between"
                >
                  <span className="font-mono font-bold text-accent tracking-wider">
                    {coupon.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(coupon.code)}
                    className="p-1 text-muted-text hover:text-accent font-semibold"
                    title="Copy code"
                  >
                    {copiedCode === coupon.code ? "Copied!" : "Copy"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Coupon Modal */}
      {editingCoupon && (
        <Modal
          title={`Edit Coupon: ${editingCoupon.code}`}
          onClose={() => setEditingCoupon(null)}
          footer={
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setEditingCoupon(null)}
                className="ghost-btn text-xs py-2 px-4"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateCoupon}
                className="primary-btn !w-auto text-xs py-2 px-5 font-bold"
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Update Coupon"}
              </button>
            </div>
          }
        >
          <form onSubmit={handleUpdateCoupon} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                Description / Campaign Note
              </label>
              <input
                type="text"
                value={editingCoupon.description || ""}
                onChange={(e) =>
                  setEditingCoupon({ ...editingCoupon, description: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Active Status
                </label>
                <select
                  value={editingCoupon.isActive ? "true" : "false"}
                  onChange={(e) =>
                    setEditingCoupon({
                      ...editingCoupon,
                      isActive: e.target.value === "true",
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="true">Active (Enabled)</option>
                  <option value="false">Disabled</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Visibility in Checkout
                </label>
                <select
                  value={editingCoupon.isPublic ? "true" : "false"}
                  onChange={(e) =>
                    setEditingCoupon({
                      ...editingCoupon,
                      isPublic: e.target.value === "true",
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="true">Public (Listed in Offers)</option>
                  <option value="false">Private (Hidden / Code Only)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Total Global Usage Limit
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingCoupon.maxUses || ""}
                  onChange={(e) =>
                    setEditingCoupon({ ...editingCoupon, maxUses: e.target.value })
                  }
                  placeholder="Unlimited (empty)"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Limit Per User *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editingCoupon.maxUsesPerUser || "1"}
                  onChange={(e) =>
                    setEditingCoupon({
                      ...editingCoupon,
                      maxUsesPerUser: e.target.value,
                    })
                  }
                  placeholder="1"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg font-bold focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                Expiry Date
              </label>
              <DatePicker
                value={editingCoupon.expiresAt || ""}
                onChange={(val) =>
                  setEditingCoupon({ ...editingCoupon, expiresAt: val })
                }
                placeholder="Pick an expiry date"
              />
              <p className="mt-1 text-[11px] text-muted-text">
                Clear the expiry date to make this coupon never expire.
              </p>
            </div>

            {/* Banner & Occasion Styling Section in Edit Modal */}
            <div className="rounded-xl border border-border bg-bg/40 p-3.5 space-y-3">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="edit-showBanner"
                  checked={Boolean(editingCoupon.showBanner)}
                  onChange={(e) =>
                    setEditingCoupon({ ...editingCoupon, showBanner: e.target.checked })
                  }
                  className="mt-0.5 rounded border-border text-accent focus:ring-accent h-4 w-4 cursor-pointer"
                />
                <label htmlFor="edit-showBanner" className="text-xs cursor-pointer select-none">
                  <span className="font-bold text-text flex items-center gap-1.5">
                    <span>🎉 Feature as Festive / Occasion Offer Banner</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      Hero & Compact Banner
                    </span>
                  </span>
                  <span className="text-muted-text text-[11px] block mt-0.5">
                    Displays an eye-catching interactive offer banner on the Subscription & Pricing pages to boost conversions.
                  </span>
                </label>
              </div>

              {editingCoupon.showBanner && (
                <div className="pt-2 border-t border-border space-y-3">
                  {/* Occasion / Theme Selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                      Occasion & Visual Style Theme
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.values(BANNER_THEMES).map((thm) => {
                        const isSelected = (editingCoupon.bannerTheme || "EMERALD") === thm.id;
                        return (
                          <button
                            key={thm.id}
                            type="button"
                            onClick={() =>
                              setEditingCoupon({ ...editingCoupon, bannerTheme: thm.id })
                            }
                            className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition ${
                              isSelected
                                ? "border-accent bg-accent/10 text-text font-bold shadow-xs"
                                : "border-border bg-surface text-muted-text hover:bg-bg hover:text-text"
                            }`}
                          >
                            <span
                              className="h-3.5 w-3.5 rounded-full shrink-0"
                              style={{ backgroundColor: thm.accentColor }}
                            />
                            <span className="truncate">{thm.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Banner Badge */}
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                        Badge Tag (e.g. DIWALI SPECIAL)
                      </label>
                      <input
                        type="text"
                        value={editingCoupon.bannerBadge || ""}
                        onChange={(e) =>
                          setEditingCoupon({ ...editingCoupon, bannerBadge: e.target.value })
                        }
                        placeholder={
                          BANNER_THEMES[editingCoupon.bannerTheme || "EMERALD"]?.badgeDefault ||
                          "EXCLUSIVE OFFER"
                        }
                        className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>

                    {/* Headline */}
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                        Headline (Optional)
                      </label>
                      <input
                        type="text"
                        value={editingCoupon.bannerHeadline || ""}
                        onChange={(e) =>
                          setEditingCoupon({
                            ...editingCoupon,
                            bannerHeadline: e.target.value,
                          })
                        }
                        placeholder="e.g. 🪔 Happy Diwali Special Discount!"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>

                  {/* Subtitle */}
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                      Subtitle / Subtext (Optional)
                    </label>
                    <input
                      type="text"
                      value={editingCoupon.bannerSubtitle || ""}
                      onChange={(e) =>
                        setEditingCoupon({
                          ...editingCoupon,
                          bannerSubtitle: e.target.value,
                        })
                      }
                      placeholder="e.g. Get flat ₹500 off on all annual subscription plans for a limited period."
                      className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  {/* Live Preview */}
                  <div>
                    <label className="block text-[11px] font-bold text-accent uppercase tracking-wider mb-1.5">
                      Live Banner Preview
                    </label>
                    <div className="rounded-xl border border-border p-2 bg-bg/80">
                      <OfferBanner
                        coupon={{
                          code: editingCoupon.code,
                          discountType: editingCoupon.discountType,
                          discountValue: editingCoupon.discountValue,
                          bannerTheme: editingCoupon.bannerTheme || "EMERALD",
                          bannerHeadline: editingCoupon.bannerHeadline,
                          bannerSubtitle: editingCoupon.bannerSubtitle,
                          bannerBadge: editingCoupon.bannerBadge,
                        }}
                        variant="compact"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default AdminCouponsPage;

