import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getListings } from "../api/listingsApi";
import { getMe } from "../api/usersApi";

export default function Profile() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [myListings, setMyListings] = useState([]);
  const [name, setName] = useState(localStorage.getItem("profileName") || "");
  const [photo, setPhoto] = useState(localStorage.getItem("profilePhoto") || "");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const res = await getMe();
      setMe(res.data);

      const listingRes = await getListings({ seller: res.data.id });
      setMyListings(listingRes.data);
    } catch {
      setError("Could not load profile. Make sure you are logged in.");
    }
  }

  function saveName() {
    localStorage.setItem("profileName", name);
  }

  function changePhoto(e) {
    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      localStorage.setItem("profilePhoto", reader.result);
      setPhoto(reader.result);
    };

    reader.readAsDataURL(file);
  }

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/");
  }

  return (
    <main className="container">
      <h1>Profile</h1>

      {error && <p className="error">{error}</p>}

      <section className="profile-layout">
        <div className="profile-card">
          <div className="profile-photo">
            {photo ? <img src={photo} alt="Profile" /> : <span>👤</span>}
          </div>

          <label className="upload-label">
            Upload / Change Picture
            <input type="file" accept="image/*" onChange={changePhoto} />
          </label>

          <label className="label">Name</label>
          <input
            className="input full-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />

          <button className="button" onClick={saveName}>
            Save Name
          </button>

          <p>
            <strong>Email:</strong> {me?.email || "Not available"}
          </p>

          <p>
            <strong>Verified:</strong> {me?.verified ? "Yes" : "No"}
          </p>

          <p>
            <strong>Trust Score:</strong> {me?.trust_score || "0.00"}
          </p>
        </div>

        <div className="profile-card">
          <h2>Settings</h2>

          <p>Account settings will be expanded after backend support is added.</p>

          <button className="danger-button" onClick={logout}>
            Logout
          </button>
        </div>
      </section>

      <section className="profile-section">
        <h2>My Listings</h2>

        <div className="grid">
          {myListings.map((x) => (
            <div key={x.id} className="card">
              <div className="image">📦</div>

              <div className="title">{x.title}</div>

              <div className="desc">{x.description || "No description"}</div>

              <div className="price">
                {Number(x.price) === 0 ? "Free" : `$${x.price}`}
              </div>

              <div className="status">
                {x.condition} · {x.status}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}