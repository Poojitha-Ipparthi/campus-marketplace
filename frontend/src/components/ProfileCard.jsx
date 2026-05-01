/**
 * Displays a user's profile summary: name, email, trust score, member since date.
 * Used on both the private UserProfile and public PublicProfile pages.
 */

export default function ProfileCard({ user, photo }) {
  if (!user) {
    return <p>Profile not available.</p>;
  }

  const displayName =
    user.full_name || user.name || user.username || `User #${user.id}`;

  return (
    <section className="seller-profile-card">
      <div className="seller-photo-circle">
        {photo ? <img src={photo} alt={displayName} /> : <span>👤</span>}
      </div>

      <h3 className="profile-name">{displayName}</h3>

      <div className="seller-profile-info">
        <p>
          <strong>Trust Score:</strong>{" "}
          {user.trust_score ?? user.trustScore ?? "Not available"}
        </p>

        <p>
          <strong>Member Since:</strong>{" "}
          {user.created_at
            ? new Date(user.created_at).toLocaleDateString()
            : "Not available"}
        </p>
      </div>
    </section>
  );
}