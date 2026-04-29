import { useEffect, useState } from "react";
import {
    getAdminStats,
    getAdminUsers,
    updateAdminUser,
    deactivateAdminUser,
    getAdminListings,
    updateAdminListing,
    deleteAdminListing,
    getAdminOrders,
    getAdminPayments,
} from "../api/adminApi";


/*
 * Normalizes API list responses — handles plain arrays,
 * paginated results, and keyed objects.
 */
function normalizeList(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.payments)) return data.payments;
    return [];
}

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("overview");
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [listings, setListings] = useState([]);
    const [orders, setOrders] = useState([]);
    const [payments, setPayments] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAdminData();
    }, []);

    async function loadAdminData() {
        try {
            setLoading(true);
            setError("");

            const [statsRes, usersRes, listingsRes, ordersRes, paymentsRes] =
                await Promise.allSettled([
                    getAdminStats(),
                    getAdminUsers(),
                    getAdminListings(),
                    getAdminOrders(),
                    getAdminPayments(),
                ]);

            if (statsRes.status === "fulfilled") {
                setStats(statsRes.value.data);
            }

            if (usersRes.status === "fulfilled") {
                setUsers(normalizeList(usersRes.value.data));
            }

            if (listingsRes.status === "fulfilled") {
                setListings(normalizeList(listingsRes.value.data));
            }

            if (ordersRes.status === "fulfilled") {
                setOrders(normalizeList(ordersRes.value.data));
            }

            if (paymentsRes.status === "fulfilled") {
                const data = paymentsRes.value.data;
                console.log("Admin payments response:", data);
                setPayments(normalizeList(data));
            } else {
                console.error("Payments fetch failed:", paymentsRes.reason);
                setError(
                    paymentsRes.reason?.response?.data?.detail ||
                    paymentsRes.reason?.message ||
                    "Could not load admin payments."
                );
            }
        } catch (err) {
            setError(
                err.response?.data?.detail ||
                err.response?.data?.error?.message ||
                "Could not load admin dashboard."
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleToggleUserActive(user) {
        if (user.is_staff) {
            alert("Do not change staff users from this demo UI.");
            return;
        }
        const nextActiveState = !user.is_active;
        const actionText = nextActiveState ? "Activate" : "Deactivate";
        const confirmed = window.confirm(`${actionText} user ${user.email}?`);
        if (!confirmed) return;

        try {
            setError("");
            if (nextActiveState) {
                const res = await updateAdminUser(user.id, { is_active: true });
                setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)));
            } else {
                await deactivateAdminUser(user.id);
                setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: false } : u));
            }
        } catch (err) {
            setError(err.response?.data?.detail || `Could not ${actionText.toLowerCase()} user.`);
        }
    }

    async function handleVerifyUser(user) {
        if (user.verified) return;
        try {
            setError("");
            const res = await updateAdminUser(user.id, { verified: true });
            setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)));
        } catch (err) {
            setError(err.response?.data?.detail || "Could not verify user.");
        }
    }

    async function handleUpdateListingStatus(listing, status) {
        try {
            setError("");
            const res = await updateAdminListing(listing.id, { status });
            setListings((prev) => prev.map((item) => (item.id === listing.id ? res.data : item)));
        } catch {
            setError("Could not update listing.");
        }
    }

    async function handleDeleteListing(listing) {
        if (!window.confirm(`Remove listing "${listing.title}"?`)) return;
        try {
            setError("");
            await deleteAdminListing(listing.id);
            setListings((prev) => prev.filter((item) => item.id !== listing.id));
        } catch {
            setError("Could not remove listing.");
        }
    }

    if (loading) {
        return <main className="container"><p>Loading admin dashboard...</p></main>;
    }

    return (
        <main className="container admin-page">
            <h1 className="profile-header">Admin Dashboard</h1>

            {error && <p className="error">{error}</p>}

            <nav className="admin-tabs">
                {["overview", "users", "listings", "orders", "payments"].map((tab) => (
                    <button
                        key={tab}
                        className={activeTab === tab ? "active" : ""}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {tab === "payments" && payments.length > 0 && ` (${payments.length})`}
                    </button>
                ))}
            </nav>

            {/* ── OVERVIEW ── */}
            {activeTab === "overview" && stats && (
                <section className="admin-stats-grid">
                    <article className="admin-stat-card" onClick={() => setActiveTab("users")}>
                        <strong>Total Users</strong>
                        <span>{stats.total_users}</span>
                    </article>
                    <article className="admin-stat-card" onClick={() => setActiveTab("users")}>
                        <strong>Verified Users</strong>
                        <span>{stats.verified_users}</span>
                    </article>
                    <article className="admin-stat-card" onClick={() => setActiveTab("listings")}>
                        <strong>Total Listings</strong>
                        <span>{stats.total_listings}</span>
                    </article>
                    <article className="admin-stat-card" onClick={() => setActiveTab("listings")}>
                        <strong>Available Listings</strong>
                        <span>{stats.available_listings}</span>
                    </article>
                    <article className="admin-stat-card" onClick={() => setActiveTab("orders")}>
                        <strong>Total Orders</strong>
                        <span>{stats.total_orders}</span>
                    </article>
                    <article className="admin-stat-card" onClick={() => setActiveTab("payments")}>
                        <strong>Total Payments</strong>
                        <span>{stats.total_payments ?? payments.length}</span>
                    </article>
                </section>
            )}

            {/* ── USERS ── */}
            {activeTab === "users" && (
                <section className="admin-section">
                    <h2>Manage Users ({users.length})</h2>
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th><th>Email</th><th>Name</th>
                                    <th>Verified</th><th>Trust Score</th>
                                    <th>Staff</th><th>Active</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td>{user.id}</td>
                                        <td>{user.email}</td>
                                        <td>{user.full_name || "—"}</td>
                                        <td>{user.verified ? "✅" : "❌"}</td>
                                        <td>{user.trust_score ?? "N/A"}</td>
                                        <td>{user.is_staff ? "Yes" : "No"}</td>
                                        <td>{user.is_active ? "Yes" : "No"}</td>
                                        <td className="admin-actions">
                                            {!user.verified && (
                                                <button className="btn-activate" onClick={() => handleVerifyUser(user)}>
                                                    Verify
                                                </button>
                                            )}
                                            <button
                                                className={user.is_active ? "btn-danger" : "btn-activate"}
                                                onClick={() => handleToggleUserActive(user)}
                                            >
                                                {user.is_active ? "Deactivate" : "Activate"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* ── LISTINGS ── */}
            {activeTab === "listings" && (
                <section className="admin-section">
                    <h2>Manage Listings ({listings.length})</h2>
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th><th>Title</th><th>Seller</th>
                                    <th>Price</th><th>Status</th><th>Condition</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {listings.map((listing) => (
                                    <tr key={listing.id}>
                                        <td>{listing.id}</td>
                                        <td>{listing.title}</td>
                                        <td>{listing.seller_email || "—"}</td>
                                        <td>{Number(listing.price) === 0 ? "Free" : `$${listing.price}`}</td>
                                        <td>
                                            <select
                                                className="input"
                                                value={listing.status}
                                                onChange={(e) => handleUpdateListingStatus(listing, e.target.value)}
                                            >
                                                <option value="AVAILABLE">Available</option>
                                                <option value="RESERVED">Reserved</option>
                                                <option value="SOLD">Sold</option>
                                                <option value="CANCELLED">Cancelled</option>
                                            </select>
                                        </td>
                                        <td>{listing.condition || "—"}</td>
                                        <td>
                                            <button className="danger-button" onClick={() => handleDeleteListing(listing)}>
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* ── ORDERS ── */}
            {activeTab === "orders" && (
                <section className="admin-section">
                    <h2>All Orders ({orders.length})</h2>
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th><th>Listing</th><th>Buyer</th>
                                    <th>Price</th><th>Status</th><th>Reserved Until</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <tr key={order.id}>
                                        <td>{order.id}</td>
                                        <td>{order.listing_title || "—"}</td>
                                        <td>{order.buyer_email || "—"}</td>
                                        <td>${order.offered_price}</td>
                                        <td>
                                            <span className="status-badge" style={{
                                                background: order.status === "COMPLETED" ? "#dcfce7" :
                                                    order.status === "ACCEPTED" ? "#dbeafe" :
                                                        order.status === "PENDING" ? "#fef3c7" : "#fee2e2",
                                                color: order.status === "COMPLETED" ? "#166534" :
                                                    order.status === "ACCEPTED" ? "#1d4ed8" :
                                                        order.status === "PENDING" ? "#92400e" : "#991b1b",
                                            }}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td>
                                            {order.reserved_until
                                                ? new Date(order.reserved_until).toLocaleString()
                                                : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* ── PAYMENTS ── */}
            {activeTab === "payments" && (
                <section className="admin-section">
                    <h2>All Payments ({payments.length})</h2>
                    {payments.length === 0 ? (
                        <p style={{ color: "#777" }}>
                            No payments found. Make sure you are logged in as a staff user.
                        </p>
                    ) : (
                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>ID</th><th>Order</th><th>Amount</th>
                                        <th>Status</th><th>Stripe Intent</th><th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map((payment) => (
                                        <tr key={payment.id}>
                                            <td>{payment.id}</td>
                                            <td>#{payment.order_id}</td>
                                            <td>
                                                {(payment.currency || "USD").toUpperCase()}{" "}
                                                {Number(payment.amount || 0).toFixed(2)}
                                            </td>
                                            <td>
                                                <span style={{
                                                    color: payment.status === "SUCCEEDED" ? "#16a34a" : "#d97706",
                                                    fontWeight: "600",
                                                }}>
                                                    {payment.status || "—"}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: "12px", color: "#777" }}>
                                                {payment.stripe_payment_intent_id?.slice(0, 20)}...
                                            </td>
                                            <td>
                                                {payment.created_at
                                                    ? new Date(payment.created_at).toLocaleString()
                                                    : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}
        </main>
    );
}
