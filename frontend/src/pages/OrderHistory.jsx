import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/orders/")
      .then((res) => setOrders(res.data))
      .catch(() => setError("Could not load orders."))
      .finally(() => setLoading(false));
  }, []);

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

  if (loading) return <div className="container"><p>Loading orders...</p></div>;
  if (error) return <div className="container"><p className="error">{error}</p></div>;

  return (
    <div className="container">
      <h1 className="form-title">My Orders</h1>

      {orders.length === 0 ? (
        <div className="empty-state">
          <p>You haven't placed any orders yet.</p>
          <Link to="/listings" className="auth-button" style={{ display: "inline-block", marginTop: "12px" }}>
            Browse Listings
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="order-card-link"
            >
              <div className="order-card">
                <div className="order-card-left">
                  <p className="order-title">{order.listing_title || `Listing #${order.listing}`}</p>
                  <p className="order-meta">Order #{order.id}</p>
                  <p className="order-meta">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="order-card-right">
                  <p className="order-price">${parseFloat(order.offered_price).toFixed(2)}</p>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: statusColor(order.status) }}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
