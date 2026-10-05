import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import DashboardLayout from "../components/DashboardLayout";
import AdminPage from "../pages/AdminPage";
import AdminSupportTicketsPage from "../pages/AdminSupportTicketsPage";
import DashboardOverviewPage from "../pages/DashboardOverviewPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import HomePage from "../pages/HomePage";
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import MarketDirectoryPage from "../pages/MarketDirectoryPage";
import MastersPage from "../pages/MastersPage";
import OrderProgressPage from "../pages/OrderProgressPage";
import OrdersPage from "../pages/OrdersPage";
import PaymentsPage from "../pages/PaymentsPage";
import PricingPage from "../pages/PricingPage";
import PrivacyPolicyPage from "../pages/PrivacyPolicyPage";
import ProfilePage from "../pages/ProfilePage";
import ReportsPage from "../pages/ReportsPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import SignupPage from "../pages/SignupPage";
import SupportPage from "../pages/SupportPage";
import SubscriptionPage from "../pages/SubscriptionPage";
import TermsOfServicePage from "../pages/TermsOfServicePage";
import { useAppSelector } from "../store/hooks";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";

function AppRoutes({ dark, onToggleTheme }) {
  const isAuthenticated = useAppSelector(
    (state) => Boolean(state.auth.token) && Boolean(state.auth.user?.id)
  );
  const isAdmin = useAppSelector((state) => state.auth.user?.role === "ADMIN");

  if (isAdmin) {
    return (
      <Routes>
        <Route
          path="/privacy"
          element={<PrivacyPolicyPage dark={dark} onToggleTheme={onToggleTheme} />}
        />
        <Route
          path="/terms"
          element={<TermsOfServicePage dark={dark} onToggleTheme={onToggleTheme} />}
        />
        <Route
          path="/pricing"
          element={<PricingPage dark={dark} onToggleTheme={onToggleTheme} />}
        />
        <Route element={<PublicRoute />}>
          <Route
            path="/login"
            element={<LoginPage dark={dark} onToggleTheme={onToggleTheme} />}
          />
          <Route
            path="/signup"
            element={<SignupPage dark={dark} onToggleTheme={onToggleTheme} />}
          />
          <Route
            path="/forgot-password"
            element={
              <ForgotPasswordPage dark={dark} onToggleTheme={onToggleTheme} />
            }
          />
          <Route
            path="/reset-password"
            element={
              <ResetPasswordPage dark={dark} onToggleTheme={onToggleTheme} />
            }
          />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route
            path="/admin"
            element={<AdminLayout dark={dark} onToggleTheme={onToggleTheme} />}
          >
            <Route index element={<Navigate to="users" replace />} />
            <Route path="support" element={<AdminSupportTicketsPage />} />
            <Route path=":collectionKey" element={<AdminPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/admin/users" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin/users" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Universal Public Legal Pages (Crucial for Google AdSense Review) */}
      <Route
        path="/privacy"
        element={<PrivacyPolicyPage dark={dark} onToggleTheme={onToggleTheme} />}
      />
      <Route
        path="/terms"
        element={<TermsOfServicePage dark={dark} onToggleTheme={onToggleTheme} />}
      />
      <Route
        path="/pricing"
        element={<PricingPage dark={dark} onToggleTheme={onToggleTheme} />}
      />

      {/* When unauthenticated, root '/' is the Split Landing Page with embedded login */}
      {!isAuthenticated && (
        <Route
          path="/"
          element={<LandingPage dark={dark} onToggleTheme={onToggleTheme} />}
        />
      )}

      <Route element={<PublicRoute />}>
        <Route
          path="/login"
          element={<LoginPage dark={dark} onToggleTheme={onToggleTheme} />}
        />
        <Route
          path="/signup"
          element={<SignupPage dark={dark} onToggleTheme={onToggleTheme} />}
        />
        <Route
          path="/forgot-password"
          element={
            <ForgotPasswordPage dark={dark} onToggleTheme={onToggleTheme} />
          }
        />
        <Route
          path="/reset-password"
          element={
            <ResetPasswordPage dark={dark} onToggleTheme={onToggleTheme} />
          }
        />
      </Route>

      {/* When authenticated, root '/' and app features render inside DashboardLayout */}
      {isAuthenticated && (
        <Route element={<ProtectedRoute />}>
          <Route
            path="/"
            element={
              <DashboardLayout dark={dark} onToggleTheme={onToggleTheme} />
            }
          >
            <Route index element={<HomePage />} />
            <Route path="dashboard" element={<DashboardOverviewPage />} />
            <Route path="masters" element={<MastersPage />} />
            <Route
              path="customers"
              element={<Navigate to="/masters?tab=customers" replace />}
            />
            <Route
              path="manufacturers"
              element={<Navigate to="/masters?tab=manufacturers" replace />}
            />
            <Route
              path="quality"
              element={<Navigate to="/masters?tab=qualities" replace />}
            />
            <Route path="orders" element={<OrdersPage />} />
            <Route
              path="order-activity"
              element={<Navigate to="/orders" replace />}
            />
            <Route path="payments" element={<PaymentsPage />} />
            <Route
              path="pending-payments"
              element={<Navigate to="/payments" replace />}
            />
            <Route
              path="received-payments"
              element={<Navigate to="/payments" replace />}
            />
            <Route path="order-progress" element={<OrderProgressPage />} />
            <Route path="market-directory" element={<MarketDirectoryPage />} />
            <Route
              path="directory"
              element={<Navigate to="/market-directory" replace />}
            />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="support" element={<SupportPage />} />
          </Route>
        </Route>
      )}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
