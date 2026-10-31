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

  // Check if user has both email and phone verified
  const isEmailVerified = Boolean(user?.isEmailVerified);
  const isPhoneVerified = Boolean(user?.isPhoneVerified);
  const isBothVerified = isEmailVerified && isPhoneVerified;
  const hasFirmName = Boolean(user?.firmName && user?.firmName.trim());

  // Check if user is a newly registered user who hasn't completed onboarding
  // We can track if they need onboarding: if both aren't verified or firmName isn't set
  // To protect newly signed-up users while allowing existing users who were already using the app:
  // If the user arrived from signup or is unverified, redirect to /onboarding
  const needsOnboarding = !isBothVerified || !hasFirmName;

  // If user explicitly is on /onboarding route, allow it
  if (location.pathname === "/onboarding") {
    // If they already completed onboarding, redirect to root
    if (isBothVerified && hasFirmName) {
      return <Navigate to="/" replace />;
    }
    return <Outlet />;
  }

  // If user hasn't verified both email and phone, force them to onboarding
  if (!isBothVerified) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
