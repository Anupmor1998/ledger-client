import GlobalLoader from "./components/GlobalLoader";
import AppRoutes from "./routes/AppRoutes";
import { useAppSelector } from "./store/hooks";

function App({ dark, onToggleTheme }) {
  const isGlobalLoading = useAppSelector((state) => state.ui.pendingRequests > 0);

  return (
    <>
      <GlobalLoader active={isGlobalLoading} />
      <AppRoutes dark={dark} onToggleTheme={onToggleTheme} />
    </>
  );
}

export default App;
