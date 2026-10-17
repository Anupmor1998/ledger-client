import { useState } from "react";
import { Link } from "react-router-dom";
import { trackEvent } from "../lib/analytics";

export const BANNER_THEMES = {
  DIWALI_GOLD: {
    id: "DIWALI_GOLD",
    label: "🪔 Festive Gold / Diwali",
    badgeDefault: "FESTIVE DHAMAKA",
    badgeBg: "bg-amber-400 text-amber-950 shadow-sm",
    wrapperBg:
      "bg-gradient-to-r from-amber-700 via-amber-600 to-yellow-600 text-white shadow-amber-900/20",
    border: "border-amber-400/40",
    glow: "bg-yellow-400/20",
    codeBg: "bg-black/25 text-amber-100 border-amber-300/40 hover:bg-black/35",
    btnBg:
      "bg-amber-100 text-amber-950 hover:bg-white active:bg-amber-200 shadow-md",
    accentColor: "#f59e0b",
  },
  FESTIVE_CORAL: {
    id: "FESTIVE_CORAL",
    label: "🎨 Festive Coral / Celebration",
    badgeDefault: "SPECIAL CELEBRATION",
    badgeBg: "bg-white text-rose-700 shadow-sm",
    wrapperBg:
      "bg-gradient-to-r from-rose-600 via-red-500 to-orange-500 text-white shadow-rose-900/20",
    border: "border-rose-400/40",
    glow: "bg-rose-400/20",
    codeBg: "bg-black/25 text-rose-100 border-rose-300/40 hover:bg-black/35",
    btnBg:
      "bg-white text-rose-700 hover:bg-rose-50 active:bg-rose-100 shadow-md",
    accentColor: "#f43f5e",
  },
  ANNIVERSARY_PURPLE: {
    id: "ANNIVERSARY_PURPLE",
    label: "👑 Anniversary / Royal Purple",
    badgeDefault: "ANNIVERSARY SALE",
    badgeBg: "bg-fuchsia-300 text-purple-950 shadow-sm",
    wrapperBg:
      "bg-gradient-to-r from-purple-800 via-fuchsia-700 to-indigo-800 text-white shadow-purple-900/25",
    border: "border-fuchsia-400/40",
    glow: "bg-fuchsia-400/20",
    codeBg: "bg-black/25 text-purple-100 border-fuchsia-300/40 hover:bg-black/35",
    btnBg:
      "bg-fuchsia-100 text-purple-950 hover:bg-white active:bg-fuchsia-200 shadow-md",
    accentColor: "#a855f7",
  },
  FLASH_CYAN: {
    id: "FLASH_CYAN",
    label: "⚡ Flash Sale / Electric Blue",
    badgeDefault: "LIMITED TIME OFFER",
    badgeBg: "bg-cyan-300 text-blue-950 shadow-sm",
    wrapperBg:
      "bg-gradient-to-r from-blue-700 via-cyan-600 to-indigo-800 text-white shadow-cyan-900/20",
    border: "border-cyan-400/40",
    glow: "bg-cyan-400/20",
    codeBg: "bg-black/25 text-cyan-100 border-cyan-300/40 hover:bg-black/35",
    btnBg:
      "bg-cyan-100 text-blue-950 hover:bg-white active:bg-cyan-200 shadow-md",
    accentColor: "#06b6d4",
  },
  EMERALD: {
    id: "EMERALD",
    label: "🌿 Sauda Emerald / App Theme",
    badgeDefault: "EXCLUSIVE OFFER",
    badgeBg: "bg-emerald-300 text-emerald-950 shadow-sm",
    wrapperBg:
      "bg-gradient-to-r from-teal-800 via-emerald-700 to-cyan-800 text-white shadow-teal-900/20",
    border: "border-emerald-400/40",
    glow: "bg-emerald-400/20",
    codeBg: "bg-black/25 text-emerald-100 border-emerald-300/40 hover:bg-black/35",
    btnBg:
      "bg-emerald-100 text-emerald-950 hover:bg-white active:bg-emerald-200 shadow-md",
    accentColor: "#0f766e",
  },
};

export default function OfferBanner({
  coupon,
  onApply,
  variant = "hero", // 'hero' (full banner) or 'compact' (slim bar)
  className = "",
}) {
  const [copied, setCopied] = useState(false);

  if (!coupon) return null;

  const themeKey = coupon.bannerTheme || "EMERALD";
  const theme = BANNER_THEMES[themeKey] || BANNER_THEMES.EMERALD;

  const discountText =
    coupon.discountType === "PERCENTAGE"
      ? `${coupon.discountValue}% OFF`
      : `₹${Number(coupon.discountValue || 0).toLocaleString("en-IN")} FLAT OFF`;

  const headline =
    coupon.bannerHeadline ||
    `Special Offer: Get ${discountText} on Subscription Plans`;

  const subtitle =
    coupon.bannerSubtitle ||
    coupon.description ||
    `Upgrade today with code ${coupon.code} and unlock full power features.`;

  const badge = coupon.bannerBadge || theme.badgeDefault;

  async function handleCopyCode(e) {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      trackEvent("coupon_code_copied", {
        code: coupon.code,
        theme: themeKey,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  function handleClaim(e) {
    trackEvent("offer_banner_claimed", {
      code: coupon.code,
      theme: themeKey,
    });
    if (onApply) {
      e?.preventDefault();
      onApply(coupon);
    }
  }

  if (variant === "compact") {
    return (
      <div
        className={`relative overflow-hidden rounded-xl border ${theme.border} ${theme.wrapperBg} p-3 sm:px-4 sm:py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${theme.badgeBg}`}
          >
            {badge}
          </span>
          <p className="text-xs sm:text-sm font-bold truncate">
            {headline}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyCode}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold tracking-wider transition ${theme.codeBg}`}
            title="Click to copy code"
          >
            <span>{coupon.code}</span>
            {copied ? (
              <span className="text-[10px] text-green-300 font-sans">Copied!</span>
            ) : (
              <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current stroke-2">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            )}
          </button>

          {onApply ? (
            <button
              type="button"
              onClick={handleClaim}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition shadow-sm ${theme.btnBg}`}
            >
              Apply Offer
            </button>
          ) : (
            <Link
              to="/subscription#plans-grid"
              onClick={handleClaim}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition shadow-sm ${theme.btnBg}`}
            >
              Claim Offer
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Full Hero Banner
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${theme.border} ${theme.wrapperBg} p-5 sm:p-6 shadow-xl ${className}`}
    >
      {/* Decorative festive ambient glows */}
      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-2xl ${theme.glow}`}
      />
      <div
        className={`pointer-events-none absolute -left-12 -bottom-12 h-44 w-44 rounded-full blur-2xl ${theme.glow}`}
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider ${theme.badgeBg}`}
            >
              {badge}
            </span>
            <span className="text-xs font-semibold text-white/80">
              Save with coupon
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white drop-shadow-sm">
            {headline}
          </h3>

          <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Action side: Coupon code + Claim CTA */}
        <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-3 shrink-0 pt-2 sm:pt-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">
              Coupon Code:
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-mono font-black tracking-widest transition ${theme.codeBg}`}
              title="Click to copy code"
            >
              <span>{coupon.code}</span>
              {copied ? (
                <span className="text-xs text-green-300 font-sans font-bold">
                  ✓ Copied
                </span>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5 fill-none stroke-current stroke-2 text-white/70"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              )}
            </button>
          </div>

          {onApply ? (
            <button
              type="button"
              onClick={handleClaim}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition shadow-lg flex items-center justify-center gap-2 ${theme.btnBg}`}
            >
              <span>Claim Offer / Apply Now</span>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-none stroke-current stroke-2"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          ) : (
            <Link
              to="/subscription#plans-grid"
              onClick={handleClaim}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition shadow-lg flex items-center justify-center gap-2 text-center ${theme.btnBg}`}
            >
              <span>Claim Offer / Upgrade</span>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-none stroke-current stroke-2"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

