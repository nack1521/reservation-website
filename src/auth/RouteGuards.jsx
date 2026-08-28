import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "./useAuth.js";

function SessionLoading() {
  return (
    <div className="min-h-screen grid place-items-center bg-zinc-950 text-slate-200">
      Checking your session...
    </div>
  );
}

export function RequireAuth() {
  const location = useLocation();
  const { user, loading } = useAuth();
  if (loading) return <SessionLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function RequireAdmin() {
  const location = useLocation();
  const { user, loading } = useAuth();
  if (loading) return <SessionLoading />;
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  if (!roles.includes("admin") && !roles.includes("super_admin")) {
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
