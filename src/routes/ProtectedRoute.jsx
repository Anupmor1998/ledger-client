import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

function ProtectedRoute() {
  const location = useLocation();
  const token = useAppSelector((state) => state.auth.token);
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = Boolean(token) && Boolean(user?.id);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Admins bypass normal user onboarding
  if (user?.role === "ADMIN") {
    return <Outlet />;
  }

  // For new signups, onboarding is STRICTLY MANDATORY until both verifications and business setup are complete
  const isNewSignup = user?.id && localStorage.getItem(`sauda_needs_onboarding_${user.id}`) === "true";
  if (isNewSignup) {
    const isBothVerified = Boolean(user?.isEmailVerified) && Boolean(user?.isPhoneVerified);
    const hasFirmName = Boolean(user?.firmName && user?.firmName.trim());

    if (!isBothVerified || !hasFirmName) {
      if (location.pathname !== "/onboarding") {
        return <Navigate to="/onboarding" replace />;
      }
      return <Outlet />;
    } else {
      // Completed! Clean up flag
      localStorage.removeItem(`sauda_needs_onboarding_${user.id}`);
      if (location.pathname === "/onboarding") {
        return <Navigate to="/" replace />;
      }
    }
  }

  // Existing users should not be on /onboarding route; redirect them to dashboard
  if (location.pathname === "/onboarding") {
    return <Navigate to="/" replace />;
  }

  // Allow all existing authenticated users full access without blocking
  return <Outlet />;
}

export default ProtectedRoute;
