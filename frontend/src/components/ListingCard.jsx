import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";

export default function ListingCard({ listing }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  if (!listing) return null;

  const images = useMemo(() => {
    return Array.isArray(listing.images)
      ? listing.images.filter((img) => img?.image_url)
      : [];
  }, [listing.images]);

  const hasMultipleImages = images.length > 1;
  const currentImage = images[currentImageIndex]?.image_url;

  useEffect(() => {
    if (!isHovered || !hasMultipleImages) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 1200);

    return () => clearInterval(interval);
  }, [isHovered, hasMultipleImages, images.length]);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [listing.id]);

  function goToPreviousImage(e) {
    e.preventDefault();
    e.stopPropagation();

    setCurrentImageIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  }

  function goToNextImage(e) {
    e.preventDefault();
    e.stopPropagation();

    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  }

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
        <div
          className="image listing-card-image-carousel"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {currentImage ? (
            <img src={currentImage} alt={listing.title} />
          ) : (
            "📦"
          )}

          {hasMultipleImages && (
            <>
              <button
                type="button"
                className="image-arrow image-arrow-left"
                onClick={goToPreviousImage}
                aria-label="Previous image"
              >
                ‹
              </button>

              <button
                type="button"
                className="image-arrow image-arrow-right"
                onClick={goToNextImage}
                aria-label="Next image"
              >
                ›
              </button>

              <div className="image-count">
                {currentImageIndex + 1}/{images.length}
              </div>
            </>
          )}
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