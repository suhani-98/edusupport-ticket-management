import { Navigate, Outlet } from "react-router-dom";
import { LoadingState } from "../components/ui/LoadingState";
import { useAuth } from "../context/useAuth";
import { homePath, type Role } from "../types/auth";

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <LoadingState label="Checking your session…" />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return <LoadingState label="Checking your session…" />;
  }
  if (user) {
    return <Navigate to={homePath(user.role)} replace />;
  }
  return <Outlet />;
}

export function RoleRoute({ role }: { role: Role }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== role) {
    return <Navigate to={homePath(user.role)} replace />;
  }
  return <Outlet />;
}

export function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return <LoadingState label="Checking your session…" />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={homePath(user.role)} replace />;
}
