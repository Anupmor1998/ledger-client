import { Link } from "react-router-dom";

function FeatureGateCard({
  featureKey = "ANALYTICS",
  title = "Unlock Visual Analytics",
  subtitle = "Gain deep insights into your brokerage turnover, party trends, and quality velocity.",
  requiredTier = "Premium",
  currentPlan = "Starter",
  bulletPoints = [
    "Full turnover charts and visual trade analytics",
    "Customer and manufacturer volume rankings",
    "Monthly & quarterly comparison metrics",
    "Priority fast-server processing",
  ],
}) {
  return (
    <div className="mx-auto max-w-4xl py-6 sm:py-10">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-10 shadow-lg">
        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3.5 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Exclusive to {requiredTier} Plan</span>
          </div>

          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent shadow-sm">
            <svg viewBox="0 0 24 24" className="h-8 w-8 fill-none stroke-current stroke-2">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M7 17V13" />
              <path d="M12 17V9" />
              <path d="M17 17V5" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2.5 max-w-xl text-sm text-muted-text sm:text-base">
            {subtitle}
          </p>

          <div className="my-8 w-full max-w-lg rounded-xl border border-border bg-bg/60 p-4 text-left sm:p-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-text">
              What you get with {requiredTier}:
            </p>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              {bulletPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-2.5">
                  <svg
                    viewBox="0 0 24 24"
                    className="mt-0.5 h-4 w-4 shrink-0 text-accent stroke-2 fill-none stroke-current"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-text font-medium">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              to="/subscription#plans-grid"
              onClick={() => {
                const el = document.getElementById("plans-grid");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="primary-btn !w-auto px-6 py-2.5 text-sm font-semibold shadow-md flex items-center justify-center gap-2"
            >
              <span>Upgrade to {requiredTier}</span>
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>


          </div>

          <p className="mt-4 text-[11px] text-muted-text">
            Your current plan: <span className="font-semibold text-text uppercase">{currentPlan}</span> &bull; Upgrade or cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

export default FeatureGateCard;

