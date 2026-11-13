import { useCallback, useEffect, useRef } from "react";
import { hasSeenTour, startTour } from "../lib/tourService";
import { getPendingVoucher } from "../lib/voucherHelper";

export default function usePageTour(tourKey, options = {}) {
  const { delay = 750, autoStart = true } = options;
  const timerRef = useRef(null);

  useEffect(() => {
    if (!tourKey || !autoStart) return;

    // Do not auto-start tour if user is claiming a voucher
    if (getPendingVoucher()) return;

    if (!hasSeenTour(tourKey)) {
      timerRef.current = setTimeout(() => {
        // Suppress tour if a voucher is pending or if any modal dialog is currently open
        if (
          getPendingVoucher() ||
          typeof document === "undefined" ||
          document.querySelector('[role="dialog"]')
        ) {
          return;
        }
        startTour(tourKey, { force: false });
      }, delay);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [tourKey, autoStart, delay]);

  const triggerTour = useCallback(() => {
    if (!tourKey) return;
    startTour(tourKey, { force: true });
  }, [tourKey]);

  return {
    startTour: triggerTour,
  };
}

