import { format, isValid, parseISO } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import Modal from "../components/Modal";
import DatePicker from "../components/DatePicker";
import AutocompleteInput from "../components/AutocompleteInput";
import OfferBanner, { BANNER_THEMES } from "../components/OfferBanner";
import useDebounce from "../hooks/useDebounce";
import {
  createAdminCoupon,
  deleteAdminCoupon,
  generateAdminCouponBatch,
  getAdminCoupons,
  getAdminUsersSelector,
  signVoucherLink,
  updateAdminCoupon,
} from "../lib/api";
import { encodeVoucherToken } from "../lib/voucherHelper";

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

function LockIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2 shrink-0`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function GlobeIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2 shrink-0`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function ShareIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2 shrink-0`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function ShieldCheckIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2 shrink-0`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function SearchIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current stroke-2 shrink-0`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function WhatsAppIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-current shrink-0`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
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

  // Share / Lock Voucher Modal state
  const [shareModalCoupon, setShareModalCoupon] = useState(null);
  const [shareTargetMode, setShareTargetMode] = useState("LOCKED"); // "LOCKED" | "GENERAL"
  const [usersSelector, setUsersSelector] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [signedShareData, setSignedShareData] = useState(null);
  const [signingShareLink, setSigningShareLink] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

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
    applicablePlan: "ALL",
    applicableCycle: "ALL",
    targetAudience: "ALL",
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
    applicablePlan: "ALL",
    applicableCycle: "ALL",
    targetAudience: "ALL",
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

  function getVoucherDeepLink(code) {
    const origin = typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://saudabook.co.in";
    const token = encodeVoucherToken(code);
    return `${origin}/?v=${encodeURIComponent(token)}`;
  }

  function handleCopy(code) {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied "${code}" to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return usersSelector.find((u) => u.id === selectedUserId) || null;
  }, [usersSelector, selectedUserId]);

  const userAutocompleteOptions = useMemo(() => {
    return usersSelector.map((u) => {
      const firmPart = u.firmName ? `(${u.firmName})` : "";
      const label = `${u.name || "Customer"} ${firmPart}`.trim();
      const phonePart = u.contactPhone ? `Phone: ${u.contactPhone}` : "No phone";
      const planPart = `Plan: ${u.subscriptionPlan || "FREE"}`;
      const emailPart = u.email ? `• ${u.email}` : "";
      const helperText = `${phonePart} ${emailPart} • ${planPart}`;
      return {
        value: u.id,
        label,
        helperText,
        user: u,
      };
    });
  }, [usersSelector]);

  const handleOpenShareModal = async (coupon) => {
    setShareModalCoupon(coupon);
    setShareTargetMode("LOCKED");
    setSelectedUserId("");
    setUserSearchQuery("");
    setSignedShareData(null);
    setShareCopied(false);

    if (usersSelector.length === 0) {
      setLoadingUsers(true);
      try {
        const payload = await getAdminUsersSelector();
        if (Array.isArray(payload?.users)) {
          setUsersSelector(payload.users);
        }
      } catch (_err) {
        toast.error("Failed to load customer list for locking");
      } finally {
        setLoadingUsers(false);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!shareModalCoupon) {
      setSignedShareData(null);
      return;
    }

    if (shareTargetMode === "GENERAL") {
      const origin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : "https://saudabook.co.in";
      const token = encodeVoucherToken(shareModalCoupon.code);
      setSignedShareData({
        token,
        link: `${origin}/?v=${encodeURIComponent(token)}`,
        isLocked: false,
      });
      return;
    }

    // LOCKED mode
    if (selectedUser) {
      setSigningShareLink(true);
      signVoucherLink({
        code: shareModalCoupon.code,
        targetUserId: selectedUser.id,
        targetPhone: selectedUser.contactPhone,
      })
        .then((res) => {
          if (!cancelled && res?.token) {
            const origin =
              typeof window !== "undefined" && window.location.origin
                ? window.location.origin
                : "https://saudabook.co.in";
            setSignedShareData({
              token: res.token,
              link: `${origin}/?v=${encodeURIComponent(res.token)}`,
              isLocked: res.isLocked,
              targetUserName: res.targetUserName,
              targetFirmName: res.targetFirmName,
              targetPhone: res.targetPhone,
            });
          }
        })
        .catch((err) => {
          if (!cancelled) {
            toast.error(err?.response?.data?.message || "Failed to generate locked link");
            setSignedShareData(null);
          }
        })
        .finally(() => {
          if (!cancelled) setSigningShareLink(false);
        });
    } else {
      setSignedShareData(null);
    }

    return () => {
      cancelled = true;
    };
  }, [shareModalCoupon, shareTargetMode, selectedUser]);

  const handleCopyShareLink = async () => {
    if (!signedShareData?.link) return;
    await navigator.clipboard.writeText(signedShareData.link);
    setShareCopied(true);
    toast.success("Voucher link copied to clipboard!");
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleShareModalWhatsApp = () => {
    if (!shareModalCoupon || !signedShareData?.link) return;
    const coupon = shareModalCoupon;
    const link = signedShareData.link;
    const discountText =
      coupon.discountType === "PERCENTAGE"
        ? `${coupon.discountValue}% OFF`
        : `₹${coupon.discountValue.toLocaleString("en-IN")} FLAT OFF`;
    const isFree = coupon.discountType === "PERCENTAGE" && Number(coupon.discountValue) === 100;
    const planText =
      coupon.applicablePlan && coupon.applicablePlan !== "ALL"
        ? `${coupon.applicablePlan} Plan`
        : "Subscription Plan";
    const cycleText =
      coupon.applicableCycle && coupon.applicableCycle !== "ALL"
        ? `(${coupon.applicableCycle === "YEARLY" ? "1 Year" : "1 Month"})`
        : "";

    const greeting = selectedUser?.name
      ? `Hello ${selectedUser.name}${selectedUser.firmName ? ` (${selectedUser.firmName})` : ""},\n\n`
      : "";

    const promoHeadline = isFree
      ? `Special Voucher: 100% FREE ${planText} ${cycleText} on Sauda Book!`
      : `Special Offer: Get ${discountText} on your ${planText} ${cycleText}!`;

    const lockNotice = signedShareData.isLocked
      ? `_(This exclusive voucher is cryptographically locked to your account and activates automatically on login)_`
      : `_(This voucher activates automatically on login)_`;

    const text = `${greeting}*${promoHeadline}*

Tap your private link below to claim & activate directly:
${link}

${lockNotice}`;

    let waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    if (signedShareData.isLocked && selectedUser?.contactPhone) {
      const cleanDigits = String(selectedUser.contactPhone).replace(/\D/g, "");
      if (cleanDigits) {
        const fullPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
        waUrl = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(text)}`;
      }
    }

    window.open(waUrl, "_blank");
  };

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
        applicablePlan: "ALL",
        applicableCycle: "ALL",
        targetAudience: "ALL",
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
        applicablePlan: editingCoupon.applicablePlan || "ALL",
        applicableCycle: editingCoupon.applicableCycle || "ALL",
        targetAudience: editingCoupon.targetAudience || "ALL",
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
                  <th className="px-4 py-3">Target Plan & Cycle</th>
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
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              coupon.applicablePlan && coupon.applicablePlan !== "ALL"
                                ? "bg-accent/15 text-accent border border-accent/30"
                                : "bg-bg text-muted-text border border-border"
                            }`}
                          >
                            {coupon.applicablePlan && coupon.applicablePlan !== "ALL"
                              ? `${coupon.applicablePlan} PLAN`
                              : "ALL PLANS"}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold text-muted-text">
                            {coupon.applicableCycle && coupon.applicableCycle !== "ALL"
                              ? `${coupon.applicableCycle} ONLY`
                              : "ANY CYCLE"}
                          </span>
                          {coupon.targetAudience === "NEW_OR_EXPIRED_ONLY" ? (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              New / Expired Only
                            </span>
                          ) : (
                            <span className="text-[9px] text-muted-text">
                              All Users
                            </span>
                          )}
                        </div>
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
                          {/* Share / Lock Voucher Link Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenShareModal(coupon)}
                            className="px-2.5 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition flex items-center gap-1.5 text-xs font-semibold"
                            title="Generate customer-locked voucher link or share on WhatsApp"
                          >
                            <ShareIcon className="h-3.5 w-3.5 shrink-0" />
                            <span>Share Link</span>
                          </button>

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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Target Plan *
                </label>
                <select
                  value={singleForm.applicablePlan}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, applicablePlan: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="ALL">All Plans (Unrestricted)</option>
                  <option value="STARTER">Starter Plan Only</option>
                  <option value="GROWTH">Growth / Budget Plan Only</option>
                  <option value="PREMIUM">Premium Plan Only</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Billing Cycle *
                </label>
                <select
                  value={singleForm.applicableCycle}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, applicableCycle: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="ALL">Any Cycle (Monthly & Yearly)</option>
                  <option value="MONTHLY">Monthly Only (30 Days)</option>
                  <option value="YEARLY">Yearly Only (365 Days)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  User Eligibility *
                </label>
                <select
                  value={singleForm.targetAudience || "ALL"}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, targetAudience: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="ALL">All Users (New & Extensions)</option>
                  <option value="NEW_OR_EXPIRED_ONLY">New or Expired Only</option>
                </select>
              </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Target Plan *
                </label>
                <select
                  value={batchForm.applicablePlan}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, applicablePlan: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="ALL">All Plans (Unrestricted)</option>
                  <option value="STARTER">Starter Plan Only</option>
                  <option value="GROWTH">Growth / Budget Plan Only</option>
                  <option value="PREMIUM">Premium Plan Only</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Billing Cycle *
                </label>
                <select
                  value={batchForm.applicableCycle}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, applicableCycle: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="ALL">Any Cycle (Monthly & Yearly)</option>
                  <option value="MONTHLY">Monthly Only (30 Days)</option>
                  <option value="YEARLY">Yearly Only (365 Days)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  User Eligibility *
                </label>
                <select
                  value={batchForm.targetAudience || "ALL"}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, targetAudience: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="ALL">All Users (New & Extensions)</option>
                  <option value="NEW_OR_EXPIRED_ONLY">New or Expired Only</option>
                </select>
              </div>
            </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Target Plan *
                </label>
                <select
                  value={editingCoupon.applicablePlan || "ALL"}
                  onChange={(e) =>
                    setEditingCoupon({ ...editingCoupon, applicablePlan: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="ALL">All Plans (Unrestricted)</option>
                  <option value="STARTER">Starter Plan Only</option>
                  <option value="GROWTH">Growth / Budget Plan Only</option>
                  <option value="PREMIUM">Premium Plan Only</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  Billing Cycle *
                </label>
                <select
                  value={editingCoupon.applicableCycle || "ALL"}
                  onChange={(e) =>
                    setEditingCoupon({ ...editingCoupon, applicableCycle: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="ALL">Any Cycle (Monthly & Yearly)</option>
                  <option value="MONTHLY">Monthly Only (30 Days)</option>
                  <option value="YEARLY">Yearly Only (365 Days)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-text uppercase mb-1">
                  User Eligibility *
                </label>
                <select
                  value={editingCoupon.targetAudience || "ALL"}
                  onChange={(e) =>
                    setEditingCoupon({ ...editingCoupon, targetAudience: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="ALL">All Users (New & Extensions)</option>
                  <option value="NEW_OR_EXPIRED_ONLY">New or Expired Only</option>
                </select>
              </div>
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

      {/* Share / Lock Voucher Modal */}
      {shareModalCoupon && (
        <Modal
          title={`Share Voucher: ${shareModalCoupon.code}`}
          onClose={() => setShareModalCoupon(null)}
          footer={
            <div className="flex items-center justify-between gap-3 pt-1 w-full">
              <div className="text-xs text-muted-text truncate">
                {shareTargetMode === "LOCKED" ? (
                  selectedUser ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1.5">
                      <ShieldCheckIcon className="h-4 w-4 shrink-0" />
                      Locked to {selectedUser.name || selectedUser.firmName || "Customer"}
                    </span>
                  ) : (
                    <span>Select a customer above to lock this voucher</span>
                  )
                ) : (
                  <span className="text-sky-600 dark:text-sky-400 font-medium inline-flex items-center gap-1.5">
                    <GlobeIcon className="h-4 w-4 shrink-0" />
                    Public voucher link (unlocked)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShareModalCoupon(null)}
                className="ghost-btn text-xs py-2 px-4 shrink-0"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Voucher Overview Card */}
            <div className="p-3.5 rounded-xl bg-surface border border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <TagIcon className="h-5 w-5 shrink-0" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-text tracking-wide">
                      {shareModalCoupon.code}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {shareModalCoupon.discountType === "PERCENTAGE"
                        ? `${shareModalCoupon.discountValue}% OFF`
                        : `₹${Number(shareModalCoupon.discountValue).toLocaleString("en-IN")} FLAT OFF`}
                    </span>
                    {shareModalCoupon.discountType === "PERCENTAGE" &&
                      Number(shareModalCoupon.discountValue) === 100 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          100% FREE
                        </span>
                      )}
                  </div>
                  <p className="text-[11px] text-muted-text truncate mt-1">
                    Target: {shareModalCoupon.applicablePlan !== "ALL" ? `${shareModalCoupon.applicablePlan} Plan` : "All Plans"} •{" "}
                    {shareModalCoupon.applicableCycle !== "ALL"
                      ? shareModalCoupon.applicableCycle === "YEARLY"
                        ? "1 Year"
                        : "1 Month"
                      : "All Cycles"}
                  </p>
                </div>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text">Link Security Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShareTargetMode("LOCKED")}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    shareTargetMode === "LOCKED"
                      ? "border-primary bg-primary/5 text-primary shadow-xs"
                      : "border-border bg-surface text-muted-text hover:text-text hover:bg-surface-muted"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <LockIcon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-xs font-bold text-text">Account-Locked Link</span>
                  </div>
                  <p className="text-[11px] text-muted-text leading-tight">
                    Tied strictly to one customer. Server rejects redemption if forwarded to anyone else.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setShareTargetMode("GENERAL")}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    shareTargetMode === "GENERAL"
                      ? "border-primary bg-primary/5 text-primary shadow-xs"
                      : "border-border bg-surface text-muted-text hover:text-text hover:bg-surface-muted"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <GlobeIcon className="h-4 w-4 shrink-0 text-sky-600" />
                    <span className="text-xs font-bold text-text">General Public Link</span>
                  </div>
                  <p className="text-[11px] text-muted-text leading-tight">
                    Unlocked link. Any registered user or new sign up can redeem upon clicking.
                  </p>
                </button>
              </div>
            </div>

            {/* When LOCKED mode: Customer search & selector */}
            {shareTargetMode === "LOCKED" && (
              <div className="space-y-2 pt-1 border-t border-border">
                {/* Unified Autocomplete Input */}
                <div className="relative">
                  <AutocompleteInput
                    label="Choose Customer to Lock Voucher For"
                    value={userSearchQuery}
                    onChange={(val) => {
                      setUserSearchQuery(val);
                      if (!val.trim()) {
                        setSelectedUserId("");
                      } else {
                        const match = usersSelector.find((u) => u.id === selectedUserId);
                        const expected = match
                          ? (match.firmName
                              ? `${match.name || "Customer"} (${match.firmName})`
                              : match.name || "Customer"
                            ).trim()
                          : "";
                        if (val !== expected) {
                          setSelectedUserId("");
                        }
                      }
                    }}
                    onSelect={(option) => {
                      setSelectedUserId(option.value);
                      setUserSearchQuery(option.label);
                    }}
                    options={userAutocompleteOptions}
                    placeholder="Search customer by name, firm, phone, or email..."
                    inputClassName="!text-xs !py-2 bg-bg border-border"
                    helperText={
                      loadingUsers
                        ? "Loading customer directory..."
                        : !selectedUser && userSearchQuery.trim()
                        ? "Click a customer from the autocomplete list above to select"
                        : ""
                    }
                  />

                  {/* Clear button if input is filled */}
                  {userSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserSearchQuery("");
                        setSelectedUserId("");
                      }}
                      className="absolute right-2.5 top-8 p-1 rounded-md text-muted-text hover:text-text hover:bg-surface-muted transition"
                      title="Clear customer selection"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2 shrink-0">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Selected User Guarantee Box */}
                {selectedUser ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                        <ShieldCheckIcon className="h-4 w-4 shrink-0" />
                        <span>Locked to: {selectedUser.name || "Customer"}</span>
                      </div>
                      {selectedUser.contactPhone && (
                        <span className="font-mono text-[11px] text-emerald-800 dark:text-emerald-300">
                          {selectedUser.contactPhone}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                      {selectedUser.firmName ? `${selectedUser.firmName} • ` : ""}
                      {selectedUser.email ? `${selectedUser.email} • ` : ""}
                      Current Plan: <strong>{selectedUser.subscriptionPlan || "FREE"}</strong> ({selectedUser.subscriptionStatus || "ACTIVE"})
                    </p>
                    <p className="text-[10px] text-muted-text border-t border-emerald-500/20 pt-1.5 mt-1">
                      This link includes a cryptographically signed token. Only this customer's account can redeem it; anyone else will see an unauthorized account error.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-surface-muted border border-dashed border-border text-center text-muted-text text-xs">
                    Please select a customer from the dropdown above to generate their personalized locked link.
                  </div>
                )}
              </div>
            )}

            {/* Generated Link & Copy / Share Buttons */}
            <div className="space-y-2 pt-1 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text">Voucher Claim Deep Link</label>
                {signingShareLink && (
                  <span className="text-[11px] text-primary animate-pulse">
                    Generating signed link...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={signedShareData?.link || ""}
                  placeholder={
                    shareTargetMode === "LOCKED" && !selectedUser
                      ? "Select a customer to generate locked link..."
                      : "Generating link..."
                  }
                  onClick={(e) => e.target.select()}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-xs font-mono select-all focus:outline-none focus:ring-1 focus:ring-primary flex-1"
                />

                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  disabled={!signedShareData?.link}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                    shareCopied
                      ? "bg-emerald-600 text-white"
                      : "border border-border bg-surface hover:bg-surface-muted text-text disabled:opacity-50"
                  }`}
                  title="Copy voucher link"
                >
                  {shareCopied ? (
                    <>
                      <CheckIcon className="h-3.5 w-3.5 shrink-0" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="h-3.5 w-3.5 shrink-0" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Share on WhatsApp Button */}
              <button
                type="button"
                onClick={handleShareModalWhatsApp}
                disabled={!signedShareData?.link}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-sm"
              >
                <WhatsAppIcon className="h-4 w-4 shrink-0" />
                <span>
                  {shareTargetMode === "LOCKED" && selectedUser?.contactPhone
                    ? `Send to ${selectedUser.name || "Customer"}'s WhatsApp (${selectedUser.contactPhone})`
                    : "Share via WhatsApp"}
                </span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default AdminCouponsPage;

