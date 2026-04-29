import { useEffect, useMemo, useState } from "react";
import { useLocation, Link, useParams } from "react-router-dom";
import { getListings } from "../api/listingsApi";
import { getReviews } from "../api/reviewsApi";
import ListingCard from "../components/ListingCard";
import ProfileCard from "../components/ProfileCard";
import ReviewList from "../components/ReviewList";

export default function PublicProfile() {
    const { id } = useParams();

    const [listings, setListings] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [error, setError] = useState("");
    const location = useLocation();
    const fromListingId = location.state?.fromListingId;

    const seller = useMemo(() => {
        const first = listings[0];

        return {
            id,
            full_name: first?.seller_name || "",
            email: first?.seller_email || "",
            trust_score: first?.seller_trust_score ?? "N/A",
            created_at: first?.seller_created_at || null,
        };
    }, [id, listings]);

    useEffect(() => {
        loadPublicProfile();
        const interval = setInterval(() => {
            loadProfileData();
        }, 3000);

        return () => clearInterval(interval);
    }, [id]);

    async function loadPublicProfile() {
        try {
            setError("");

            const listingRes = await getListings({ seller: id });
            setListings(Array.isArray(listingRes.data) ? listingRes.data : []);

            const reviewRes = await getReviews({ reviewee: id });
            setReviews(Array.isArray(reviewRes.data) ? reviewRes.data : []);
        } catch (err) {
            console.error("Public profile error:", err);
            setError("Could not load public profile.");
        }
    }

    const activeCount = listings.filter((x) => x.status === "AVAILABLE").length;
    const soldCount = listings.filter((x) => x.status === "SOLD").length;

    return (
        <main className="container">
            {fromListingId && (
                <Link
                    className="back-link"
                    to={`/listings/${fromListingId}`}
                >
                    ← Back to listing
                </Link>
            )}
            <h1 className="profile-header">Seller Profile</h1>

            {error && <p className="error">{error}</p>}

            <ProfileCard user={seller} />

            <section className="profile-stats-section">
                <h2>Seller Stats</h2>

                <div className="profile-stats-content">
                    <p>
                        <strong>Active Listings:</strong> {activeCount}
                    </p>
                    <p>
                        <strong>Items Sold:</strong> {soldCount}
                    </p>
                </div>
            </section>

            <section className="profile-listings-section">
                <h2>Listings</h2>

                {listings.length === 0 && (
                    <p className="empty-state">
                        This seller has no active listings right now.
                    </p>
                )}

                <div className="grid">
                    {listings.map((item) => (
                        <ListingCard key={item.id} listing={item} />
                    ))}
                </div>
            </section>

            <section className="review-section">
                <ReviewList reviews={reviews} />
            </section>
        </main>
    );
}