/**
 * Form for editing an existing listing.
 *
 * Pre-fills all fields from the current listing data on mount.
 * Existing images can be deleted individually via the backend.
 * New images can be added up to the 5-image maximum.
 * Only the listing owner can reach this page — the component redirects
 * away if the current user is not the seller.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { getCategories, getListing } from "../api/listingsApi";

const MAX_IMAGES = 5;

export default function EditListing() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("USED");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [listingRes, catRes] = await Promise.all([
          getListing(id),
          getCategories(),
        ]);
        const listing = listingRes.data;

        // Verify ownership
        const meRes = await api.get("/api/auth/me/");
        if (meRes.data.id !== listing.seller) {
          navigate(`/listings/${id}`);
          return;
        }

        setTitle(listing.title);
        setDescription(listing.description || "");
        setPrice(String(listing.price));
        setCondition(listing.condition);
        setCategoryId(listing.category?.id ? String(listing.category.id) : "");
        setExistingImages(listing.images || []);
        setCategories(catRes.data);
      } catch {
        setError("Could not load listing.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, navigate]);

  const totalImages = existingImages.length + newFiles.length;

  function handleNewImages(e) {
    const files = Array.from(e.target.files);
    const remaining = MAX_IMAGES - existingImages.length - newFiles.length;

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
    setNewFiles((prev) => [...prev, ...files]);
    const previews = files.map((f) => URL.createObjectURL(f));
    setNewPreviews((prev) => [...prev, ...previews]);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  function removeNewFile(index) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleDeleteExistingImage(imageId) {
    if (!window.confirm("Delete this image?")) return;
    setDeletingImageId(imageId);
    try {
      await api.delete(`/api/listings/${id}/images/${imageId}/`);
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch {
      setError("Could not delete image. Please try again.");
    } finally {
      setDeletingImageId(null);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const priceValue = parseFloat(price);
      if (isNaN(priceValue) || priceValue < 0) {
        setError("Please enter a valid price.");
        setSaving(false);
        return;
      }

      const payload = {
        title,
        description,
        price: priceValue.toFixed(2),
        condition,
      };
      if (categoryId) payload.category_id = parseInt(categoryId);

      await api.patch(`/api/listings/${id}/`, payload);

      // Upload new images one by one
      for (const file of newFiles) {
        const formData = new FormData();
        formData.append("image", file);
        await api.post(`/api/listings/${id}/upload-image/`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      navigate(`/listings/${id}`);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.error?.message || data?.detail || "Could not save changes.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this listing? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.delete(`/api/listings/${id}/`);
      navigate("/listings");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not delete listing.");
      setDeleting(false);
    }
  }

  if (loading) return <div className="container"><p>Loading...</p></div>;

  return (
    <div className="container">
      <Link to={`/listings/${id}`} className="back-link">← Back to Listing</Link>

      <div className="form-card" style={{ marginTop: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <h1 className="form-title" style={{ margin: 0 }}>Edit Listing</h1>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              background: "none", border: "none", color: "#ef4444",
              fontSize: "13px", cursor: "pointer", fontWeight: "600",
              textDecoration: "underline",
            }}
          >
            {deleting ? "Deleting..." : "🗑 Delete Listing"}
          </button>
        </div>
        <p className="form-subtitle">Update your listing details</p>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSave}>
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
              onChange={(e) => setDescription(e.target.value)} rows={4} />
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
            Category
            <select className="input full-input" value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </label>

          {/* Images section */}
          <div style={{ marginTop: "20px" }}>
            <p className="label" style={{ marginBottom: "8px" }}>
              Images ({totalImages}/{MAX_IMAGES})
            </p>

            {/* Existing images */}
            {existingImages.length > 0 && (
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
                {existingImages.map((img) => (
                  <div key={img.id} style={{ position: "relative" }}>
                    <img
                      src={img.image_url}
                      alt="Listing"
                      style={{
                        width: "100px", height: "100px",
                        objectFit: "cover", borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        opacity: deletingImageId === img.id ? 0.4 : 1,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteExistingImage(img.id)}
                      disabled={deletingImageId === img.id}
                      style={{
                        position: "absolute", top: "-6px", right: "-6px",
                        background: "#ef4444", color: "white",
                        border: "none", borderRadius: "50%",
                        width: "22px", height: "22px",
                        fontSize: "12px", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: "bold", lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* New image previews */}
            {newPreviews.length > 0 && (
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
                {newPreviews.map((preview, index) => (
                  <div key={index} style={{ position: "relative" }}>
                    <img
                      src={preview}
                      alt={`New ${index + 1}`}
                      style={{
                        width: "100px", height: "100px",
                        objectFit: "cover", borderRadius: "8px",
                        border: "2px solid #003b70",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeNewFile(index)}
                      style={{
                        position: "absolute", top: "-6px", right: "-6px",
                        background: "#6b7280", color: "white",
                        border: "none", borderRadius: "50%",
                        width: "22px", height: "22px",
                        fontSize: "12px", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: "bold",
                      }}
                    >
                      ×
                    </button>
                    <span style={{
                      position: "absolute", bottom: "4px", left: "4px",
                      background: "#003b70", color: "white",
                      fontSize: "10px", padding: "1px 5px", borderRadius: "4px",
                    }}>New</span>
                  </div>
                ))}
              </div>
            )}

            {/* Add images button */}
            {totalImages < MAX_IMAGES && (
              <label style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "10px 16px", border: "2px dashed #d1d5db",
                borderRadius: "8px", cursor: "pointer", fontSize: "14px",
                color: "#6b7280", transition: "0.15s",
              }}>
                <span style={{ fontSize: "20px" }}>+</span>
                Add Images ({MAX_IMAGES - totalImages} remaining)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleNewImages}
                  style={{ display: "none" }}
                />
              </label>
            )}

            {totalImages >= MAX_IMAGES && (
              <p style={{ fontSize: "13px", color: "#9ca3af" }}>
                Maximum {MAX_IMAGES} images reached.
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <button className="auth-button" type="submit"
              disabled={saving} style={{ flex: 1, marginTop: 0 }}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <Link to={`/listings/${id}`} className="btn-secondary"
              style={{ flex: 1, textAlign: "center", textDecoration: "none", padding: "12px" }}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
