import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

function SubscriptionReminderBanner() {
  const user = useAppSelector((state) => state.auth.user);
  const [dismissed, setDismissed] = useState(false);

  if (!user || user.role === "ADMIN" || dismissed) {
    return null;
  }

  const isVip =
    user.subscriptionPlan === "COMPLIMENTARY" ||
    (user.subscriptionPlan === "PREMIUM" && user.billingCycle === "LIFETIME") ||
    (user.subscriptionPlan === "PREMIUM" && !user.planExpiresAt);

  if (isVip) {
    return null;
  }

  const now = new Date();
  const currentPlan = String(user.subscriptionPlan || "TRIAL").toUpperCase();
  let daysRemaining = 0;
  let isExpired = false;

  if (currentPlan === "TRIAL") {
    const trialEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
    if (!trialEnd) {
      daysRemaining = 14;
    } else {
      const diff = trialEnd.getTime() - now.getTime();
      daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
      isExpired = daysRemaining <= 0;
    }
  } else if (user.planExpiresAt) {
    const expiry = new Date(user.planExpiresAt);
    const diff = expiry.getTime() - now.getTime();
    daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    isExpired = daysRemaining <= 0;
  }

  // If plenty of days remain (> 5 days) and not expired, don't show the banner
  if (!isExpired && daysRemaining > 5) {
    return null;
  }

  if (isExpired) {
    return (
      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 sm:px-4 sm:py-3 text-red-700 dark:text-red-300 shadow-sm animate-in fade-in">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2.5" />
          </svg>
          <span>
            {currentPlan === "TRIAL" ? "14-Day Free Trial Expired" : "Subscription Expired"}: Upgrade your plan to continue recording new orders and exports.
          </span>
        </div>

        <Link
          to="/subscription#plans-grid"
          onClick={() => {
            const el = document.getElementById("plans-grid");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="shrink-0 rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 text-xs font-bold shadow-sm transition-colors"
        >
          Choose Plan
        </Link>
      </div>
    );
  }

  // Expiring soon (5 or fewer days remaining)
  return (
    <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:px-4 sm:py-3 text-amber-800 dark:text-amber-200 shadow-sm animate-in fade-in">
      <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>
          <strong className="font-bold">
            {currentPlan === "TRIAL" ? "Free Trial" : `${currentPlan} Plan`} Expiring Soon:
          </strong>{" "}
          You have {daysRemaining} day{daysRemaining === 1 ? "" : "s"} remaining. Renew now to prevent interruption.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/subscription#plans-grid"
          onClick={() => {
            const el = document.getElementById("plans-grid");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-sm transition-colors"
        >
          Renew / Upgrade
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 text-lg leading-none px-1.5 py-0.5"
          title="Dismiss"
          aria-label="Dismiss banner"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

export default SubscriptionReminderBanner;

