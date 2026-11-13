import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getPendingVoucher } from "../lib/voucherHelper";
import { useAppSelector } from "../store/hooks";

function ProtectedRoute() {
  const location = useLocation();
  const token = useAppSelector((state) => state.auth.token);
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = Boolean(token) && Boolean(user?.id);

  if (!isAuthenticated) {
    let returnUrl = `${location.pathname}${location.search}${location.hash}`;
    const pendingVoucher = getPendingVoucher();
    if (
      pendingVoucher ||
      returnUrl.includes("voucher") ||
      returnUrl.includes("coupon") ||
      returnUrl.startsWith("/subscription")
    ) {
      returnUrl = "/";
    }

    const redirectParam =
      returnUrl && returnUrl !== "/" && returnUrl !== "/login"
        ? `?redirectTo=${encodeURIComponent(returnUrl)}`
        : "";
    return <Navigate to={`/login${redirectParam}`} replace state={{ from: { pathname: "/" } }} />;
  }

  // Admins bypass normal user onboarding
  if (user?.role === "ADMIN") {
    return <Outlet />;
  }

  // For new signups, onboarding is mandatory for Phone Verification and Business Setup (Email verification is optional & reminded on login)
  const isNewSignup = user?.id && localStorage.getItem(`sauda_needs_onboarding_${user.id}`) === "true";
  if (isNewSignup) {
    const isPhoneVerified = Boolean(user?.isPhoneVerified);
    const hasFirmName = Boolean(user?.firmName && user?.firmName.trim());

    if (!isPhoneVerified || !hasFirmName) {
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
