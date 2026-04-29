import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { getCategories } from "../api/listingsApi";

export default function CreateListing() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("USED");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data))
      .catch(() => {});
  }, []);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const priceValue = parseFloat(price);
      if (isNaN(priceValue) || priceValue < 0) {
        setError("Please enter a valid price.");
        setLoading(false);
        return;
      }

      const payload = {
        title,
        description,
        price: priceValue.toFixed(2),
        condition,
      };
      if (categoryId) payload.category_id = parseInt(categoryId);

      const res = await api.post("/api/listings/", payload);
      const listingId = res.data.id;

      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        await api.post(`/api/listings/${listingId}/upload-image/`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      navigate(`/listings/${listingId}`);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.error?.message || data?.detail || "Failed to create listing.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      {/* Back link */}
      <Link to="/listings" className="back-link">← Back to Listings</Link>

      <div className="form-card" style={{ marginTop: "12px" }}>
        <h1 className="form-title">Create a Listing</h1>
        <p className="form-subtitle">List an item for your campus community</p>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label className="label">
            Title
            <input className="input full-input" type="text" value={title}
              placeholder="What are you selling?" onChange={(e) => setTitle(e.target.value)} required />
          </label>

          <label className="label">
            Description
            <textarea className="input full-input" value={description}
              placeholder="Describe your item..." onChange={(e) => setDescription(e.target.value)} rows={4} required />
          </label>

          <label className="label">
            Price ($)
            <input
              className="input full-input"
              type="text"
              inputMode="decimal"
              value={price}
              placeholder="0.00"
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) setPrice(val);
              }}
              required
            />
          </label>

          <label className="label">
            Condition
            <select className="input full-input" value={condition} onChange={(e) => setCondition(e.target.value)}>
              <option value="NEW">New</option>
              <option value="USED">Used</option>
            </select>
          </label>

          <label className="label">
            Category (optional)
            <select className="input full-input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </label>

          <label className="label">
            Image (optional)
            <input className="input full-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} />
          </label>

          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Preview" />
            </div>
          )}

          <button className="auth-button" type="submit" disabled={loading} style={{ marginTop: "16px" }}>
            {loading ? "Creating..." : "Create Listing"}
          </button>
        </form>
      </div>
    </div>
  );
}
