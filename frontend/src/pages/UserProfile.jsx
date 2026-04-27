import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getListings } from "../api/listingsApi";
import { getMe } from "../api/usersApi";
import { logoutUser } from "../api/authApi";
import ListingCard from "../components/ListingCard";
import ProfileCard from "../components/ProfileCard";

export default function UserProfile() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [myListings, setMyListings] = useState([]);
  const [photo, setPhoto] = useState(localStorage.getItem("profilePhoto") || "");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setError("");

      const userRes = await getMe();
      setMe(userRes.data);

      const listingRes = await getListings({ seller: userRes.data.id });
      setMyListings(Array.isArray(listingRes.data) ? listingRes.data : []);
    } catch {
      setError("Could not load profile. Make sure you are logged in.");
    }
  }

  function changePhoto(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      localStorage.setItem("profilePhoto", reader.result);
      setPhoto(reader.result);
    };

    reader.readAsDataURL(file);
  }

  function handleLogout() {
    logoutUser();
    navigate("/login");
  }

  const soldCount = myListings.filter((x) => x.status === "SOLD").length;

  return (
    <main className="container">
      <h1>My Profile</h1>

      {error && <p className="error">{error}</p>}

      <div className="profile-layout">
        <div>
          <ProfileCard user={me} photo={photo} title="My Account" />

          <section className="filter-box">
            <h2>Profile Picture</h2>
            <input className="input" type="file" accept="image/*" onChange={changePhoto} />
          </section>

          <section className="filter-box">
            <h2>Stats</h2>
            <p>
              <strong>Items Listed:</strong> {myListings.length}
            </p>
            <p>
              <strong>Items Sold:</strong> {soldCount}
            </p>
            <p>
              <strong>Items Bought:</strong> Use order history page.
            </p>
          </section>

          <button className="danger-button" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <section>
          <h2>My Listings</h2>

          {myListings.length === 0 && <p>You have not created listings yet.</p>}

          <div className="grid">
            {myListings.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}