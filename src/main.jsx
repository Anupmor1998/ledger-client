import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { getMyPreferences, updateMyPreferences } from "./lib/api";
import { setupAxiosInterceptors } from "./lib/axiosClient";
import { setUserTheme } from "./store/slices/authSlice";
import store from "./store";
import "./index.css";
import "react-toastify/dist/ReactToastify.css";

setupAxiosInterceptors(store);
registerSW({ immediate: true });

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
        store.dispatch(setUserTheme(theme));
      } catch (_error) {
        // Ignore theme sync failures and keep local fallback.
      }
    }

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
