import { driver } from "driver.js";
import { PAGE_TOURS, TOUR_STORAGE_PREFIX } from "../config/tours";

let activeDriverInstance = null;

export function hasSeenTour(tourKey) {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(`${TOUR_STORAGE_PREFIX}${tourKey}`) === "true";
  } catch {
    return false;
  }
}

export function markTourAsSeen(tourKey) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${TOUR_STORAGE_PREFIX}${tourKey}`, "true");
  } catch (err) {
    console.warn("Unable to save tour state to localStorage", err);
  }
}

export function resetTourSeen(tourKey) {
  if (typeof window === "undefined") return;
  try {
    if (tourKey) {
      localStorage.removeItem(`${TOUR_STORAGE_PREFIX}${tourKey}`);
    } else {
      Object.keys(PAGE_TOURS).forEach((key) => {
        localStorage.removeItem(`${TOUR_STORAGE_PREFIX}${key}`);
      });
    }
  } catch (err) {
    console.warn("Unable to reset tour state", err);
  }
}

export function startTour(tourKey, options = {}) {
  const { force = false, onComplete } = options;

  if (!force && hasSeenTour(tourKey)) {
    return null;
  }

  const tourConfig = PAGE_TOURS[tourKey];
  if (!tourConfig || !Array.isArray(tourConfig.steps) || tourConfig.steps.length === 0) {
    return null;
  }

  // Verify that the page has mounted at least one tour anchor
  const hasPageMounted = tourConfig.steps.some((step) => {
    if (!step.element) return false;
    const el = document.querySelector(step.element);
    return Boolean(el && el.offsetParent !== null);
  });

  if (!hasPageMounted) {
    // If elements are not yet rendered, don't launch broken tour
    return null;
  }

  // If a tour is already active, destroy it first
  if (activeDriverInstance) {
    try {
      activeDriverInstance.destroy();
    } catch {
      // ignore
    }
    activeDriverInstance = null;
  }

  const driverObj = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    overlayColor: "#000000",
    overlayOpacity: 0.65,
    stagePadding: 8,
    stageRadius: 8,
    waitForElement: 1000,
    skipMissingElement: true,
    nextBtnText: "Next →",
    prevBtnText: "← Back",
    doneBtnText: "Got it! 🎉",
    steps: tourConfig.steps,
    onDestroyed: () => {
      markTourAsSeen(tourKey);
      activeDriverInstance = null;
      if (typeof onComplete === "function") {
        onComplete();
      }
    },
  });

  activeDriverInstance = driverObj;
  driverObj.drive();
  return driverObj;
}

