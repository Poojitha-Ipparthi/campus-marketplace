import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";

export default function ListingCard({ listing }) {
  if (!listing) return null;

  const imageUrl = listing.images?.[0]?.image_url ?? null;

  return (
    <Link to={`/listings/${listing.id}`} className="card-link">
      <article className="card">
        <div className="image">
          {imageUrl ? <img src={imageUrl} alt={listing.title} /> : "📦"}
        </div>

        <div className="title">{listing.title}</div>
        <div className="desc">
          {listing.description || "No description"}
        </div>

        <div className="price">
          {Number(listing.price) === 0 ? "Free" : `$${listing.price}`}
        </div>

        <div className="meta-row">
          <span>{listing.condition}</span>
          <StatusBadge value={listing.status} />
        </div>

        <div className="seller">
          Seller: {listing.seller_email || `User #${listing.seller}`}
        </div>
      </article>
    </Link>
  );
}