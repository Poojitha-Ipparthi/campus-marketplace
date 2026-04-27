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
        <main className="container">
            <Link className="text-link" to="/listings">
                ← Back to listings
            </Link>

            <div className="detail-layout">
                <div className="detail-image">
                    {imageUrl ? <img src={imageUrl} alt={listing.title} /> : "📦"}
                </div>

                <section className="detail-info">
                    <h1>{listing.title}</h1>

                    <p>{listing.description || "No description provided."}</p>

                    <p className="price large-price">
                        {Number(listing.price) === 0 ? "Free" : `$${listing.price}`}
                    </p>

                    <p>
                        <strong>Condition:</strong> {listing.condition}
                    </p>

                    <p>
                        <strong>Status:</strong> <StatusBadge value={listing.status} />
                    </p>

                    <p>
                        <strong>Seller:</strong>{" "}
                        {listing.seller_email || `User #${listing.seller}`}
                    </p>

                    <p>
                        <strong>Category:</strong>{" "}
                        {listing.category_name ||
                            listing.category?.name ||
                            "Uncategorized"}
                    </p>

                    <Link
                        className="button-link"
                        to={`/users/${listing.seller}`}
                    >
                        View Seller Profile
                    </Link>
                </section>
            </div>
        </main>
    );
}