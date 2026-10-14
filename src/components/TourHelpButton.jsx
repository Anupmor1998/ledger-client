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
      className={`inline-flex h-9 sm:h-10 items-center justify-center rounded-lg border border-border bg-surface px-2.5 sm:px-3 text-xs font-semibold text-muted-text hover:text-accent hover:border-accent hover:bg-bg transition-colors shadow-sm ${className}`}
      title="Take a guided tour of this page"
    >
      Tour
    </button>
  );
}

