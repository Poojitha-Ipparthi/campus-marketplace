/**
 * Renders a list of reviews with star ratings and comments.
 * Used on the public seller profile page.
 */

export default function ReviewList({ reviews = [] }) {
  if (!reviews.length) {
    return (
      <section className="reviews-section">
        <h2>Reviews</h2>
        <p className="empty-state">No reviews yet.</p>
      </section>
    );
  }

  return (
    <section className="reviews-section">
      <h2>Reviews</h2>

      <div className="reviews-list">
        {reviews.map((review) => (
          <article key={review.id} className="review-card">
            <h3>Rating: {review.rating}/5</h3>
            <p>{review.comment || "No comment provided."}</p>

            <p className="seller">
              <strong>Reviewer:</strong>{" "}
              {review.reviewer_email || review.reviewer}
            </p>

            <p className="seller">
              <strong>Date:</strong>{" "}
              {review.created_at
                ? new Date(review.created_at).toLocaleDateString()
                : "Unknown"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}