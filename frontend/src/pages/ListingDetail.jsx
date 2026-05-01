/**
 * Detail view for a single listing.
 *
 * Action buttons are conditional on the viewer's relationship to the listing:
 * - Owner: Edit Listing, Create Another.
 * - Buyer (available listing): Buy Now or Claim Item (if item is free), Message Seller.
 * - Any non-owner: View Seller Profile, Report Listing.
 */

import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getListing } from "../api/listingsApi";
import StatusBadge from "../components/StatusBadge";
import { api } from "../api/client";

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    loadListing();

    api.get("/api/auth/me/")
      .then((res) => setCurrentUserId(res.data.id))
      .catch(() => { });
  }, [id]);

  async function loadListing(options = {}) {
    const { silent = false } = options;

    try {
      if (!silent) setLoading(true);
      if (!silent) setError("");

      const res = await getListing(id);
      setListing(res.data);
    } catch {
      if (!silent) setError("Could not load listing details.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function handlePlaceOrder() {
    setOrdering(true);
    setOrderError("");
    try {
      const res = await api.post("/api/orders/", {
        listing: parseInt(id),
        offered_price: parseFloat(listing.price),
      });
      navigate(`/orders/${res.data.id}`);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        "Could not place order.";
      setOrderError(msg);
    } finally {
      setOrdering(false);
    }
  }

  if (loading) return <main className="container"><p>Loading listing...</p></main>;

  if (error) {
    return (
      <main className="container">
        <p className="error">{error}</p>
        <Link className="text-link" to="/listings">Back to listings</Link>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="container">
        <p>Listing not found.</p>
        <Link className="text-link" to="/listings">Back to listings</Link>
      </main>
    );
  }

  const images = listing.images || [];
  const activeImage = images[activeImageIndex]?.image_url || null;
  const isOwner = currentUserId && listing.seller === currentUserId;
  const isAvailable = listing.status === "AVAILABLE";
  const isLoggedIn = Boolean(localStorage.getItem("accessToken"));
  const isFree = Number(listing.price) === 0;

  return (
    <main className="container detail-page">
      <Link className="back-link" to="/listings">← Back to listings</Link>

      <section className="marketplace-detail-card">
        {/* Main image */}
        <div className="marketplace-detail-image">
          {activeImage ? (
            <img src={activeImage} alt={listing.title} />
          ) : (
            <span style={{ fontSize: "80px" }}>📦</span>
          )}
        </div>

        {/* Image thumbnails — only show if more than 1 image */}
        {images.length > 1 && (
          <div style={{
            display: "flex", gap: "8px", padding: "12px 20px",
            overflowX: "auto", background: "#f8fafc",
            borderBottom: "1px solid #e5e7eb",
          }}>
            {images.map((img, index) => (
              <button
                key={img.id}
                onClick={() => setActiveImageIndex(index)}
                style={{
                  border: activeImageIndex === index ? "2px solid #003b70" : "2px solid transparent",
                  borderRadius: "6px", padding: 0, cursor: "pointer",
                  background: "none", flexShrink: 0,
                }}
              >
                <img
                  src={img.image_url}
                  alt={`View ${index + 1}`}
                  style={{
                    width: "60px", height: "60px",
                    objectFit: "cover", borderRadius: "4px",
                    display: "block",
                  }}
                />
              </button>
            ))}
          </div>
        )}

        <div className="marketplace-detail-info">
          <h1>{listing.title}</h1>

          <p className="price large-price">
            {isFree ? "Free" : `$${Number(listing.price).toFixed(2)}`}
          </p>

          <p><strong>Condition:</strong> {listing.condition}</p>

          <p>
            <strong>Description:</strong>{" "}
            {listing.description || "No description provided."}
          </p>

          <p>
            <strong>Status:</strong> <StatusBadge value={listing.status} />
          </p>

          <p>
            <strong>Seller:</strong>{" "}
            {listing.seller_name || listing.seller_email || `User #${listing.seller}`}
          </p>

          <p>
            <strong>Category:</strong>{" "}
            {listing.category?.name || "Uncategorized"}
          </p>

          {orderError && <p className="error">{orderError}</p>}

          <div style={{
            display: "flex", gap: "12px", marginTop: "20px",
            flexWrap: "wrap", alignItems: "center",
          }}>
            {/* OWNER: manage listing */}
            {isOwner && (
              <>
                <Link
                  to={`/listings/${id}/edit`}
                  className="btn-secondary"
                  style={{ display: "inline-block", textDecoration: "none", textAlign: "center" }}
                >
                  ✏️ Edit Listing
                </Link>
                <Link
                  to="/create-listing"
                  className="btn-secondary"
                  style={{ display: "inline-block", textDecoration: "none", textAlign: "center" }}
                >
                  + Create Another
                </Link>
              </>
            )}

            {/* BUYER: buy/claim and message */}
            {!isOwner && isAvailable && isLoggedIn && (
              <button
                className="auth-button"
                onClick={handlePlaceOrder}
                disabled={ordering}
                style={{ minWidth: "120px" }}
              >
                {ordering
                  ? (isFree ? "Claiming..." : "Placing Order...")
                  : (isFree ? "Claim Item" : "Buy Now")}
              </button>
            )}

            {!isOwner && isLoggedIn && (
              <Link
                to={`/messages?listing=${id}&receiver=${listing.seller}`}
                className="btn-secondary"
                style={{ display: "inline-block", textDecoration: "none", textAlign: "center" }}
              >
                Message Seller
              </Link>
            )}

            {!isOwner && (
              <Link
                className="btn-secondary"
                to={`/users/${listing.seller}`}
                state={{ fromListingId: listing.id }}
                style={{ display: "inline-block", textDecoration: "none", textAlign: "center" }}
              >
                View Seller Profile
              </Link>
            )}

            {!isOwner && isLoggedIn && (
              <Link
                to={`/report?listing=${id}&user=${listing.seller}`}
                style={{
                  fontSize: "12px", color: "#9ca3af",
                  textDecoration: "underline", alignSelf: "center",
                }}
              >
                Report Listing
              </Link>
            )}

            {!isLoggedIn && isAvailable && (
              <p style={{ marginTop: "4px", fontSize: "14px", color: "#777" }}>
                <Link to="/login" style={{ color: "#003b70" }}>Log in</Link> to place an order.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
