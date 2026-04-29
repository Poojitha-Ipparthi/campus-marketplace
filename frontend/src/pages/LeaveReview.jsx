import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";

export default function LeaveReview() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [sellerId, setSellerId] = useState(null);
  const [sellerName, setSellerName] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [orderRes, meRes] = await Promise.all([
          api.get(`/api/orders/${orderId}/`),
          api.get("/api/auth/me/"),
        ]);
        const orderData = orderRes.data;
        setOrder(orderData);
        setCurrentUser(meRes.data);

<<<<<<< Updated upstream
=======
        // Get seller details from the listing
>>>>>>> Stashed changes
        const listingRes = await api.get(`/api/listings/${orderData.listing}/`);
        setSellerId(listingRes.data.seller);
        setSellerName(
          listingRes.data.seller_name ||
          listingRes.data.seller_email ||
          "the seller"
        );
      } catch {
        setError("Could not load order details.");
      } finally {
        setLoading(false);
      }
    }

    load();

  }, [orderId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!sellerId) {
      setError("Could not identify seller. Please go back and try again.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      await api.post("/api/reviews/", {
        order: parseInt(orderId),
        reviewee: sellerId,
        rating: parseInt(rating),
        comment,
      });
      navigate(`/orders/${orderId}`);
    } catch (err) {
      const data = err.response?.data;
      const msg =
        data?.error?.message ||
        data?.detail ||
        data?.non_field_errors?.[0] ||
        "Could not submit review. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="container"><p>Loading...</p></div>;
  if (!order) return <div className="container"><p className="error">{error}</p></div>;

  const isBuyer = currentUser && order.buyer === currentUser.id;

  return (
    <div className="container">
      <Link to={`/orders/${orderId}`} className="back-link">← Back to Order</Link>

      <div className="form-card" style={{ marginTop: "20px" }}>
        <h1 className="form-title">Leave a Review</h1>
        <p className="form-subtitle">Share your experience with this transaction</p>

        {/* Order summary */}
        <div style={{
          background: "#f8fafc", border: "1px solid #e2e8f0",
          borderRadius: "10px", padding: "14px 16px", marginBottom: "24px",
        }}>
          <p style={{ margin: 0, fontWeight: "600", color: "#003b70" }}>
            {order.listing_title || `Order #${orderId}`}
          </p>
          {sellerName && (
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#777" }}>
              Seller: <strong>{sellerName}</strong>
            </p>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label className="label">Rating</label>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                style={{
                  fontSize: "32px", background: "none", border: "none",
                  cursor: "pointer",
                  color: star <= rating ? "#fdb515" : "#ddd",
                  transition: "color 0.15s",
                }}
              >
                ★
              </button>
            ))}
          </div>
          <p style={{ fontSize: "13px", color: "#777", marginTop: "4px" }}>
            {rating} out of 5 stars
          </p>

          <label className="label" style={{ marginTop: "20px" }}>
            Comment (optional)
            <textarea
              className="input full-input"
              value={comment}
              placeholder={`How was your experience with ${sellerName || "this seller"}?`}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              style={{ marginTop: "8px" }}
            />
          </label>

          <button
            className="auth-button"
            type="submit"
            disabled={submitting || !sellerId}
            style={{ marginTop: "20px" }}
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
}
