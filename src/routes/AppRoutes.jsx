import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import CustomersPage from "../pages/CustomersPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import ManufacturersPage from "../pages/ManufacturersPage";
import OrdersPage from "../pages/OrdersPage";
import QualityPage from "../pages/QualityPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import ReportsPage from "../pages/ReportsPage";
import SignupPage from "../pages/SignupPage";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";

function AppRoutes({ dark, onToggleTheme }) {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage dark={dark} onToggleTheme={onToggleTheme} />} />
        <Route path="/signup" element={<SignupPage dark={dark} onToggleTheme={onToggleTheme} />} />
        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage dark={dark} onToggleTheme={onToggleTheme} />}
        />
        <Route
          path="/reset-password"
          element={<ResetPasswordPage dark={dark} onToggleTheme={onToggleTheme} />}
        />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardLayout dark={dark} onToggleTheme={onToggleTheme} />}>
          <Route index element={<HomePage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="manufacturers" element={<ManufacturersPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="quality" element={<QualityPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
