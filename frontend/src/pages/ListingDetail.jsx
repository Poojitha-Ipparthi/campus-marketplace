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

  useEffect(() => {
    loadListing();
    api.get("/api/auth/me/")
      .then((res) => setCurrentUserId(res.data.id))
      .catch(() => {});
  }, [id]);

  async function loadListing() {
    try {
      setLoading(true);
      setError("");
      const res = await getListing(id);
      setListing(res.data);
    } catch {
      setError("Could not load listing details.");
    } finally {
      setLoading(false);
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

  const imageUrl = listing.images?.[0]?.image_url;
  const isOwner = currentUserId && listing.seller === currentUserId;
  const isAvailable = listing.status === "AVAILABLE";
  const isLoggedIn = Boolean(localStorage.getItem("accessToken"));

  return (
    <main className="container detail-page">
      <Link className="back-link" to="/listings">
        ← Back to listings
      </Link>

      <section className="marketplace-detail-card">
        <div className="marketplace-detail-image">
          {imageUrl ? <img src={imageUrl} alt={listing.title} /> : "📦"}
        </div>

        <div className="marketplace-detail-info">
          <h1>{listing.title}</h1>

          <p className="price large-price">
            {Number(listing.price) === 0 ? "Free" : `$${Number(listing.price).toFixed(2)}`}
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

          {/* Button row — flex with consistent alignment */}
          <div style={{
            display: "flex",
            gap: "12px",
            marginTop: "20px",
            flexWrap: "wrap",
            alignItems: "center",
          }}>

            {/* OWNER view: manage their own listing */}
            {isOwner && (
              <>
                <Link
                  to={`/listings/${id}/edit`}
                  className="auth-button"
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

            {/* BUYER view: buy and message */}
            {!isOwner && isAvailable && isLoggedIn && (
              <button
                className="auth-button"
                onClick={handlePlaceOrder}
                disabled={ordering}
                style={{ minWidth: "120px" }}
              >
                {ordering ? "Placing Order..." : "Buy Now"}
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

            {/* Only show View Seller Profile to non-owners */}
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
