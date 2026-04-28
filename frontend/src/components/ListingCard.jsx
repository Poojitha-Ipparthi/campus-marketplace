import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";

export default function ListingCard({ listing }) {
  if (!listing) return null;

  const imageUrl = listing.images?.[0]?.image_url;

  const sellerName =
    listing.seller_name ||
    listing.seller_email ||
    `User #${listing.seller}`;

  const trustScore =
    listing.seller_trust_score ??
    listing.trust_score ??
    "N/A";

  return (
    <Link to={`/listings/${listing.id}`} className="card-link">
      <article className="card listing-card">
        <div className="image">
          {imageUrl ? <img src={imageUrl} alt={listing.title} /> : "📦"}
        </div>

        <h3 className="title">{listing.title}</h3>

        <p className="price">
          {Number(listing.price) === 0 ? "Free" : `$${listing.price}`}
        </p>

        <div className="meta-row">
          <span>{listing.condition}</span>
          <StatusBadge value={listing.status} />
        </div>

        <p className="seller">
          <strong>Seller:</strong> {sellerName}
        </p>

        <p className="seller">
          <strong>Trust Score:</strong> {trustScore}
        </p>

        {listing.seller_is_new_user && (
          <span className="new-user-badge">New User</span>
        )}
      </article>
    </Link>
  );
}