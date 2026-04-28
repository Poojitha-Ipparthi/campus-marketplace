import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";

export default function LeaveReview() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/api/orders/${orderId}/`)
      .then((res) => setOrder(res.data))
      .catch(() => setError("Could not load order."))
      .finally(() => setLoading(false));
  }, [orderId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await api.post("/api/reviews/", {
        order: parseInt(orderId),
        rating: parseInt(rating),
        comment,
      });
      navigate(`/orders/${orderId}`);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || "Could not submit review.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="container"><p>Loading...</p></div>;
  if (!order) return <div className="container"><p className="error">{error}</p></div>;

  return (
    <div className="container">
      <Link to={`/orders/${orderId}`} className="back-link">← Back to Order</Link>

      <div className="form-card" style={{ marginTop: "20px" }}>
        <h1 className="form-title">Leave a Review</h1>
        <p className="form-subtitle">Share your experience with this transaction</p>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label className="label">
            Rating
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  style={{
                    fontSize: "28px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: star <= rating ? "#fdb515" : "#ddd",
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <p style={{ fontSize: "13px", color: "#777", marginTop: "4px" }}>{rating} out of 5 stars</p>
          </label>

          <label className="label">
            Comment (optional)
            <textarea
              className="input full-input"
              value={comment}
              placeholder="How was your experience?"
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </label>

          <button
            className="auth-button"
            type="submit"
            disabled={submitting}
            style={{ marginTop: "16px" }}
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
}
