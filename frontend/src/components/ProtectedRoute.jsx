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