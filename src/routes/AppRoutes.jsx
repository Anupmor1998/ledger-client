import { Navigate, Route, Routes } from "react-router-dom";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
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
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage dark={dark} onToggleTheme={onToggleTheme} />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
