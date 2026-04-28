import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../api/authApi";

export default function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setLoading(true);
            setError("");

            const res = await loginUser({ email, password });
            const access = res.data.access || res.data.accessToken || res.data.token;
            const refresh = res.data.refresh || res.data.refreshToken;

            if (!access) {
                throw new Error("Login response did not include an access token.");
            }

            localStorage.setItem("accessToken", access);

            if (refresh) {
                localStorage.setItem("refreshToken", refresh);
            }

            navigate("/listings");
        } catch (err) {
            const data = err.response?.data;
            const message = data?.error?.message || data?.detail || err.message || "Login failed.";

            if (message.toLowerCase().includes("verify")) {
                navigate("/verify", { state: { email } });
                return;
            }

            setError(message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="auth-page">
            <section className="auth-hero">
                <h1>Campus Marketplace</h1>
                <p>
                    Buy, sell, and give away items safely within your campus community.

                </p>
            </section>

            <section className="auth-card">
                <h2>Welcome back!</h2>
                <p className="auth-subtitle">Log in to continue shopping on campus.</p>

                {error && <p className="error">{error}</p>}

                <form onSubmit={handleSubmit}>
                    <label className="label">
                        Campus Email
                        <input
                            className="input full-input"
                            type="email"
                            value={email}
                            placeholder="student@etsu.edu"
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </label>

                    <label className="label">
                        Password
                        <input
                            className="input full-input"
                            type="password"
                            value={password}
                            placeholder="Enter your password"
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </label>
                    <Link to="/forgot-password" className="forgot-link">
                        Forgot password?
                    </Link>

                    <button className="auth-button" type="submit" disabled={loading}>
                        {loading ? "Logging in..." : "Log In"}
                    </button>
                </form>

                <p className="auth-footer">
                    No account? <Link to="/signup">Create one</Link>
                </p>
            </section>
        </main>
    );
}