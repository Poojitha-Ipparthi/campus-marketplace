import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getListing } from "../api/listingsApi";
import { createOrder } from "../api/ordersApi";

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadItem();
  }, [id]);

  async function loadItem() {
    try {
      const res = await getListing(id);
      setItem(res.data);
    } catch {
      setError("Could not load listing");
    }
  }

  async function handleBuy() {
    try {
      setLoading(true);
      setError("");

      const res = await createOrder({
        listing: Number(id),
        offered_price: item.price,
      });

      navigate(`/checkout/${res.data.id}`);
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        "Could not create order";

      setError(String(message));
    } finally {
      setLoading(false);
    }
  }

  if (!item) {
    return (
      <div>
        <header className="header">
          <h1>Listing Detail</h1>
        </header>

        <main className="container">
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  const canBuy = item.status === "AVAILABLE";

  return (
    <div>
      <header className="header">
        <h1>{item.title}</h1>
        <p>Listing details</p>
      </header>

      <main className="container">
        <Link to="/" className="text-link">
          ← Back to listings
        </Link>

        <div className="detail-layout">
          <div className="detail-image">📦</div>

          <div className="detail-info">
            <h2>{item.title}</h2>

            <p className="price large-price">
              {Number(item.price) === 0 ? "Free" : `$${item.price}`}
            </p>

            <p>{item.description || "No description"}</p>

            <p>
              <strong>Condition:</strong> {item.condition}
            </p>

            <p>
              <strong>Status:</strong> {item.status}
            </p>

            <p>
              <strong>Seller:</strong> {item.seller_email || item.seller}
            </p>

            {error && <p className="error">{error}</p>}

            <button
              className="button"
              onClick={handleBuy}
              disabled={!canBuy || loading}
            >
              {loading
                ? "Processing..."
                : Number(item.price) === 0
                  ? "Claim Item"
                  : "Buy Now"}
            </button>

            <Link
              className="secondary-link"
              to={`/messages?listing=${item.id}&receiver=${item.seller}&title=${encodeURIComponent(
                item.title
              )}&seller=${encodeURIComponent(item.seller_email || "Seller")}`}
            >
              Message Seller
            </Link>

            {!canBuy && (
              <p className="warning">
                This listing is not currently available.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}