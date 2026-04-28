import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";

export default function Checkout() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get(`/api/orders/${orderId}/`)
      .then((res) => setOrder(res.data))
      .catch(() => setError("Could not load order."))
      .finally(() => setLoading(false));
  }, [orderId]);

  async function handlePayment() {
    setPaying(true);
    setError("");
    try {
      await api.post("/api/orders/payments/create-intent/", { order: parseInt(orderId) });
      setSuccess(true);
      setTimeout(() => navigate(`/orders/${orderId}`), 2000);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        "Payment failed.";
      setError(msg);
    } finally {
      setPaying(false);
    }
  }

  if (loading) return <div className="container"><p>Loading...</p></div>;
  if (error && !order) return <div className="container"><p className="error">{error}</p></div>;
  if (!order) return null;

  if (order.status !== "ACCEPTED") {
    return (
      <div className="container">
        <div className="form-card">
          <p className="error">This order is not ready for payment.</p>
          <Link to={`/orders/${orderId}`}>← Back to Order</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Link to={`/orders/${orderId}`} className="back-link">← Back to Order</Link>

      <div className="form-card" style={{ marginTop: "20px" }}>
        <h1 className="form-title">Checkout</h1>
        <p className="form-subtitle">Complete your purchase</p>

        {success && <p className="success">Payment initiated! Redirecting...</p>}
        {error && <p className="error">{error}</p>}

        <div className="detail-row">
          <span className="detail-label">Item</span>
          <span className="detail-value">{order.listing_title}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Amount</span>
          <span className="detail-value" style={{ fontSize: "24px", fontWeight: "bold", color: "#2e7d32" }}>
            ${parseFloat(order.offered_price).toFixed(2)}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Payment Method</span>
          <span className="detail-value">Secure payment via Stripe</span>
        </div>

        <button
          className="auth-button"
          onClick={handlePayment}
          disabled={paying || success}
          style={{ marginTop: "24px", width: "100%" }}
        >
          {paying ? "Processing..." : `Pay $${parseFloat(order.offered_price).toFixed(2)}`}
        </button>

        <p style={{ fontSize: "12px", color: "#777", marginTop: "12px", textAlign: "center" }}>
          🔒 Payments are processed securely via Stripe
        </p>
      </div>
    </div>
  );
}
