import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { getMyPreferences, getMyProfile, getUsers, updateMyPreferences } from "./lib/api";
import { setupAxiosInterceptors } from "./lib/axiosClient";
import { setSession, setUserProfile, setUserTheme } from "./store/slices/authSlice";
import store from "./store";
import "./index.css";
import "react-toastify/dist/ReactToastify.css";
import "./styles/driver-theme.css";

// Clean up any legacy conflicting standalone service worker registrations
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      for (const reg of registrations) {
        if (reg.active?.scriptURL?.includes("firebase-messaging-sw.js")) {
          reg.unregister().catch(() => {});
        }
      }
    })
    .catch(() => {});
}

// Anti-reload loop circuit breaker: prevents runaway reload loops
const RELOAD_DETECTOR_KEY = "sauda_reload_loop_tracker";
if (typeof window !== "undefined") {
  try {
    const now = Date.now();
    const data = JSON.parse(sessionStorage.getItem(RELOAD_DETECTOR_KEY) || "{}");
    if (data.timestamp && now - data.timestamp < 3000) {
      data.count = (data.count || 0) + 1;
      if (data.count > 2) {
        console.warn("[SW] Rapid reload loop detected. Circuit breaker triggered.");
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistrations().then((regs) => {
            regs.forEach((r) => r.unregister());
          });
        }
        sessionStorage.removeItem(RELOAD_DETECTOR_KEY);
      } else {
        data.timestamp = now;
        sessionStorage.setItem(RELOAD_DETECTOR_KEY, JSON.stringify(data));
      }
    } else {
      sessionStorage.setItem(RELOAD_DETECTOR_KEY, JSON.stringify({ timestamp: now, count: 1 }));
    }
  } catch {
    // Ignore storage issues
  }
}

setupAxiosInterceptors(store);
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info("[PWA] Service worker update available.");
  },
  onOfflineReady() {
    console.info("[PWA] Application ready for offline use.");
  },
});

const THEME_STORAGE_KEY = "ledger_theme";

function getBrowserPreferredTheme() {
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function getInitialTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  const userTheme = store.getState().auth.user?.theme;
  if (userTheme === "dark" || userTheme === "light") {
    return userTheme;
  }

  return getBrowserPreferredTheme();
}

const bootTheme = getInitialTheme();
document.documentElement.classList.toggle("dark", bootTheme === "dark");

function Root() {
  const [dark, setDark] = useState(bootTheme === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    let cancelled = false;

    async function syncSessionFromBackend() {
      const token = store.getState().auth.token;
      if (!token) {
        return;
      }

      try {
        const profile = await getMyProfile();
        if (cancelled) {
          return;
        }

        if (profile) {
          store.dispatch(setUserProfile(profile));
        }
      } catch (_error) {
        // Keep the cached session if the refresh fails.
      }
    }

    async function syncThemeFromBackend() {
      const token = store.getState().auth.token;
      if (!token) {
        return;
      }

      try {
        const preference = await getMyPreferences();
        if (cancelled) {
          return;
        }

        const theme = preference?.theme === "dark" ? "dark" : "light";
        setDark(theme === "dark");
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        store.dispatch(
          setUserProfile({
            theme,
            selectedFinancialYearStart: preference?.selectedFinancialYearStart,
          })
        );
      } catch (_error) {
        // Ignore theme sync failures and keep local fallback.
      }
    }

    syncSessionFromBackend();
    syncThemeFromBackend();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggleTheme() {
    const nextDark = !dark;
    const theme = nextDark ? "dark" : "light";

    setDark(nextDark);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    store.dispatch(setUserTheme(theme));

    const token = store.getState().auth.token;
    if (!token) {
      return;
    }

    try {
      await updateMyPreferences({ theme });
    } catch (_error) {
      // Ignore backend sync failures and keep local selection.
    }
  }

  return (
    <BrowserRouter>
      <Provider store={store}>
        <App dark={dark} onToggleTheme={handleToggleTheme} />
      </Provider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
