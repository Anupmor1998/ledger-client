import { ToastContainer } from "react-toastify";
import GlobalLoader from "./components/GlobalLoader";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import AppRoutes from "./routes/AppRoutes";
import { useAppSelector } from "./store/hooks";

function App({ dark, onToggleTheme }) {
  const isGlobalLoading = useAppSelector(
    (state) => state.ui.pendingRequests > 0,
  );

  return (
    <>
      <GlobalLoader active={isGlobalLoading} />
      <PWAInstallPrompt />
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
