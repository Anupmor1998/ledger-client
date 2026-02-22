import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

function ProtectedRoute() {
  const isAuthenticated = useAppSelector(
    (state) => Boolean(state.auth.token) && Boolean(state.auth.user?.id)
  );

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
