import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

function PublicRoute() {
  const isAuthenticated = useAppSelector((state) => Boolean(state.auth.token));

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default PublicRoute;
