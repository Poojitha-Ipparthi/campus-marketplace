import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getListings } from "../api/listingsApi";
import { getMe } from "../api/usersApi";
import { logoutUser } from "../api/authApi";
import ProfileCard from "../components/ProfileCard";

export default function UserProfile() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfileData();
  }, []);

  async function loadProfileData() {
    try {
      setLoading(true);
      setError("");

      const [meRes, listingsRes] = await Promise.all([
        getMe(),
        getListings({ mine: true }),
      ]);

      setMe(meRes.data);
      setMyListings(listingsRes.data || []);
    } catch {
      setError("Could not load profile.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logoutUser();
    navigate("/login");
  }

  if (loading) {
    return <main className="container">Loading profile...</main>;
  }

  const soldCount = myListings.filter((x) => x.status === "SOLD").length;

  return (
    <main className="container profile-page">
      <h1 className="profile-header">My Profile</h1>

      {error && <p className="error">{error}</p>}

      <ProfileCard user={me} />

      <section className="profile-stats-section">
        <h2>Stats</h2>

        <div className="profile-stats-content">
          <p>
            <strong>Items Listed:</strong> {myListings.length}
          </p>
          <p>
            <strong>Items Sold:</strong> {soldCount}
          </p>
        </div>
      </section>

      <button className="button" type="button" onClick={handleLogout}>
        Logout
      </button>
    </main>
  );
}