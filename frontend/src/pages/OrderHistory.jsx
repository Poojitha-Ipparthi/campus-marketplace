import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div style={{
      position: "fixed", top: "80px", right: "24px", zIndex: 1000,
      background: "#003b70", color: "white", padding: "14px 20px",
      borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
      fontSize: "14px", maxWidth: "320px",
    }}>
      <p style={{ margin: 0, fontWeight: "700" }}>✅ {message}</p>
      <p style={{ margin: "4px 0 0", fontSize: "12px", opacity: 0.85 }}>
        The buyer will be notified to complete payment.
      </p>
    </div>
  );
}

export default function OrderHistory() {
  const [tab, setTab] = useState("buying");
  const [buyingOrders, setBuyingOrders] = useState([]);
  const [sellingOrders, setSellingOrders] = useState([]);
  const [reviewedOrderIds, setReviewedOrderIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [buyRes, sellRes, reviewRes] = await Promise.all([
        api.get("/api/orders/"),
        api.get("/api/orders/?role=seller"),
        api.get("/api/reviews/"),
      ]);
      setBuyingOrders(buyRes.data);
      setSellingOrders(sellRes.data);
      // Track which orders already have a review
      const reviewed = new Set(reviewRes.data.map((r) => r.order));
      setReviewedOrderIds(reviewed);
    } catch {
      setError("Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(() => {
      loadOrders();
    }, 3000);

    return () => clearInterval(interval);

  }, [loadOrders]);

  async function handleAccept(orderId, listingTitle) {
    setActionLoading(orderId);
    try {
      await api.post(`/api/orders/${orderId}/accept/`);
      await loadOrders();
      setToast(`Order accepted for "${listingTitle}"`);
    } catch (err) {
      alert(err.response?.data?.detail || "Could not accept order.");
    } finally { setActionLoading(null); }
  }

  async function handleReject(orderId) {
    if (!window.confirm("Decline this order?")) return;
    setActionLoading(orderId);
    try {
      await api.post(`/api/orders/${orderId}/reject/`);
      await loadOrders();
    } catch (err) {
      alert(err.response?.data?.detail || "Could not decline order.");
    } finally { setActionLoading(null); }
  }

  async function handleComplete(orderId) {
    if (!window.confirm("Mark this order as completed?")) return;
    setActionLoading(orderId);
    try {
      await api.post(`/api/orders/${orderId}/complete/`);
      await loadOrders();
    } catch (err) {
      alert(err.response?.data?.detail || "Could not complete order.");
    } finally { setActionLoading(null); }
  }

  const STATUS_COLORS = {
    PENDING: "#d97706", ACCEPTED: "#2563eb",
    COMPLETED: "#16a34a", CANCELLED: "#dc2626", REJECTED: "#6b7280",
  };

  const pendingSellerOrders = sellingOrders.filter((o) => o.status === "PENDING").length;
  const orders = tab === "buying" ? buyingOrders : sellingOrders;

  if (loading) return <div className="container"><p>Loading orders...</p></div>;
  if (error) return <div className="container"><p className="error">{error}</p></div>;

  return (
    <div className="container">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <h1 className="form-title">Orders</h1>

      <div className="tabs">
        <button className={`tab-btn ${tab === "buying" ? "active" : ""}`} onClick={() => setTab("buying")}>
          Buying
          {buyingOrders.filter(o => o.status === "ACCEPTED").length > 0 && (
            <span className="tab-badge">{buyingOrders.filter(o => o.status === "ACCEPTED").length}</span>
          )}
        </button>
        <button className={`tab-btn ${tab === "selling" ? "active" : ""}`} onClick={() => setTab("selling")}>
          Selling
          {pendingSellerOrders > 0 && <span className="tab-badge">{pendingSellerOrders}</span>}
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state" style={{ marginTop: "40px", textAlign: "center" }}>
          {tab === "buying" ? (
            <>
              <p style={{ fontSize: "16px" }}>You haven't placed any orders yet.</p>
              <Link to="/listings" className="auth-button"
                style={{ display: "inline-block", marginTop: "16px", textDecoration: "none" }}>
                Browse Listings
              </Link>
            </>
          ) : (
            <p style={{ fontSize: "16px" }}>No orders on your listings yet.</p>
          )}
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card"
              style={{ flexDirection: "column", alignItems: "stretch", gap: "14px" }}>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p className="order-title">
                    <Link to={`/listings/${order.listing}`} style={{ color: "#003b70", textDecoration: "none" }}>
                      {order.listing_title || `Listing #${order.listing}`}
                    </Link>
                  </p>
                  <p className="order-meta">Order #{order.id} · {new Date(order.created_at).toLocaleDateString()}</p>
                  {tab === "selling" && (
                    <p className="order-meta"><strong>Buyer:</strong> {order.buyer_email || `User #${order.buyer}`}</p>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <p className="order-price">${parseFloat(order.offered_price).toFixed(2)}</p>
                  <span className="status-badge"
                    style={{ backgroundColor: STATUS_COLORS[order.status] || "#6b7280", color: "white" }}>
                    {order.status}
                  </span>
                </div>
              </div>

              {/* SELLER actions */}
              {tab === "selling" && (
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {order.status === "PENDING" && (
                    <>
                      <button className="auth-button"
                        style={{ width: "auto", marginTop: 0, padding: "8px 20px", fontSize: "14px" }}
                        onClick={() => handleAccept(order.id, order.listing_title)}
                        disabled={actionLoading === order.id}>
                        {actionLoading === order.id ? "..." : "✓ Accept"}
                      </button>
                      <button className="btn-danger"
                        style={{ padding: "8px 20px", fontSize: "14px" }}
                        onClick={() => handleReject(order.id)}
                        disabled={actionLoading === order.id}>
                        {actionLoading === order.id ? "..." : "✕ Decline"}
                      </button>
                    </>
                  )}
                  {order.status === "ACCEPTED" && (
                    <>
                      <p style={{ fontSize: "13px", color: "#2563eb", margin: "0 auto 0 0", alignSelf: "center" }}>
                        ⏳ Awaiting buyer payment
                      </p>
                      <button className="auth-button"
                        style={{ width: "auto", marginTop: 0, padding: "8px 20px", fontSize: "14px" }}
                        onClick={() => handleComplete(order.id)}
                        disabled={actionLoading === order.id}>
                        {actionLoading === order.id ? "..." : "Mark Complete"}
                      </button>
                    </>
                  )}
                  <Link to={`/orders/${order.id}`} className="btn-secondary"
                    style={{ padding: "8px 20px", fontSize: "14px", textDecoration: "none" }}>
                    View Details
                  </Link>
                </div>
              )}

              {/* BUYER actions */}
              {tab === "buying" && (
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Link to={`/orders/${order.id}`} className="btn-secondary"
                    style={{ padding: "8px 20px", fontSize: "14px", textDecoration: "none" }}>
                    View Details
                  </Link>
                  {order.status === "ACCEPTED" && (
                    <Link to={`/checkout/${order.id}`} className="auth-button"
                      style={{ display: "inline-block", width: "auto", marginTop: 0, padding: "8px 20px", fontSize: "14px", textDecoration: "none" }}>
                      💳 Pay Now
                    </Link>
                  )}
                  {/* Leave Review — only if completed AND not yet reviewed */}
                  {order.status === "COMPLETED" && !reviewedOrderIds.has(order.id) && (
                    <Link to={`/reviews/create/${order.id}`} className="btn-secondary"
                      style={{ padding: "8px 20px", fontSize: "14px", textDecoration: "none" }}>
                      ⭐ Leave Review
                    </Link>
                  )}
                  {order.status === "COMPLETED" && reviewedOrderIds.has(order.id) && (
                    <span style={{ fontSize: "13px", color: "#16a34a", alignSelf: "center", fontWeight: "600" }}>
                      ✓ Reviewed
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
