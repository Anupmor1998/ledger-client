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
        if (getPendingVoucher()) return;
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

