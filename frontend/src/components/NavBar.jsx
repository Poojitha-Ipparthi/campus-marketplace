import { Link, NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "../api/client";

export default function NavBar() {
  const isLoggedIn = Boolean(localStorage.getItem("accessToken"));
  const [orderBadge, setOrderBadge] = useState(0);
  const [messageBadge, setMessageBadge] = useState(0);
  const location = useLocation();

  useEffect(() => {
    if (!isLoggedIn) return;

    function fetchBadges() {
      Promise.all([
        api.get("/api/orders/?role=seller"),
        api.get("/api/orders/"),
      ]).then(([sellRes, buyRes]) => {
        const pendingSelling = sellRes.data.filter((o) => o.status === "PENDING").length;
        const acceptedBuying = buyRes.data.filter((o) => o.status === "ACCEPTED").length;
        setOrderBadge(pendingSelling + acceptedBuying);
      }).catch(() => { });

      if (!location.pathname.startsWith("/messages")) {
        api.get("/api/messages/").then((res) => {
          const unread = res.data.filter((m) => !m.is_read).length;
          setMessageBadge(unread);
        }).catch(() => { });
      } else {
        setMessageBadge(0);
      }
    }

    fetchBadges();
    const interval = setInterval(fetchBadges, 2000);
    return () => clearInterval(interval);
  }, [isLoggedIn, location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith("/messages")) {
      setMessageBadge(0);
    }
  }, [location.pathname]);

  return (
    <header className="nav">
      <Link to="/" className="nav-logo">Campus Marketplace</Link>
      <nav className="nav-links">
        <NavLink to="/" className="nav-link">Home</NavLink>
        {isLoggedIn ? (
          <>
            <NavLink to="/orders" className="nav-link" style={{ position: "relative" }}>
              Orders
              {orderBadge > 0 && (
                <span style={{
                  position: "absolute", top: "-8px", right: "-14px",
                  background: "#ef4444", color: "white", borderRadius: "999px",
                  fontSize: "10px", fontWeight: "700", padding: "1px 5px",
                  lineHeight: "16px", minWidth: "16px", textAlign: "center",
                }}>{orderBadge}</span>
              )}
            </NavLink>
            <NavLink to="/messages" className="nav-link" style={{ position: "relative" }}>
              Messages
              {messageBadge > 0 && (
                <span style={{
                  position: "absolute", top: "-8px", right: "-14px",
                  background: "#ef4444", color: "white", borderRadius: "999px",
                  fontSize: "10px", fontWeight: "700", padding: "1px 5px",
                  lineHeight: "16px", minWidth: "16px", textAlign: "center",
                }}>{messageBadge}</span>
              )}
            </NavLink>
            <NavLink to="/create-listing" className="nav-link">+ Create a Listing</NavLink>
            <NavLink to="/profile" className="nav-link">Profile</NavLink>
            <span className="help-icon">?</span>
          </>
        ) : (
          <>
            <NavLink to="/login" className="nav-link">Login</NavLink>
            <NavLink to="/signup" className="nav-link">Sign Up</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
