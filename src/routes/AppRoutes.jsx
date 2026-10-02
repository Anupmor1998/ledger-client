import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import DashboardLayout from "../components/DashboardLayout";
import AdminPage from "../pages/AdminPage";
import AdminSupportTicketsPage from "../pages/AdminSupportTicketsPage";
import DashboardOverviewPage from "../pages/DashboardOverviewPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import MastersPage from "../pages/MastersPage";
import OrderProgressPage from "../pages/OrderProgressPage";
import OrdersPage from "../pages/OrdersPage";
import PaymentsPage from "../pages/PaymentsPage";
import ProfilePage from "../pages/ProfilePage";
import ReportsPage from "../pages/ReportsPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import SignupPage from "../pages/SignupPage";
import SupportPage from "../pages/SupportPage";
import { useAppSelector } from "../store/hooks";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";

function AppRoutes({ dark, onToggleTheme }) {
  const isAdmin = useAppSelector((state) => state.auth.user?.role === "ADMIN");

  if (isAdmin) {
    return (
      <Routes>
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
          <Route path="profile" element={<ProfilePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="support" element={<SupportPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
