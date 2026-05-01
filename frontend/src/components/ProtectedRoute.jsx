/**
 * Route guard for authenticated pages.
 *
 * - No token → redirect to /login.
 * - adminOnly + non-staff user → redirect to /.
 * - userOnly + staff user → redirect to /admin.
 *
 * Staff status is read from localStorage where it is stored at login.
 */


import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, adminOnly = false, userOnly = false }) {
  const token = localStorage.getItem("accessToken");
  const isStaff = localStorage.getItem("isStaff") === "true";

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isStaff) {
    return <Navigate to="/" replace />;
  }

  if (userOnly && isStaff) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}