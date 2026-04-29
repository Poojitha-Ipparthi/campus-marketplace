import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { getCategories } from "../api/listingsApi";

const MAX_IMAGES = 5;

export default function CreateListing() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("USED");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data))
      .catch(() => {});
  }, []);

  function handleImageChange(e) {
    const files = Array.from(e.target.files);
    const remaining = MAX_IMAGES - imageFiles.length;

    if (files.length > remaining) {
      setError(`You can only add ${remaining} more image(s). Maximum is ${MAX_IMAGES}.`);
      return;
    }

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Each image must be under 5MB.");
        return;
      }
    }

    setError("");
    setImageFiles((prev) => [...prev, ...files]);
    const previews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...previews]);
    e.target.value = "";
  }

  function removeImage(index) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
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

      // Upload each image
      for (const file of imageFiles) {
        const formData = new FormData();
        formData.append("image", file);
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
      <Link to="/listings" className="back-link">← Back to Listings</Link>

      <div className="form-card" style={{ marginTop: "12px" }}>
        <h1 className="form-title">Create a Listing</h1>
        <p className="form-subtitle">List an item for your campus community</p>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label className="label">
            Title
            <input className="input full-input" type="text" value={title}
              placeholder="What are you selling?"
              onChange={(e) => setTitle(e.target.value)} required />
          </label>

          <label className="label">
            Description
            <textarea className="input full-input" value={description}
              placeholder="Describe your item..."
              onChange={(e) => setDescription(e.target.value)} rows={4} required />
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
                if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) setPrice(val);
              }}
              required
            />
          </label>

          <label className="label">
            Condition
            <select className="input full-input" value={condition}
              onChange={(e) => setCondition(e.target.value)}>
              <option value="NEW">New</option>
              <option value="USED">Used</option>
            </select>
          </label>

          <label className="label">
            Category (optional)
            <select className="input full-input" value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </label>

          {/* Image section */}
          <div style={{ marginTop: "20px" }}>
            <p className="label" style={{ marginBottom: "8px" }}>
              Images ({imageFiles.length}/{MAX_IMAGES})
            </p>

            {imagePreviews.length > 0 && (
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
                {imagePreviews.map((preview, index) => (
                  <div key={index} style={{ position: "relative" }}>
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      style={{
                        width: "100px", height: "100px",
                        objectFit: "cover", borderRadius: "8px",
                        border: "2px solid #003b70",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      style={{
                        position: "absolute", top: "-6px", right: "-6px",
                        background: "#ef4444", color: "white",
                        border: "none", borderRadius: "50%",
                        width: "22px", height: "22px",
                        fontSize: "12px", cursor: "pointer",
                        display: "flex", alignItems: "center",
                        justifyContent: "center", fontWeight: "bold",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {imageFiles.length < MAX_IMAGES && (
              <label style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "10px 16px", border: "2px dashed #d1d5db",
                borderRadius: "8px", cursor: "pointer",
                fontSize: "14px", color: "#6b7280",
              }}>
                <span style={{ fontSize: "20px" }}>+</span>
                Add Images ({MAX_IMAGES - imageFiles.length} remaining)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
              </label>
            )}
          </div>

          <button className="auth-button" type="submit"
            disabled={loading} style={{ marginTop: "24px" }}>
            {loading ? "Creating..." : "Create Listing"}
          </button>
        </form>
      </div>
    </div>
  );
}
