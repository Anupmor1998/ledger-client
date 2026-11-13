import { useEffect } from "react";
import { ToastContainer } from "react-toastify";
import AnalyticsTracker from "./components/AnalyticsTracker";
import GlobalLoader from "./components/GlobalLoader";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import PushNotificationManager from "./components/PushNotificationManager";
import { identifyUser, initAnalytics, resetUser } from "./lib/analytics";
import { decodeVoucherToken, setPendingVoucher } from "./lib/voucherHelper";
import AppRoutes from "./routes/AppRoutes";
import { useAppSelector } from "./store/hooks";

function App({ dark, onToggleTheme }) {
  const isGlobalLoading = useAppSelector(
    (state) => state.ui.pendingRequests > 0,
  );
  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    initAnalytics();
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        let encodedV = params.get("v");
        let rawVoucher = params.get("voucher") || params.get("coupon");

        // Check if voucher is embedded inside a redirectTo query param
        const redirectTo = params.get("redirectTo");
        if (redirectTo && (!rawVoucher && !encodedV)) {
          const qIdx = redirectTo.indexOf("?");
          if (qIdx !== -1) {
            const innerParams = new URLSearchParams(redirectTo.slice(qIdx));
            encodedV = innerParams.get("v");
            rawVoucher = innerParams.get("voucher") || innerParams.get("coupon");
          }
        }

        let code = "";
        if (encodedV) {
          code = decodeVoucherToken(encodedV);
        } else if (rawVoucher) {
          code = decodeVoucherToken(rawVoucher);
        }

        if (code && code.trim()) {
          setPendingVoucher(code.trim());

          // Clean up the URL immediately so the voucher code is never exposed in the browser address bar
          params.delete("v");
          params.delete("voucher");
          params.delete("coupon");
          const remainingSearch = params.toString() ? `?${params.toString()}` : "";

          // If user landed on /subscription with a voucher, route to "/" (Home dashboard)
          let targetPath = window.location.pathname;
          if (targetPath.startsWith("/subscription") || targetPath.startsWith("/pricing")) {
            targetPath = "/";
          }

          const cleanUrl = `${targetPath}${remainingSearch}${window.location.hash}`;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      identifyUser(user);
    } else {
      resetUser();
    }
  }, [user?.id]);

  return (
    <>
      <AnalyticsTracker />
      <GlobalLoader active={isGlobalLoading} />
      <PWAInstallPrompt />
      <PushNotificationManager />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme={dark ? "dark" : "light"}
      />
      <AppRoutes dark={dark} onToggleTheme={onToggleTheme} />
    </>
  );
}

export default App;
