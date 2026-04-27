export default function ReviewList({ reviews = [] }) {
  if (!reviews.length) {
    return <p>No reviews yet.</p>;
  }

  return (
    <section>
      <h2>Reviews</h2>

      <div className="order-list">
        {reviews.map((review) => (
          <div key={review.id} className="card">
            <h3 className="title">Rating: {review.rating}/5</h3>
            <p>{review.comment || "No comment provided."}</p>
            <p className="seller">
              Reviewer: {review.reviewer_email || review.reviewer}
            </p>
            <p className="seller">
              Date:{" "}
              {review.created_at
                ? new Date(review.created_at).toLocaleDateString()
                : "Unknown"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}