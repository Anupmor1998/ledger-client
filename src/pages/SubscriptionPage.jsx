import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import Modal from "../components/Modal";
import {
  createSubscriptionOrder,
  getSubscriptionInvoices,
  getSubscriptionStatus,
  previewSubscriptionOrder,
  verifySubscriptionPayment,
} from "../lib/api";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setUserProfile } from "../store/slices/authSlice";
import { loadRazorpaySDK } from "../utils/razorpay";

const PLAN_TIERS = [
  {
    id: "STARTER",
    name: "Starter",
    badge: "Entry Pack",
    monthlyPrice: 99,
    yearlyPrice: 990,
    subtitle: "Essential digital ledger for individual brokers starting out.",
    features: [
      "Full Sauda & Order Creation (Takka, Lot, Meter)",
      "Order Progress & Dispatch Tracking",
      "Commission & Payment Due Records",
      "Direct WhatsApp Share for Sauda Slips",
      "Multi-Device Sync (Mobile + Desktop PWA)",
      "Excel (.xlsx) Report Downloads (Up to 30/mo)",
      "Multi-Financial Year Support",
    ],
    excluded: [
      "100% Ad-Free Experience",
      "Branded PDF Statement Exports",
      "Visual Analytics Dashboard",
      "Market Directory Search & Leads",
    ],
  },
  {
    id: "GROWTH",
    name: "Growth / Budget",
    badge: "Most Popular",
    highlight: true,
    monthlyPrice: 299,
    yearlyPrice: 2990,
    subtitle: "High-speed, 100% ad-free experience with professional PDF statements.",
    features: [
      "Everything in Starter",
      "100% Ad-Free (Zero Distractions)",
      "Zero Load Time (Priority Fast Server)",
      "Branded PDF Reports & Statements (Print-Ready Downloads)",
      "Direct WhatsApp Share for Sauda Slips",
      "Expanded Report Limit (150 Exports/mo)",
      "Priority High-Speed Server & Email Support",
    ],
    excluded: [
      "Visual Analytics Dashboard",
      "Market Directory Search & Leads",
    ],
  },
  {
    id: "PREMIUM",
    name: "Premium",
    badge: "Power Trader",
    monthlyPrice: 399,
    yearlyPrice: 3990,
    subtitle: "Full power with Market Directory discovery & deep visual analytics.",
    features: [
      "Everything in Growth",
      "Full Visual Analytics & Turnover Trends",
      "Market Directory (Buyer & Seller Leads)",
      "Filter Parties by Quality & Contact No.",
      "Direct WhatsApp Lead Connect Button",
      "Unlimited PDF & Excel Exports",
      "Priority WhatsApp & Phone Support",
    ],
    excluded: [],
  },
];

const TIER_RANKS = {
  TRIAL: 0,
  STARTER: 1,
  GROWTH: 2,
  PREMIUM: 3,
};

function SubscriptionPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);
  const [orderPreview, setOrderPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [serverSubscription, setServerSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  async function loadData() {
    try {
      setLoadingData(true);
      const [statusRes, invoicesRes] = await Promise.all([
        getSubscriptionStatus().catch(() => null),
        getSubscriptionInvoices().catch(() => ({ invoices: [] })),
      ]);

      if (statusRes) {
        setServerSubscription(statusRes);
        if (statusRes.billingCycle) {
          setBillingCycle(statusRes.billingCycle.toLowerCase());
        }
      }
      if (invoicesRes?.invoices) {
        setInvoices(invoicesRes.invoices);
      }
    } catch (_err) {
      // Graceful fallback
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Compute subscription state from server or user profile
  const subscriptionState = useMemo(() => {
    const rawPlan = serverSubscription?.plan || user?.subscriptionPlan || "TRIAL";
    const status = serverSubscription?.status || user?.subscriptionStatus || "ACTIVE";
    const cycle = serverSubscription?.billingCycle || user?.billingCycle || "MONTHLY";

    const isComplimentary =
      rawPlan === "COMPLIMENTARY" ||
      serverSubscription?.isComplimentary ||
      user?.isComplimentary ||
      (rawPlan === "PREMIUM" && cycle === "LIFETIME");

    if (isComplimentary) {
      return {
        plan: "VIP COMPLIMENTARY",
        status: "ACTIVE",
        cycle: "LIFETIME",
        daysRemaining: 99999,
        expiryDateStr: "Lifetime Free Access (No Expiry)",
        isTrial: false,
        isLifetime: true,
        isComplimentary: true,
      };
    }

    let daysRemaining = serverSubscription?.daysRemaining ?? 14;
    let expiryDateStr = "14 days from now";

    const targetDateStr = serverSubscription?.expiresAt || user?.planExpiresAt || user?.trialEndsAt;

    let isLifetime = false;

    if (targetDateStr) {
      const targetDate = new Date(targetDateStr);
      const diffMs = targetDate.getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      isLifetime = daysRemaining > 3650;
      expiryDateStr = isLifetime
        ? "Lifetime Access (No Expiry)"
        : targetDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
    } else {
      const defaultTrialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      daysRemaining = 14;
      expiryDateStr = defaultTrialEnd.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }

    return {
      plan: rawPlan,
      status,
      cycle,
      daysRemaining,
      expiryDateStr,
      isTrial: rawPlan === "TRIAL",
      isLifetime,
      isComplimentary: false,
    };
  }, [serverSubscription, user]);

  const isYearly = billingCycle === "yearly";

  function handleOpenCheckout(plan) {
    setSelectedPlanForCheckout(plan);
    setOrderPreview(null);
    setLoadingPreview(true);

    previewSubscriptionOrder({
      plan: plan.id,
      billingCycle: billingCycle.toUpperCase(),
    })
      .then((res) => setOrderPreview(res))
      .catch(() => setOrderPreview(null))
      .finally(() => setLoadingPreview(false));
  }

  function handleCloseCheckout() {
    if (isCheckingOut || isVerifying) return;
    setSelectedPlanForCheckout(null);
    setOrderPreview(null);
  }

  async function handleProceedToRazorpay() {
    if (!selectedPlanForCheckout) return;

    try {
      setIsCheckingOut(true);

      // 1. Create order on server
      const orderPayload = {
        plan: selectedPlanForCheckout.id,
        billingCycle: billingCycle.toUpperCase(),
      };

      const orderData = await createSubscriptionOrder(orderPayload);

      if (!orderData?.razorpayKeyId) {
        toast.info(
          "Razorpay test keys are not configured yet in the server .env. Please provide RAZORPAY_KEY_ID to process live/test gateway orders."
        );
        setIsCheckingOut(false);
        return;
      }

      // 2. Load Razorpay script
      const sdkReady = await loadRazorpaySDK();
      if (!sdkReady) {
        toast.error("Failed to load Razorpay checkout SDK. Please check your internet connection.");
        setIsCheckingOut(false);
        return;
      }

      // 3. Open Razorpay Standard Checkout Modal
      const options = {
        key: orderData.razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Sauda Book",
        description: `${selectedPlanForCheckout.name} Plan (${billingCycle})`,
        image: "/logo.png",
        order_id: orderData.orderId,
        prefill: {
          name: orderData.user?.name || user?.name || "Sauda Broker",
          email: orderData.user?.email || user?.email || "broker@saudabook.co.in",
          contact: orderData.user?.contact || user?.contactPhone || "9999999999",
        },
        notes: {
          plan: selectedPlanForCheckout.id,
          billingCycle: billingCycle.toUpperCase(),
        },
        theme: {
          color: "#0d9488",
        },
        modal: {
          ondismiss: function () {
            setIsCheckingOut(false);
          },
        },
        handler: async function (response) {
          try {
            setIsVerifying(true);
            const verifyResult = await verifySubscriptionPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyResult?.user) {
              dispatch(setUserProfile(verifyResult.user));
            }

            toast.success(verifyResult?.message || "Plan upgraded successfully!");
            setSelectedPlanForCheckout(null);
            await loadData();
          } catch (verifyErr) {
            toast.error(
              verifyErr.response?.data?.message || "Payment verification failed. Please contact support."
            );
          } finally {
            setIsVerifying(false);
            setIsCheckingOut(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (failResponse) {
        toast.error(failResponse.error?.description || "Payment failed or cancelled by user.");
        setIsCheckingOut(false);
      });

      rzp.open();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to initiate checkout. Please try again."
      );
      setIsCheckingOut(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
              Subscription & Plans
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                subscriptionState.isTrial
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  : subscriptionState.isLifetime
                    ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-bold"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              }`}
            >
              {subscriptionState.isTrial
                ? `14-Day Free Trial (${subscriptionState.daysRemaining} days left)`
                : subscriptionState.isLifetime
                  ? `${subscriptionState.plan} (Lifetime Free Access)`
                  : `${subscriptionState.plan} (${subscriptionState.status})`}
            </span>
          </div>
          <p className="text-xs sm:text-sm muted-text mt-1">
            Manage your active plan, upgrade features, or switch between monthly and annual billing.
          </p>
        </div>

        <Link
          to="/support"
          className="ghost-btn text-xs py-2 px-3.5 flex items-center justify-center gap-1.5 self-start sm:self-auto"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2 2-2 3.5" />
            <circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none" />
          </svg>
          <span>Need Help?</span>
        </Link>
      </div>

      {/* Active Subscription Summary Card */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-text">
                Current Plan
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="flex items-baseline gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-text">
                {subscriptionState.isTrial ? "14-Day Free Trial" : subscriptionState.plan}
              </h2>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {subscriptionState.isComplimentary
                  ? "100% Free VIP"
                  : subscriptionState.isLifetime
                  ? "Lifetime"
                  : "Active"}
              </span>
            </div>

            <p className="text-xs text-muted-text">
              {subscriptionState.isTrial
                ? `Full access to all features until ${subscriptionState.expiryDateStr}. Upgrade below to continue uninterrupted.`
                : subscriptionState.isComplimentary
                ? "Your account has full access to all features free of charge (Admin Approved). No payment or renewal is needed."
                : subscriptionState.isLifetime
                ? "Complimentary lifetime access active with full access to all features. No renewal required."
                : `Active subscription valid until ${subscriptionState.expiryDateStr}.`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-bg/60 p-4 rounded-xl border border-border">
            <div className="text-left sm:text-right">
              <div className="text-xs text-muted-text">
                {subscriptionState.isLifetime ? "Access Duration" : "Remaining Validity"}
              </div>
              <div className="text-lg font-bold text-accent">
                {subscriptionState.isComplimentary
                  ? "100% Free Access"
                  : subscriptionState.isLifetime
                  ? "Lifetime Access"
                  : `${subscriptionState.daysRemaining} Days Left`}
              </div>
              <div className="text-[11px] text-muted-text">
                {subscriptionState.isLifetime ? "No payment required" : `Expires on ${subscriptionState.expiryDateStr}`}
              </div>
            </div>

            <a
              href="#plans-grid"
              className="primary-btn !w-auto text-xs py-2.5 px-4 font-semibold shrink-0 text-center"
            >
              {subscriptionState.isTrial
                ? "Upgrade to Paid Plan"
                : subscriptionState.isComplimentary
                ? "View Included Features"
                : "Change Plan"}
            </a>
          </div>
        </div>

        {/* Annual Savings Promotion Banner */}
        <div className="mt-5 pt-5 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs bg-amber-500/5 dark:bg-amber-500/10 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 p-4 sm:px-6 rounded-b-2xl border-t border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current stroke-2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span>
              <strong>Annual Discount Offer:</strong> Pay for 10 months and get 12 months subscription (Save 17%).
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setBillingCycle("yearly");
              const el = document.getElementById("plans-grid");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-xs font-bold text-amber-600 dark:text-amber-300 hover:underline shrink-0"
          >
            View Yearly Plans &rarr;
          </button>
        </div>
      </div>

      {/* Plan Selection Section */}
      <div id="plans-grid" className="pt-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-text">Choose Your Plan</h2>
            <p className="text-xs text-muted-text mt-0.5">
              Select the best tier for your brokerage volume. Upgrade or renew anytime.
            </p>
          </div>

          {/* Monthly / Yearly Toggle */}
          <div className="inline-flex items-center rounded-xl border border-border bg-surface p-1 shadow-sm self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !isYearly
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted-text hover:text-text"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isYearly
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted-text hover:text-text"
              }`}
            >
              <span>Yearly Billing</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase transition-all ${
                  isYearly
                    ? "bg-amber-300 text-amber-950 shadow-sm"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                }`}
              >
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* 3 Tier Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {PLAN_TIERS.map((tier) => {
            const userRank = TIER_RANKS[subscriptionState.plan] || 0;
            const tierRank = TIER_RANKS[tier.id] || 0;

            const isCurrentTier = subscriptionState.plan === tier.id;
            const isCurrentPlanActive =
              isCurrentTier &&
              subscriptionState.cycle.toLowerCase() === billingCycle.toLowerCase();
            const isSwitchToYearly =
              isCurrentTier && subscriptionState.cycle.toUpperCase() === "MONTHLY" && isYearly;
            const isLowerTier = userRank > tierRank;
            const isHigherTier = tierRank > userRank;

            const price = isYearly ? tier.yearlyPrice : tier.monthlyPrice;
            const monthlyEquivalent = isYearly ? Math.round(tier.yearlyPrice / 12) : tier.monthlyPrice;

            return (
              <div
                key={tier.id}
                className={`rounded-2xl border bg-surface p-6 flex flex-col justify-between transition-all relative ${
                  tier.highlight
                    ? "border-accent shadow-lg ring-1 ring-accent"
                    : isCurrentTier
                    ? "border-emerald-500/50 shadow-md"
                    : isLowerTier
                    ? "border-border/60 opacity-90"
                    : "border-border hover:border-accent/40 shadow-sm"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-accent text-white text-[10px] font-extrabold uppercase tracking-wide shadow-sm">
                    {tier.badge}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-text">{tier.name}</h3>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        isCurrentTier
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold"
                          : isLowerTier
                          ? "bg-surface border-border text-muted-text opacity-75"
                          : "bg-surface border-border text-muted-text"
                      }`}
                    >
                      {isCurrentTier
                        ? "Current Plan"
                        : isLowerTier
                        ? "Included in Tier"
                        : tier.badge}
                    </span>
                  </div>

                  <p className="text-xs text-muted-text mt-2 leading-relaxed">
                    {tier.subtitle}
                  </p>

                  <div className="mt-5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-text">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-muted-text">
                        {isYearly ? "/ year" : "/ month"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-text mt-1">
                      {isYearly
                        ? `₹${monthlyEquivalent}/mo • Save 2 full months (17% off)`
                        : "Billed monthly"}
                    </p>
                  </div>

                  <div className="mt-6 pt-5 border-t border-border space-y-2.5 text-xs">
                    <div className="font-semibold uppercase tracking-wider text-[10px] text-accent">
                      Features Included:
                    </div>
                    {tier.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-text">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4 text-accent shrink-0 stroke-2 fill-none stroke-current mt-0.5"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{feat}</span>
                      </div>
                    ))}

                    {tier.excluded.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-muted-text opacity-50">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4 shrink-0 stroke-2 fill-none stroke-current mt-0.5"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-5 border-t border-border">
                  {subscriptionState.isComplimentary ? (
                    <div className="space-y-1">
                      <button
                        type="button"
                        disabled
                        className="w-full text-center text-xs py-2.5 font-bold rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 cursor-default"
                      >
                        Included in Free VIP Access
                      </button>
                      <p className="text-[11px] text-center text-muted-text">
                        Free of charge &bull; Permanent access
                      </p>
                    </div>
                  ) : isCurrentPlanActive ? (
                    <div className="space-y-1">
                      <button
                        type="button"
                        disabled
                        className="w-full text-center text-xs py-2.5 font-bold rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 cursor-default"
                      >
                        Active Plan
                      </button>
                      <p className="text-[11px] text-center text-muted-text">
                        Valid until {subscriptionState.expiryDateStr}
                      </p>
                    </div>
                  ) : isSwitchToYearly ? (
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => handleOpenCheckout(tier)}
                        className="w-full text-center text-xs py-2.5 font-bold rounded-lg primary-btn shadow-md"
                      >
                        Switch to Yearly (Save 17%)
                      </button>
                      <p className="text-[11px] text-center text-accent font-medium">
                        Get 2 months free + prorated credit
                      </p>
                    </div>
                  ) : isLowerTier ? (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        disabled
                        className="w-full text-center text-xs py-2.5 font-semibold rounded-lg bg-bg border border-border text-muted-text opacity-60 cursor-not-allowed"
                      >
                        Included in Your Plan
                      </button>
                      <p className="text-[10px] text-center text-muted-text leading-tight px-1">
                        All features included in your active {subscriptionState.plan} tier. Switch on renewal after {subscriptionState.expiryDateStr}.
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenCheckout(tier)}
                      className={`w-full text-center text-xs py-2.5 font-bold rounded-lg transition-all ${
                        tier.highlight
                          ? "primary-btn shadow-md"
                          : "ghost-btn hover:border-accent"
                      }`}
                    >
                      Upgrade to {tier.name}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Comparison Matrix Accordion */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-text">
            Side-by-Side Feature Comparison
          </h2>
          <p className="text-xs text-muted-text mt-0.5">
            Compare limits and feature access across Starter, Growth, and Premium tiers.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-bg/50 text-muted-text font-semibold">
                <th className="p-3 sm:px-4">Core Feature</th>
                <th className="p-3 text-center">Starter (₹99)</th>
                <th className="p-3 text-center text-accent font-bold bg-accent/5">
                  Growth (₹299)
                </th>
                <th className="p-3 text-center">Premium (₹399)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-3 sm:px-4 font-medium">Sauda Booking & Ledger</td>
                <td className="p-3 text-center">Unlimited</td>
                <td className="p-3 text-center bg-accent/5 font-medium">Unlimited</td>
                <td className="p-3 text-center font-medium">Unlimited</td>
              </tr>
              <tr>
                <td className="p-3 sm:px-4 font-medium">Lot Carry-Forward & Dispatch</td>
                <td className="p-3 text-center">Included</td>
                <td className="p-3 text-center bg-accent/5 font-medium">Included</td>
                <td className="p-3 text-center font-medium">Included</td>
              </tr>
              <tr>
                <td className="p-3 sm:px-4 font-medium">Direct WhatsApp Sauda Slips</td>
                <td className="p-3 text-center">Included</td>
                <td className="p-3 text-center bg-accent/5 font-medium">Included</td>
                <td className="p-3 text-center font-medium">Included</td>
              </tr>
              <tr>
                <td className="p-3 sm:px-4 font-medium">Ad-Free Experience</td>
                <td className="p-3 text-center text-muted-text">Standard Ads</td>
                <td className="p-3 text-center bg-accent/5 font-bold text-accent">
                  100% Ad-Free
                </td>
                <td className="p-3 text-center font-bold text-accent">100% Ad-Free</td>
              </tr>
              <tr>
                <td className="p-3 sm:px-4 font-medium">Report Formats</td>
                <td className="p-3 text-center">Excel Only</td>
                <td className="p-3 text-center bg-accent/5 font-medium">Excel + PDF</td>
                <td className="p-3 text-center font-medium">Excel + PDF</td>
              </tr>
              <tr>
                <td className="p-3 sm:px-4 font-medium">Monthly Report Exports</td>
                <td className="p-3 text-center">30 / month</td>
                <td className="p-3 text-center bg-accent/5 font-medium">150 / month</td>
                <td className="p-3 text-center font-bold text-accent">Unlimited</td>
              </tr>
              <tr>
                <td className="p-3 sm:px-4 font-medium">Visual Analytics Trends</td>
                <td className="p-3 text-center text-muted-text opacity-40">&mdash;</td>
                <td className="p-3 text-center bg-accent/5 text-muted-text opacity-40">&mdash;</td>
                <td className="p-3 text-center font-bold text-accent">Full Access</td>
              </tr>
              <tr>
                <td className="p-3 sm:px-4 font-medium">Market Directory Buyer/Seller Leads</td>
                <td className="p-3 text-center text-muted-text opacity-40">&mdash;</td>
                <td className="p-3 text-center bg-accent/5 text-muted-text opacity-40">&mdash;</td>
                <td className="p-3 text-center font-bold text-accent">Full Access</td>
              </tr>
              <tr>
                <td className="p-3 sm:px-4 font-medium">Support SLA</td>
                <td className="p-3 text-center">Email Support</td>
                <td className="p-3 text-center bg-accent/5">Priority Email</td>
                <td className="p-3 text-center font-bold">Priority WhatsApp & Phone</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoices & Payment History Section */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-text">Billing & Invoices</h2>
            <p className="text-xs text-muted-text mt-0.5">
              View your past payment receipts and tax invoices.
            </p>
          </div>
          <span className="text-xs text-muted-text bg-bg px-2.5 py-1 rounded-lg border border-border">
            GST Invoices Ready
          </span>
        </div>

        {invoices.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-bg/50 text-muted-text font-semibold">
                  <th className="p-3">Invoice No</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Billing Cycle</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="p-3 font-mono font-semibold text-text">
                      {inv.invoiceNumber || inv.orderId}
                    </td>
                    <td className="p-3 font-medium">{inv.plan}</td>
                    <td className="p-3 capitalize">{inv.billingCycle.toLowerCase()}</td>
                    <td className="p-3 font-bold text-text">₹{inv.amount}</td>
                    <td className="p-3 text-muted-text">
                      {inv.paidAt
                        ? new Date(inv.paidAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : new Date(inv.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-bg/40 p-6 text-center text-xs text-muted-text">
            <svg
              viewBox="0 0 24 24"
              className="h-8 w-8 mx-auto mb-2 text-muted-text/60 fill-none stroke-current stroke-2"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
            <p className="font-semibold text-text">No Payment Records Yet</p>
            <p className="mt-1">
              You are currently on the complimentary 14-day free trial. Payment receipts will appear here once you upgrade.
            </p>
          </div>
        )}
      </div>

      {/* Upgrade / Checkout Confirmation Modal */}
      {selectedPlanForCheckout && (
        <Modal
          title={`Upgrade to ${selectedPlanForCheckout.name}`}
          onClose={handleCloseCheckout}
          footer={
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                disabled={isCheckingOut || isVerifying}
                className="ghost-btn text-xs py-2 px-4 font-semibold"
                onClick={handleCloseCheckout}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCheckingOut || isVerifying || loadingPreview}
                className="primary-btn !w-auto text-xs py-2 px-5 font-bold shadow-sm inline-flex items-center justify-center gap-2 hover:opacity-95"
                onClick={handleProceedToRazorpay}
              >
                {isVerifying ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Activating Plan...</span>
                  </>
                ) : isCheckingOut ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Opening Razorpay...</span>
                  </>
                ) : (
                  <span>
                    Proceed to Pay ₹
                    {orderPreview?.finalPrice != null
                      ? orderPreview.finalPrice.toLocaleString("en-IN")
                      : isYearly
                      ? selectedPlanForCheckout.yearlyPrice.toLocaleString("en-IN")
                      : selectedPlanForCheckout.monthlyPrice.toLocaleString("en-IN")}
                  </span>
                )}
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-border bg-bg p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-text">Selected Tier:</span>
                <span className="font-bold text-text">{selectedPlanForCheckout.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-text">Billing Cycle:</span>
                <span className="font-semibold text-text capitalize">
                  {billingCycle} ({isYearly ? "12 Months (2 Mo Free)" : "30 Days"})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-text">Standard Plan Price:</span>
                <span className="font-medium text-text">
                  ₹
                  {orderPreview?.basePrice != null
                    ? orderPreview.basePrice.toLocaleString("en-IN")
                    : isYearly
                    ? selectedPlanForCheckout.yearlyPrice.toLocaleString("en-IN")
                    : selectedPlanForCheckout.monthlyPrice.toLocaleString("en-IN")}
                </span>
              </div>

              {orderPreview?.unusedCredit > 0 && (
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                  <span>
                    Unused Credit ({orderPreview.remainingDays} days on {orderPreview.previousPlan}):
                  </span>
                  <span>-₹{orderPreview.unusedCredit}</span>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="text-muted-text font-semibold">Total Payable Today:</span>
                <div className="text-right">
                  <span className="text-base font-extrabold text-accent">
                    ₹
                    {orderPreview?.finalPrice != null
                      ? orderPreview.finalPrice.toLocaleString("en-IN")
                      : isYearly
                      ? selectedPlanForCheckout.yearlyPrice.toLocaleString("en-IN")
                      : selectedPlanForCheckout.monthlyPrice.toLocaleString("en-IN")}
                  </span>
                  {orderPreview?.unusedCredit > 0 && (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Instant discount of ₹{orderPreview.unusedCredit} applied
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-muted-text space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent/10 text-accent border border-accent/20 uppercase tracking-wide">
                  Prepaid Recharge
                </span>
                <span className="text-xs font-semibold text-text">Zero Auto-Debit / No Mandate</span>
              </div>
              <p>
                Clicking <strong>Proceed to Pay</strong> opens the secure Razorpay payment window supporting UPI QR (Google Pay, PhonePe, Paytm), Net Banking, and Cards.
              </p>
              <p className="text-[11px] text-muted-text/80">
                {orderPreview?.isUpgrade
                  ? `Your plan will upgrade to ${selectedPlanForCheckout.name} immediately, and your validity will be renewed for a fresh ${isYearly ? "365 days" : "30 days"} from today.`
                  : "Validity will be extended immediately upon payment approval."}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default SubscriptionPage;
