import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent, trackPageView } from "../lib/analytics";

export function getModuleFromPath(pathname) {
  if (!pathname || pathname === "/") return "Home Dashboard";
  if (pathname.startsWith("/orders")) return "Orders";
  if (pathname.startsWith("/order-progress")) return "Order Progress";
  if (pathname.startsWith("/payments")) return "Payments";
  if (pathname.startsWith("/dashboard")) return "Analytics";
  if (pathname.startsWith("/reports")) return "Reports";
  if (pathname.startsWith("/masters")) return "Masters & Parties";
  if (pathname.startsWith("/market-directory")) return "Market Directory";
  if (pathname.startsWith("/subscription")) return "Subscription";
  if (pathname.startsWith("/pricing")) return "Pricing";
  if (pathname.startsWith("/profile")) return "Profile";
  if (pathname.startsWith("/support")) return "Support";
  if (pathname.startsWith("/admin")) return "Admin";
  return "Other";
}

export default function AnalyticsTracker() {
  const location = useLocation();
  const lastModuleRef = useRef(null);

  useEffect(() => {
    const currentModule = getModuleFromPath(location.pathname);

    // Track standard pageview with module metadata
    trackPageView(location.pathname, {
      module: currentModule,
      search: location.search || undefined,
    });

    // If user navigated to a different module, record module_accessed
    if (lastModuleRef.current !== currentModule) {
      lastModuleRef.current = currentModule;
      trackEvent("module_accessed", {
        module: currentModule,
        path: location.pathname,
      });
    }
  }, [location.pathname, location.search]);

  return null;
}
