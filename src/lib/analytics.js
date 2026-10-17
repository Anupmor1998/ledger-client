import posthog from "posthog-js";

const POSTHOG_KEY = process.env.POSTHOG_KEY || "";
const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://us.i.posthog.com";

let isInitialized = false;

/**
 * Initializes PostHog analytics once per browser session.
 */
export function initAnalytics() {
  if (isInitialized || !POSTHOG_KEY || typeof window === "undefined") {
    return;
  }

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: "identified_only",
      capture_pageview: false, // Explicitly captured on route change
      capture_pageleave: true,
      autocapture: true,
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: ".ph-no-capture, [data-private]",
      },
      loaded: (ph) => {
        if (process.env.APP_ENV === "development") {
          // Enable debug logs in development if needed
          // ph.debug();
        }
      },
    });

    isInitialized = true;
  } catch (err) {
    console.warn("Failed to initialize PostHog analytics:", err);
  }
}

/**
 * Associates subsequent events and session replays with the logged-in user.
 */
export function identifyUser(user) {
  if (!isInitialized || !user?.id) {
    return;
  }

  try {
    posthog.identify(String(user.id), {
      email: user.email || undefined,
      name: user.name || undefined,
      firmName: user.firmName || undefined,
      role: user.role || undefined,
      phone: user.phone || undefined,
    });
  } catch (_e) {
    // Ignore analytics errors
  }
}

/**
 * Resets the identified user on logout.
 */
export function resetUser() {
  if (!isInitialized) {
    return;
  }

  try {
    posthog.reset();
  } catch (_e) {
    // Ignore analytics errors
  }
}

/**
 * Explicitly records a pageview when route changes.
 */
export function trackPageView(pathname, extra = {}) {
  if (!isInitialized) {
    return;
  }

  try {
    posthog.capture("$pageview", {
      $current_url: window.location.href,
      path: pathname,
      ...extra,
    });
  } catch (_e) {
    // Ignore analytics errors
  }
}

/**
 * Tracks a custom business event.
 */
export function trackEvent(eventName, properties = {}) {
  if (!isInitialized) {
    return;
  }

  try {
    posthog.capture(eventName, properties);
  } catch (_e) {
    // Ignore analytics errors
  }
}

export default posthog;

