import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    api.get(`/api/orders/${id}/`)
      .then((res) => setOrder(res.data))
      .catch(() => setError("Could not load order."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleCancel() {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/api/orders/${id}/cancel/`);
      setOrder(res.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.detail || "Could not cancel order.");
    } finally {
      setActionLoading(false);
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

  if (loading) return <div className="container"><p>Loading order...</p></div>;
  if (error) return <div className="container"><p className="error">{error}</p></div>;
  if (!order) return null;

  return (
    <div className="container">
      <Link to="/orders" className="back-link">← Back to Orders</Link>

      <div className="form-card" style={{ marginTop: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h1 className="form-title" style={{ margin: 0 }}>Order #{order.id}</h1>
          <span className="status-badge" style={{ backgroundColor: statusColor(order.status) }}>
            {order.status}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Item</span>
          <span className="detail-value">
            <Link to={`/listings/${order.listing}`} style={{ color: "#003b70" }}>
              {order.listing_title || `Listing #${order.listing}`}
            </Link>
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Your Offer</span>
          <span className="detail-value">${parseFloat(order.offered_price).toFixed(2)}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Placed On</span>
          <span className="detail-value">{new Date(order.created_at).toLocaleString()}</span>
        </div>

        {order.cancellation_reason && (
          <div className="detail-row">
            <span className="detail-label">Cancellation Reason</span>
            <span className="detail-value">{order.cancellation_reason.replace(/_/g, " ")}</span>
          </div>
        )}

        <div style={{ marginTop: "24px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {order.status === "PENDING" && (
            <button
              className="btn-danger"
              onClick={handleCancel}
              disabled={actionLoading}
            >
              {actionLoading ? "Cancelling..." : "Cancel Order"}
            </button>
          )}

          {order.status === "ACCEPTED" && (
            <Link
              to={`/checkout/${order.id}`}
              className="auth-button"
              style={{ display: "inline-block" }}
            >
              Proceed to Payment
            </Link>
          )}

          {order.status === "COMPLETED" && (
            <Link
              to={`/reviews/create/${order.id}`}
              className="auth-button"
              style={{ display: "inline-block" }}
            >
              Leave a Review
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
