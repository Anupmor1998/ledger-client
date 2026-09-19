import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import DashboardLayout from "../components/DashboardLayout";
import AdminPage from "../pages/AdminPage";
import CustomersPage from "../pages/CustomersPage";
import DashboardOverviewPage from "../pages/DashboardOverviewPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import ManufacturersPage from "../pages/ManufacturersPage";
import OrderActivityPage from "../pages/OrderActivityPage";
import OrderProgressPage from "../pages/OrderProgressPage";
import OrdersPage from "../pages/OrdersPage";
import PaymentsPage from "../pages/PaymentsPage";
import ProfilePage from "../pages/ProfilePage";
import QualityPage from "../pages/QualityPage";
import ReportsPage from "../pages/ReportsPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import SignupPage from "../pages/SignupPage";
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
          <Route path="customers" element={<CustomersPage />} />
          <Route path="manufacturers" element={<ManufacturersPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="order-activity" element={<OrderActivityPage />} />
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
          <Route path="quality" element={<QualityPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
