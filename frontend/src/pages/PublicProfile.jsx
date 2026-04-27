import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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

    const seller = useMemo(() => {
        const first = listings[0];

        return {
            id,
            email: first?.seller_email || `User #${id}`,
            trust_score: first?.seller_trust_score ?? "N/A",
            created_at: first?.seller_created_at || null,
        };
    }, [id, listings]);

    useEffect(() => {
        loadPublicProfile();
    }, [id]);

    async function loadPublicProfile() {
        try {
            setError("");

            const listingRes = await getListings({ seller: id });
            const listingData = Array.isArray(listingRes.data) ? listingRes.data : [];
            setListings(listingData);

            const reviewRes = await getReviews({ reviewee: id });
            console.log("reviews:", reviewRes.data);

            const reviewData = Array.isArray(reviewRes.data) ? reviewRes.data : [];
            setReviews(reviewData);
        } catch (err) {
            console.error("Public profile error:", err);
            setError("Could not load public profile.");
        }
    }

    const activeCount = listings.filter((x) => x.status === "AVAILABLE").length;
    const soldCount = listings.filter((x) => x.status === "SOLD").length;

    return (
        <main className="container">
            <h1>Seller Profile</h1>

            {error && <p className="error">{error}</p>}

            <ProfileCard user={seller} title="Seller" />

            <section className="filter-box">
                <h2>Seller Stats</h2>
                <p>
                    <strong>Active Listings:</strong> {activeCount}
                </p>
                <p>
                    <strong>Items Sold:</strong> {soldCount}
                </p>
            </section>

            <section>
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