import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  allowedRoles = [],
  redirectTo,
}) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const userRole = String(user?.role || "").toUpperCase();

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    if (userRole === "CARETAKER") {
      return <Navigate to="/caretaker/bookings" replace />;
    }

    if (userRole === "ADMIN") {
      return <Navigate to="/admin" replace />;
    }

    return <Navigate to="/hostels" replace />;
  }

  return children;
}