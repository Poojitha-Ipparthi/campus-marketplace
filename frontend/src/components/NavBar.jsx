import { Link, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "../api/client";

export default function NavBar() {
  const isLoggedIn = Boolean(localStorage.getItem("accessToken"));
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) return;

    function fetchPending() {
      api.get("/api/orders/?role=seller")
        .then((res) => {
          const count = res.data.filter((o) => o.status === "PENDING").length;
          setPendingCount(count);
        })
        .catch(() => {});
    }

    fetchPending();
    // Poll every 30 seconds so seller sees new orders without refreshing
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  return (
    <header className="nav">
      <Link to="/" className="nav-logo">
        Campus Marketplace
      </Link>

      <nav className="nav-links">
        <NavLink to="/" className="nav-link">Home</NavLink>

        {isLoggedIn ? (
          <>
            {/* Orders with badge */}
            <NavLink to="/orders" className="nav-link" style={{ position: "relative" }}>
              Orders
              {pendingCount > 0 && (
                <span style={{
                  position: "absolute",
                  top: "-8px",
                  right: "-12px",
                  background: "#ef4444",
                  color: "white",
                  borderRadius: "999px",
                  fontSize: "10px",
                  fontWeight: "700",
                  padding: "1px 5px",
                  lineHeight: "16px",
                  minWidth: "16px",
                  textAlign: "center",
                }}>
                  {pendingCount}
                </span>
              )}
            </NavLink>

            <NavLink to="/messages" className="nav-link">Messages</NavLink>
            <NavLink to="/create-listing" className="nav-link">+ Create a Listing</NavLink>
            <NavLink to="/profile" className="nav-link">Profile</NavLink>
          </>
        ) : (
          <>
            <NavLink to="/login" className="nav-link">Login</NavLink>
            <NavLink to="/signup" className="nav-link">Sign Up</NavLink>
            {localStorage.getItem("isStaff") === "true" && (
              <NavLink to="/admin" className="nav-link">Admin</NavLink>)}
          </>
        )}
      </nav>
    </header>
  );
}
