import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Modal from "./Modal";
import { createSubscriptionOrder, validateCouponCode } from "../lib/api";
import { trackEvent } from "../lib/analytics";
import {
  clearPendingVoucher,
  getPendingVoucher,
  getPendingVoucherToken,
} from "../lib/voucherHelper";
import { getPlanTier } from "../config/subscriptionPlans";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setUserProfile } from "../store/slices/authSlice";

export default function VoucherRedemptionModal() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [isOpen, setIsOpen] = useState(false);
  const [voucherData, setVoucherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [celebrationData, setCelebrationData] = useState(null);

  useEffect(() => {
    // Only process when user is authenticated
    if (!user?.id) {
      return;
    }

    const pendingCode = getPendingVoucher();
    if (!pendingCode || isOpen || celebrationData) {
      return;
    }

    // If user landed on /subscription with a pending voucher, guide them to Home ("/")
    if (location.pathname.startsWith("/subscription")) {
      navigate("/", { replace: true });
    }

    let isMounted = true;
    setLoading(true);

    validateCouponCode({
      code: pendingCode,
      voucherToken: getPendingVoucherToken(),
    })
      .then((res) => {
        if (!isMounted) return;
        setVoucherData(res);
        setIsOpen(true);
      })
      .catch((err) => {
        if (!isMounted) return;
        // Invalidate invalid/expired pending vouchers immediately
        clearPendingVoucher();
        const msg =
          err?.response?.data?.message ||
          "This voucher is invalid, expired, or unavailable.";
        toast.error(msg);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.id, location.pathname]);

  const targetTier = useMemo(() => {
    if (!voucherData?.targetPlan) return null;
    return getPlanTier(voucherData.targetPlan);
  }, [voucherData?.targetPlan]);

  // Parse any custom notes or bullet points from the voucher description
  const customDescriptionLines = useMemo(() => {
    if (!voucherData?.coupon?.description) return [];
    return voucherData.coupon.description
      .split(/[\r\n]+/)
      .map((line) => line.replace(/^[•\-\*]\s*/, "").trim())
      .filter((line) => line.length > 0);
  }, [voucherData?.coupon?.description]);

  const handleDismiss = () => {
    clearPendingVoucher();
    setIsOpen(false);
    setVoucherData(null);
  };

  const handleClaimVoucher = async () => {
    const pendingCode = getPendingVoucher();
    if (!voucherData || !pendingCode) return;

    // CASE 1: 100% Free Voucher Activation (Zero payment)
    if (voucherData.isFree || voucherData.finalPrice === 0) {
      try {
        setIsClaiming(true);
        const orderData = await createSubscriptionOrder({
          plan: voucherData.targetPlan,
          billingCycle: voucherData.targetCycle,
          couponCode: pendingCode,
          voucherToken: getPendingVoucherToken(),
        });

        trackEvent("voucher_free_home_activated", {
          planId: voucherData.targetPlan,
          cycle: voucherData.targetCycle,
        });

        clearPendingVoucher();
        setIsOpen(false);

        // Update Redux state with active subscription
        dispatch(
          setUserProfile({
            subscriptionPlan: voucherData.targetPlan,
            billingCycle: voucherData.targetCycle,
            subscriptionStatus: "ACTIVE",
            planExpiresAt: orderData.expiresAt,
          })
        );

        setCelebrationData({
          planName: targetTier?.name || voucherData.targetPlan,
          planId: voucherData.targetPlan,
          cycle: voucherData.targetCycle,
          expiresAt: orderData.expiresAt,
          isExtension: voucherData.isExtension,
          extensionDays: voucherData.extensionDays,
          features: targetTier?.features || [],
        });
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          "Failed to activate voucher subscription. Please try again.";
        toast.error(msg);
      } finally {
        setIsClaiming(false);
      }
    } else {
      // CASE 2: Discount voucher (Requires payment of remaining balance)
      setIsOpen(false);
      navigate("/subscription");
    }
  };

  return (
    <>
      {/* DYNAMIC VOUCHER CLAIM MODAL */}
      {isOpen && voucherData && targetTier && (
        <Modal
          title={voucherData.coupon?.bannerHeadline || "Exclusive Voucher Gift"}
          onClose={handleDismiss}
          maxWidth="max-w-lg"
          footer={
            <div className="flex items-center justify-end gap-2 w-full pt-1">
              <button
                type="button"
                onClick={handleDismiss}
                disabled={isClaiming}
                className="ghost-btn text-xs py-2 px-3"
              >
                Dismiss
              </button>
              {voucherData.isFree ? (
                <button
                  type="button"
                  onClick={handleClaimVoucher}
                  disabled={isClaiming}
                  className="primary-btn !w-auto text-xs py-2 px-5 font-bold inline-flex items-center gap-1.5"
                >
                  {isClaiming ? (
                    <>
                      <svg
                        className="animate-spin h-3.5 w-3.5 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      <span>Activating Access...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        className="h-3.5 w-3.5 fill-none stroke-current stroke-2 shrink-0"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span>Claim & Activate Free Subscription</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleClaimVoucher}
                  className="primary-btn !w-auto text-xs py-2 px-5 font-bold inline-flex items-center gap-1.5"
                >
                  <span>Proceed to Checkout</span>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5 fill-none stroke-current stroke-2 shrink-0"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Voucher Hero Header */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-bold text-xs tracking-wider bg-surface text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5 fill-none stroke-current stroke-2 shrink-0"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>{voucherData.coupon?.bannerBadge || "VIP PRIVATE VOUCHER"}</span>
                  <span className="text-[10px] opacity-75 font-sans">(Verified)</span>
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3 w-3 fill-none stroke-current stroke-2 shrink-0"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>
                    {voucherData.targetCycle === "YEARLY"
                      ? "1 Year (365 Days)"
                      : "1 Month (30 Days)"}
                  </span>
                </span>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-text">
                  {targetTier.name}
                </h3>
                <p className="text-xs text-muted-text mt-0.5 max-w-sm mx-auto">
                  {voucherData.coupon?.bannerSubtitle || targetTier.subtitle}
                </p>
              </div>

              {/* Custom Description Highlight if provided by admin */}
              {customDescriptionLines.length > 0 && (
                <div className="rounded-lg bg-surface/80 border border-emerald-500/20 p-2 text-left space-y-1">
                  {customDescriptionLines.map((line, idx) => (
                    <p key={idx} className="text-[11px] text-text flex items-start gap-1.5">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5 fill-none stroke-current stroke-2"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{line}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Active Subscription Extension Notice */}
            {voucherData.isExtension && voucherData.extendedExpiry && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-bold">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 fill-none stroke-current stroke-2 shrink-0"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>Active Subscription Extension</span>
                </div>
                <p className="text-[11px] text-sky-950 dark:text-sky-100 leading-relaxed">
                  Your current <strong>{targetTier.name}</strong> is active until{" "}
                  <strong>
                    {new Date(voucherData.currentExpiry).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>.
                  Claiming this voucher will extend your plan by <strong>+{voucherData.extensionDays} days</strong> until{" "}
                  <strong>
                    {new Date(voucherData.extendedExpiry).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong> without losing any remaining time!
                </p>
              </div>
            )}

            {/* DYNAMIC PLAN FEATURES LIST UNLOCKED */}
            <div className="rounded-xl border border-border bg-surface p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-text">
                  Features Included in {targetTier.name}
                </span>
                <span className="text-[10px] font-semibold text-accent">
                  {targetTier.badge}
                </span>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {targetTier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5 fill-none stroke-current stroke-2"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-text leading-tight text-[11px]">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pricing Summary */}
            <div className="rounded-xl border border-border bg-bg/50 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-text">
                <span>Standard Price ({voucherData.targetCycle === "YEARLY" ? "Yearly" : "Monthly"}):</span>
                <span className="line-through">₹{voucherData.basePrice?.toLocaleString("en-IN")}</span>
              </div>

              {voucherData.unusedCredit > 0 && (
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Prepaid Plan Credit:</span>
                  <span>-₹{voucherData.unusedCredit?.toLocaleString("en-IN")}</span>
                </div>
              )}

              <div className="flex items-center justify-between font-semibold text-emerald-600 dark:text-emerald-400">
                <span>Voucher Benefit:</span>
                <span>
                  {voucherData.isFree
                    ? `100% FREE Access (Save ₹${voucherData.basePrice?.toLocaleString("en-IN")})`
                    : `-₹${voucherData.discountAmount?.toLocaleString("en-IN")} Discount`}
                </span>
              </div>

              <div className="border-t border-border/60 pt-2 flex items-center justify-between text-sm font-extrabold text-text">
                <span>Total Payable:</span>
                {voucherData.isFree ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    <span>₹0 (100% FREE)</span>
                  </span>
                ) : (
                  <span className="text-accent">
                    ₹{voucherData.finalPrice?.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            </div>

            {/* Explanatory Footer Note */}
            <div className="rounded-lg bg-surface border border-border p-2.5 text-[11px] text-muted-text leading-relaxed">
              {voucherData.isFree ? (
                <p>
                  <strong>Zero-payment activation:</strong> Clicking &quot;Claim &amp; Activate Free Subscription&quot; immediately provisions full {targetTier.name} access for {voucherData.targetCycle === "YEARLY" ? "1 Year" : "1 Month"} without entering bank or card details.
                </p>
              ) : (
                <p>
                  <strong>Pre-applied discount:</strong> Clicking &quot;Proceed to Checkout&quot; will pre-apply your discount. You will only pay the balance of ₹{voucherData.finalPrice?.toLocaleString("en-IN")}.
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* CELEBRATION MODAL ON SUCCESSFUL ACTIVATION */}
      {celebrationData && (
        <Modal
          title="Subscription Activated"
          onClose={() => setCelebrationData(null)}
          maxWidth="max-w-md"
          footer={
            <div className="flex justify-end w-full pt-1">
              <button
                type="button"
                onClick={() => setCelebrationData(null)}
                className="primary-btn !w-auto text-xs py-2 px-5 font-bold"
              >
                Start Using Sauda Book
              </button>
            </div>
          }
        >
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-500/10">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7 fill-none stroke-current stroke-2 shrink-0"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-text">
                {celebrationData.isExtension
                  ? `${celebrationData.planName} Extended by +${celebrationData.extensionDays} Days!`
                  : `Welcome to ${celebrationData.planName}!`}
              </h3>
              <p className="text-xs text-muted-text mt-1 max-w-sm mx-auto">
                {celebrationData.isExtension
                  ? "Your private voucher successfully extended your active subscription."
                  : "Your private voucher was applied successfully and your full plan features are now active."}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-bg/60 p-3 text-xs max-w-xs mx-auto space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-text">Plan Tier:</span>
                <span className="font-bold text-text">{celebrationData.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-text">Billing Cycle:</span>
                <span className="font-bold text-text">
                  {celebrationData.cycle === "YEARLY" ? "1 Year (Annual)" : "Monthly"}
                </span>
              </div>
              {celebrationData.expiresAt && (
                <div className="flex justify-between">
                  <span className="text-muted-text">Valid Until:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {new Date(celebrationData.expiresAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Summary of unlocked capabilities */}
            {celebrationData.features?.length > 0 && (
              <div className="text-left rounded-lg bg-surface border border-border p-3 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-text">
                  Now Available on Your Account:
                </p>
                <div className="grid grid-cols-1 gap-1">
                  {celebrationData.features.slice(0, 4).map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-text">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-3 w-3 text-emerald-500 shrink-0 fill-none stroke-current stroke-2"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
