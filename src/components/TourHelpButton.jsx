import { useLocation } from "react-router-dom";
import { startTour } from "../lib/tourService";

const PATH_TO_TOUR_KEY = {
  "/": "home",
  "/dashboard": "dashboard",
  "/orders": "orders",
  "/order-progress": "orderProgress",
  "/payments": "payments",
  "/reports": "reports",
  "/masters": "masters",
  "/market-directory": "marketDirectory",
};

export default function TourHelpButton({ tourKey, className = "" }) {
  const location = useLocation();
  const effectiveTourKey = tourKey || PATH_TO_TOUR_KEY[location.pathname];

  if (!effectiveTourKey) return null;

  return (
    <button
      type="button"
      onClick={() => startTour(effectiveTourKey, { force: true })}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-accent hover:border-accent hover:bg-bg transition-all shadow-sm ${className}`}
      title="Take a guided tour of this page"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 fill-none stroke-current stroke-2 text-accent"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span className="hidden sm:inline">Tour</span>
    </button>
  );
}

