import { useEffect } from "react";
import { ToastContainer } from "react-toastify";
import AnalyticsTracker from "./components/AnalyticsTracker";
import GlobalLoader from "./components/GlobalLoader";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import PushNotificationManager from "./components/PushNotificationManager";
import { identifyUser, initAnalytics, resetUser } from "./lib/analytics";
import AppRoutes from "./routes/AppRoutes";
import { useAppSelector } from "./store/hooks";

function App({ dark, onToggleTheme }) {
  const isGlobalLoading = useAppSelector(
    (state) => state.ui.pendingRequests > 0,
  );
  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    initAnalytics();
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
