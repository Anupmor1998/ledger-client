import { useEffect, useRef } from "react";
import { ADSENSE_CONFIG } from "../config/ads";

/**
 * Reusable Google AdSense Banner Component
 * 
 * Safely handles React SPA lifecycle and prevents duplicate push() errors.
 * Displays a clean preview placeholder in development mode.
 */
function AdBanner({
  slot = "",
  format = "auto",
  responsive = true,
  className = "",
  style = {},
  label = "Advertisement",
}) {
  const adRef = useRef(null);
  const isPushed = useRef(false);

  const isPlaceholderClient =
    !ADSENSE_CONFIG.clientId || ADSENSE_CONFIG.clientId.includes("ca-pub-XXXXXXXX");
  const isDev = import.meta.env.DEV || isPlaceholderClient;

  useEffect(() => {
    if (isDev) return;

    // Only push if script is loaded, DOM element exists, and hasn't been initialized yet
    if (typeof window !== "undefined" && adRef.current && !isPushed.current) {
      try {
        const hasLoaded = adRef.current.getAttribute("data-adsbygoogle-status");
        if (!hasLoaded) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          isPushed.current = true;
        }
      } catch (err) {
        // Silently catch adblocker or SPA re-mount errors
        console.debug("AdSense push notification:", err?.message || err);
      }
    }
  }, [isDev]);

  if (!ADSENSE_CONFIG.enabled) {
    return null;
  }

  // Development Preview placeholder (shows what it looks like before real AdSense approval)
  if (isDev) {
    return (
      <div
        className={`my-3 overflow-hidden rounded-xl border border-dashed border-border/80 bg-surface/60 p-3 text-center transition hover:border-accent/40 ${className}`}
        style={style}
      >
        <div className="flex items-center justify-between border-b border-border/40 pb-1.5 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-text">
            {label}
          </span>
          <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">
            Google AdSense
          </span>
        </div>
        <div className="flex min-h-[60px] flex-col items-center justify-center rounded-lg bg-bg/40 py-2 px-3 text-center">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-muted-text/50 mb-1 fill-none stroke-current stroke-2">
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
          </svg>
          <p className="text-xs font-medium text-text">
            {format === "horizontal"
              ? "728 × 90 Responsive Banner"
              : format === "rectangle"
              ? "300 × 250 Box Ad"
              : "Responsive Auto Ad"}
          </p>
          <p className="text-[10px] text-muted-text mt-0.5">
            Configure <code className="text-accent">VITE_ADSENSE_CLIENT_ID</code> in production to display live ads.
          </p>
        </div>
      </div>
    );
  }

  // Live Production Google AdSense
  return (
    <div className={`my-3 overflow-hidden rounded-xl border border-border/40 bg-surface/40 p-2 text-center ${className}`}>
      <span className="block text-[10px] uppercase tracking-wider text-muted-text/70 mb-1">
        {label}
      </span>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block", ...style }}
        data-ad-client={ADSENSE_CONFIG.clientId}
        data-ad-slot={slot || undefined}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}

export default AdBanner;
