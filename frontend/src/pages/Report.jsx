import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";

export default function Report() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const reportedUserId = searchParams.get("user");
  const reportedListingId = searchParams.get("listing");

  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!reason.trim()) return;

    setSubmitting(true);
    setError("");

    const payload = { reason };
    if (reportedUserId) payload.reported_user = parseInt(reportedUserId);
    if (reportedListingId) payload.reported_listing = parseInt(reportedListingId);

    try {
      await api.post("/api/reporting/reports/", payload);
      setSuccess(true);
      setTimeout(() => navigate(-1), 2000);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || "Could not submit report.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container">
      <button onClick={() => navigate(-1)} className="back-link" style={{ background: "none", border: "none", cursor: "pointer" }}>
        ← Go Back
      </button>

      <div className="form-card" style={{ marginTop: "20px" }}>
        <h1 className="form-title">Submit a Report</h1>
        <p className="form-subtitle">Help keep Campus Marketplace safe</p>

        {success && <p className="success">Report submitted. Thank you for keeping our community safe!</p>}
        {error && <p className="error">{error}</p>}

        {!success && (
          <form onSubmit={handleSubmit}>
            <label className="label">
              Reason for Report
              <textarea
                className="input full-input"
                value={reason}
                placeholder="Describe why you are reporting this..."
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                required
              />
            </label>

            <button
              className="auth-button"
              type="submit"
              disabled={submitting || !reason.trim()}
              style={{ marginTop: "16px" }}
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
