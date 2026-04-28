import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getListing } from "../api/listingsApi";
import StatusBadge from "../components/StatusBadge";

export default function ListingDetail() {
    const { id } = useParams();

    const [listing, setListing] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadListing();
    }, [id]);

    async function loadListing() {
        try {
            setLoading(true);
            setError("");

            const res = await getListing(id);
            setListing(res.data);
        } catch (err) {
            setError("Could not load listing details.");
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <main className="container">
                <p>Loading listing...</p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="container">
                <p className="error">{error}</p>
                <Link className="text-link" to="/listings">
                    Back to listings
                </Link>
            </main>
        );
    }

    if (!listing) {
        return (
            <main className="container">
                <p>Listing not found.</p>
                <Link className="text-link" to="/listings">
                    Back to listings
                </Link>
            </main>
        );
    }

    const imageUrl = listing.images?.[0]?.image_url;

    return (
        <main className="container detail-page">
            <Link className="text-link detail-back-link" to="/listings">
                ← Back to listings
            </Link>

            <section className="marketplace-detail-card">
                <div className="marketplace-detail-image">
                    {imageUrl ? <img src={imageUrl} alt={listing.title} /> : "📦"}
                </div>

                <div className="marketplace-detail-info">
                    <h1>{listing.title}</h1>

                    <p className="price large-price">
                        {Number(listing.price) === 0 ? "Free" : `$${listing.price}`}
                    </p>

                    <p>
                        <strong>Condition:</strong> {listing.condition}
                    </p>

                    <p>
                        <strong>Description:</strong>{" "}
                        {listing.description || "No description provided."}
                    </p>

                    <p>
                        <strong>Status:</strong> <StatusBadge value={listing.status} />
                    </p>

                    <p>
                        <strong>Seller:</strong>{" "}
                        {listing.seller_name || listing.seller_email || `User #${listing.seller}`}
                    </p>

                    <p>
                        <strong>Category:</strong>{" "}
                        {listing.category?.name || listing.category_name || "Uncategorized"}
                    </p>

                    <Link className="button-link" to={`/users/${listing.seller}`}>
                        View Seller Profile
                    </Link>
                </div>
            </section>
        </main>
    );
}