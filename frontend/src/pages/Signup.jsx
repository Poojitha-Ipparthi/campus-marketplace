import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signupUser } from "../api/authApi";

export default function Signup() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setLoading(true);
            setError("");

            await signupUser({
                full_name: name,
                email,
                password,
            });
            sessionStorage.setItem("pendingSignupPassword", password);
            navigate("/verify", { state: { email } });
        } catch (err) {
            const message =
                err.response?.data?.error?.message ||
                err.response?.data?.detail ||
                "Signup failed.";
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
                <h2>Create your account</h2>
                <p className="auth-subtitle">Use your campus email to get started.</p>

                {error && <p className="error">{error}</p>}

                <form onSubmit={handleSubmit}>
                    <label className="label">
                        Full Name
                        <input
                            className="input full-input"
                            type="text"
                            value={name}
                            placeholder="Enter your full name"
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </label>

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
                            placeholder="Create a password"
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </label>

                    <button className="auth-button" type="submit" disabled={loading}>
                        {loading ? "Creating account..." : "Create Account"}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account? <Link to="/login">Log in</Link>
                </p>
            </section>
        </main>
    );
}