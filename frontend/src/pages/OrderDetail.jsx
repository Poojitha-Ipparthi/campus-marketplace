import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";

const BUYER_INFO = {
  PENDING:   { label: "Awaiting Seller Response", color: "#d97706", bg: "#fffbeb", border: "#fcd34d", message: "Your order has been placed! The seller will review and accept or decline it.", icon: "⏳" },
  ACCEPTED:  { label: "Accepted — Payment Required", color: "#2563eb", bg: "#eff6ff", border: "#93c5fd", message: "Great news! The seller accepted your order. Please complete your payment to secure the item.", icon: "✅" },
  COMPLETED: { label: "Order Complete", color: "#16a34a", bg: "#f0fdf4", border: "#86efac", message: "This transaction is complete. Thank you for using Campus Marketplace!", icon: "🎉" },
  CANCELLED: { label: "Order Cancelled", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5", message: "This order was cancelled.", icon: "❌" },
  REJECTED:  { label: "Declined by Seller", color: "#6b7280", bg: "#f9fafb", border: "#d1d5db", message: "The seller declined this order. The item may no longer be available.", icon: "🚫" },
};

const SELLER_INFO = {
  PENDING:   { label: "New Order — Action Required", color: "#d97706", bg: "#fffbeb", border: "#fcd34d", message: "A buyer wants to purchase this item. Accept to reserve it for them, or decline.", icon: "📦" },
  ACCEPTED:  { label: "Accepted — Awaiting Payment", color: "#2563eb", bg: "#eff6ff", border: "#93c5fd", message: "You accepted this order. The buyer has 24 hours to complete payment.", icon: "⏳" },
  COMPLETED: { label: "Order Complete", color: "#16a34a", bg: "#f0fdf4", border: "#86efac", message: "This transaction is complete. Great job!", icon: "🎉" },
  CANCELLED: { label: "Order Cancelled", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5", message: "This order was cancelled. The listing is available again.", icon: "❌" },
  REJECTED:  { label: "Order Declined", color: "#6b7280", bg: "#f9fafb", border: "#d1d5db", message: "You declined this order.", icon: "🚫" },
};

export default function OrderDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const justPaid = searchParams.get("paid") === "true";
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [hasReview, setHasReview] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const loadOrder = useCallback(async () => {
    try {
      const [orderRes, userRes] = await Promise.all([
        api.get(`/api/orders/${id}/`),
        api.get("/api/auth/me/"),
      ]);
      setOrder(orderRes.data);
      setCurrentUser(userRes.data);
      if (orderRes.data.status === "COMPLETED") {
        try {
          const reviewRes = await api.get(`/api/reviews/?order=${id}`);
          setHasReview(reviewRes.data.length > 0);
        } catch { setHasReview(false); }
      }
    } catch { setError("Could not load order."); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  async function handleCancel() {
    if (!window.confirm("Cancel this order?")) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/api/orders/${id}/cancel/`);
      setOrder(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not cancel.");
    } finally { setActionLoading(false); }
  }

  async function handleAccept() {
    setActionLoading(true);
    try {
      const res = await api.post(`/api/orders/${id}/accept/`);
      setOrder(res.data);
      setSuccessMsg("Order accepted! The buyer has been notified to complete payment.");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not accept order.");
    } finally { setActionLoading(false); }
  }

  async function handleReject() {
    if (!window.confirm("Decline this order? The buyer will be notified.")) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/api/orders/${id}/reject/`);
      setOrder(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not decline order.");
    } finally { setActionLoading(false); }
  }

  async function handleComplete() {
    if (!window.confirm("Mark this order as completed?")) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/api/orders/${id}/complete/`);
      setOrder(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not complete order.");
    } finally { setActionLoading(false); }
  }

  if (loading) return <div className="container"><p>Loading order...</p></div>;
  if (error && !order) return <div className="container"><p className="error">{error}</p></div>;
  if (!order) return null;

  const isBuyer = currentUser && order.buyer === currentUser.id;
  const infoMap = isBuyer ? BUYER_INFO : SELLER_INFO;
  const info = infoMap[order.status] || BUYER_INFO.CANCELLED;
  const reservedUntil = order.reserved_until ? new Date(order.reserved_until) : null;

  const subtleBtn = {
    background: "none", border: "none", color: "#9ca3af",
    fontSize: "13px", cursor: "pointer", textDecoration: "underline",
    padding: "4px 0", textAlign: "center", display: "block", width: "100%",
  };

  return (
    <div className="container" style={{ maxWidth: "680px" }}>
      <Link to="/orders" className="back-link">← Back to Orders</Link>

      {/* Success Toast */}
      {successMsg && (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "12px 16px", marginTop: "16px", color: "#15803d", fontWeight: "600", fontSize: "14px" }}>
          ✅ {successMsg}
        </div>
      )}

      {/* Status Banner */}
      <div style={{ background: info.bg, border: `1.5px solid ${info.border}`, borderRadius: "12px", padding: "18px 22px", marginTop: "16px", marginBottom: "16px", display: "flex", alignItems: "flex-start", gap: "14px" }}>
        <span style={{ fontSize: "26px", lineHeight: 1 }}>{info.icon}</span>
        <div>
          <p style={{ margin: 0, fontWeight: "700", color: info.color, fontSize: "15px" }}>{info.label}</p>
          <p style={{ margin: "6px 0 0", color: "#444", fontSize: "14px", lineHeight: "1.5" }}>{info.message}</p>
          {order.status === "ACCEPTED" && reservedUntil && isBuyer && (
            <p style={{ margin: "6px 0 0", color: "#dc2626", fontSize: "13px", fontWeight: "600" }}>
              ⏰ Reserved until {reservedUntil.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="form-card" style={{ marginTop: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <h1 className="form-title" style={{ margin: 0 }}>{order.listing_title || `Listing #${order.listing}`}</h1>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#888" }}>Order #{order.id}</p>
          </div>
          <span className="status-badge" style={{ backgroundColor: info.color, color: "white", padding: "6px 14px", fontSize: "12px", fontWeight: "700" }}>
            {order.status}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Item</span>
          <span className="detail-value">
            <Link to={`/listings/${order.listing}`} style={{ color: "#003b70", fontWeight: "600" }}>
              {order.listing_title || `Listing #${order.listing}`}
            </Link>
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Amount</span>
          <span className="detail-value" style={{ fontWeight: "700", color: "#16a34a", fontSize: "18px" }}>
            ${parseFloat(order.offered_price).toFixed(2)}
          </span>
        </div>

        {!isBuyer && (
          <div className="detail-row">
            <span className="detail-label">Buyer</span>
            <span className="detail-value">{order.buyer_email || `User #${order.buyer}`}</span>
          </div>
        )}

        <div className="detail-row">
          <span className="detail-label">Order Placed</span>
          <span className="detail-value">{new Date(order.created_at).toLocaleString()}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Last Updated</span>
          <span className="detail-value">{new Date(order.updated_at).toLocaleString()}</span>
        </div>

        {order.cancellation_reason && (
          <div className="detail-row">
            <span className="detail-label">Reason</span>
            <span className="detail-value" style={{ color: "#dc2626" }}>{order.cancellation_reason.replace(/_/g, " ")}</span>
          </div>
        )}

        {error && <p className="error" style={{ marginTop: "12px" }}>{error}</p>}

        {/* BUYER ACTIONS */}
        {isBuyer && (
          <div style={{ marginTop: "28px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {order.status === "PENDING" && (
              <>
                <Link to="/listings" className="auth-button" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>← Continue Browsing</Link>
                <button onClick={handleCancel} disabled={actionLoading} style={subtleBtn}>
                  {actionLoading ? "Cancelling..." : "Changed your mind? Cancel this order"}
                </button>
              </>
            )}
            {order.status === "ACCEPTED" && justPaid && (
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
                <p style={{ fontSize: "28px", margin: 0 }}>✅</p>
                <p style={{ color: "#15803d", fontWeight: "700", margin: "8px 0 4px" }}>Payment received!</p>
                <p style={{ color: "#555", fontSize: "13px", margin: 0 }}>Your order is being confirmed. Refresh in a moment.</p>
              </div>
            )}
            {order.status === "ACCEPTED" && !justPaid && (
              <>
                <Link to={`/checkout/${order.id}`} className="auth-button" style={{ display: "block", textAlign: "center", textDecoration: "none", fontSize: "16px" }}>
                  💳 Pay Now — ${parseFloat(order.offered_price).toFixed(2)}
                </Link>
                <button onClick={handleCancel} disabled={actionLoading} style={subtleBtn}>
                  {actionLoading ? "Cancelling..." : "Changed your mind? Cancel this order"}
                </button>
              </>
            )}
            {order.status === "COMPLETED" && !hasReview && (
              <Link to={`/reviews/create/${order.id}`} className="auth-button" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                ⭐ Leave a Review
              </Link>
            )}
            {order.status === "COMPLETED" && hasReview && (
              <p style={{ color: "#16a34a", fontWeight: "600", textAlign: "center" }}>✓ You've already reviewed this order.</p>
            )}
            {order.status === "REJECTED" && (
              <Link to="/listings" className="auth-button" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>Browse Other Listings</Link>
            )}
          </div>
        )}

        {/* SELLER ACTIONS */}
        {!isBuyer && (
          <div style={{ marginTop: "28px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {order.status === "PENDING" && (
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  className="auth-button"
                  style={{ flex: 1, marginTop: 0 }}
                  onClick={handleAccept}
                  disabled={actionLoading}
                >
                  {actionLoading ? "..." : "✓ Accept Order"}
                </button>
                <button
                  className="btn-danger"
                  style={{ flex: 1 }}
                  onClick={handleReject}
                  disabled={actionLoading}
                >
                  {actionLoading ? "..." : "✕ Decline"}
                </button>
              </div>
            )}
            {order.status === "ACCEPTED" && justPaid && (
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
                <p style={{ fontSize: "28px", margin: 0 }}>✅</p>
                <p style={{ color: "#15803d", fontWeight: "700", margin: "8px 0 4px" }}>Payment received!</p>
                <p style={{ color: "#555", fontSize: "13px", margin: 0 }}>Your order is being confirmed. Refresh in a moment.</p>
              </div>
            )}
            {order.status === "ACCEPTED" && !justPaid && (
              <>
                <p style={{ color: "#2563eb", fontSize: "14px", textAlign: "center", margin: 0 }}>
                  ⏳ Waiting for the buyer to complete payment.
                </p>
                <button
                  className="auth-button"
                  style={{ marginTop: 0 }}
                  onClick={handleComplete}
                  disabled={actionLoading}
                >
                  {actionLoading ? "..." : "Mark as Completed"}
                </button>
              </>
            )}
            {order.status === "COMPLETED" && (
              <p style={{ color: "#16a34a", fontWeight: "600", textAlign: "center" }}>✓ This order is complete.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
