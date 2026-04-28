import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function OrderHistory() {
  const [tab, setTab] = useState("buying");
  const [buyingOrders, setBuyingOrders] = useState([]);
  const [sellingOrders, setSellingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null); // order id being acted on

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [buyRes, sellRes] = await Promise.all([
        api.get("/api/orders/"),
        api.get("/api/orders/?role=seller"),
      ]);
      setBuyingOrders(buyRes.data);
      setSellingOrders(sellRes.data);
    } catch {
      setError("Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function handleAccept(orderId) {
    setActionLoading(orderId);
    try {
      await api.post(`/api/orders/${orderId}/accept/`);
      await loadOrders();
    } catch (err) {
      alert(err.response?.data?.detail || "Could not accept order.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(orderId) {
    if (!window.confirm("Reject this order?")) return;
    setActionLoading(orderId);
    try {
      await api.post(`/api/orders/${orderId}/reject/`);
      await loadOrders();
    } catch (err) {
      alert(err.response?.data?.detail || "Could not reject order.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleComplete(orderId) {
    if (!window.confirm("Mark this order as completed?")) return;
    setActionLoading(orderId);
    try {
      await api.post(`/api/orders/${orderId}/complete/`);
      await loadOrders();
    } catch (err) {
      alert(err.response?.data?.detail || "Could not complete order.");
    } finally {
      setActionLoading(null);
    }
  }

  function statusColor(status) {
    const colors = {
      PENDING: "#f59e0b",
      ACCEPTED: "#3b82f6",
      COMPLETED: "#22c55e",
      CANCELLED: "#ef4444",
      REJECTED: "#6b7280",
    };
    return colors[status] || "#6b7280";
  }

  const pendingSellerOrders = sellingOrders.filter((o) => o.status === "PENDING").length;
  const orders = tab === "buying" ? buyingOrders : sellingOrders;

  if (loading) return <div className="container"><p>Loading orders...</p></div>;
  if (error) return <div className="container"><p className="error">{error}</p></div>;

  return (
    <div className="container">
      <h1 className="form-title">Orders</h1>

      <div className="tabs">
        <button
          className={`tab-btn ${tab === "buying" ? "active" : ""}`}
          onClick={() => setTab("buying")}
        >
          Buying
          {buyingOrders.length > 0 && (
            <span className="tab-badge">{buyingOrders.length}</span>
          )}
        </button>
        <button
          className={`tab-btn ${tab === "selling" ? "active" : ""}`}
          onClick={() => setTab("selling")}
        >
          Selling
          {pendingSellerOrders > 0 && (
            <span className="tab-badge">{pendingSellerOrders}</span>
          )}
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          {tab === "buying" ? (
            <>
              <p>You haven't placed any orders yet.</p>
              <Link to="/listings" className="auth-button" style={{ display: "inline-block", marginTop: "12px" }}>
                Browse Listings
              </Link>
            </>
          ) : (
            <p>No orders on your listings yet.</p>
          )}
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card" style={{ flexDirection: "column", alignItems: "stretch", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="order-card-left">
                  <p className="order-title">
                    <Link to={`/listings/${order.listing}`} style={{ color: "#003b70", textDecoration: "none" }}>
                      {order.listing_title || `Listing #${order.listing}`}
                    </Link>
                  </p>
                  <p className="order-meta">Order #{order.id}</p>
                  <p className="order-meta">{new Date(order.created_at).toLocaleDateString()}</p>
                  {tab === "selling" && (
                    <p className="order-meta">
                      <strong>Buyer:</strong> {order.buyer_email || `User #${order.buyer}`}
                    </p>
                  )}
                </div>
                <div className="order-card-right">
                  <p className="order-price">${parseFloat(order.offered_price).toFixed(2)}</p>
                  <span className="status-badge" style={{ backgroundColor: statusColor(order.status) }}>
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Seller actions */}
              {tab === "selling" && (
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {order.status === "PENDING" && (
                    <>
                      <button
                        className="auth-button"
                        style={{ width: "auto", marginTop: 0, padding: "8px 20px", fontSize: "14px" }}
                        onClick={() => handleAccept(order.id)}
                        disabled={actionLoading === order.id}
                      >
                        {actionLoading === order.id ? "..." : "✓ Accept"}
                      </button>
                      <button
                        className="btn-danger"
                        style={{ padding: "8px 20px", fontSize: "14px" }}
                        onClick={() => handleReject(order.id)}
                        disabled={actionLoading === order.id}
                      >
                        {actionLoading === order.id ? "..." : "✕ Reject"}
                      </button>
                    </>
                  )}
                  {order.status === "ACCEPTED" && (
                    <button
                      className="auth-button"
                      style={{ width: "auto", marginTop: 0, padding: "8px 20px", fontSize: "14px" }}
                      onClick={() => handleComplete(order.id)}
                      disabled={actionLoading === order.id}
                    >
                      {actionLoading === order.id ? "..." : "Mark Complete"}
                    </button>
                  )}
                  <Link to={`/orders/${order.id}`} className="btn-secondary" style={{ padding: "8px 20px", fontSize: "14px" }}>
                    View Details
                  </Link>
                </div>
              )}

              {/* Buyer actions */}
              {tab === "buying" && (
                <div style={{ display: "flex", gap: "10px" }}>
                  <Link to={`/orders/${order.id}`} className="btn-secondary" style={{ padding: "8px 20px", fontSize: "14px" }}>
                    View Details
                  </Link>
                  {order.status === "ACCEPTED" && (
                    <Link to={`/checkout/${order.id}`} className="auth-button" style={{ display: "inline-block", width: "auto", marginTop: 0, padding: "8px 20px", fontSize: "14px" }}>
                      Pay Now
                    </Link>
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
