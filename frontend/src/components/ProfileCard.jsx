export default function ProfileCard({ user, photo, title = "Profile" }) {
  if (!user) {
    return <p>Profile not available.</p>;
  }

  const displayName =
    user.name ||
    user.full_name ||
    user.username ||
    user.email ||
    `User #${user.id}`;

  return (
    <section className="profile-card">
      <div className="profile-photo">
        {photo ? <img src={photo} alt={displayName} /> : <span>👤</span>}
      </div>

      <h2>{title}</h2>
      <p>
        <strong>Name:</strong> {displayName}
      </p>
      <p>
        <strong>Email:</strong> {user.email || "Not shown"}
      </p>
      <p>
        <strong>Trust Score:</strong>{" "}
        {user.trust_score ?? user.trustScore ?? "Not available"}
      </p>
      <p>
        <strong>Member Since:</strong>{" "}
        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "Not available"}
      </p>
    </section>
  );
}