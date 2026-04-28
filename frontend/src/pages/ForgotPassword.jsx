import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    requestPasswordReset,
    verifyPasswordResetCode,
    confirmPasswordReset,
} from "../api/authApi";

export default function ForgotPassword() {
    const navigate = useNavigate();

    const [step, setStep] = useState("request"); // request | verify | reset
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleRequest(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            const res = await requestPasswordReset({ email });
            setMessage(res.data.detail || "If that email exists, a password reset code has been sent.");
            setStep("verify");
        } catch {
            setError("Could not send reset code.");
        } finally {
            setLoading(false);
        }
    }

    async function handleVerifyCode(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            const res = await verifyPasswordResetCode({ email, code });
            setMessage(res.data.detail || "Reset code verified.");
            setStep("reset");
        } catch (err) {
            const data = err.response?.data;
            const fields = data?.error?.fields;

            setError(
                fields?.code?.[0] ||
                fields?.email?.[0] ||
                data?.error?.message ||
                data?.detail ||
                "Invalid or expired reset code."
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleResetPassword(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        if (newPassword !== confirmPassword) {
            setLoading(false);
            setError("Passwords do not match.");
            return;
        }

        try {
            await confirmPasswordReset({
                email,
                code,
                new_password: newPassword,
                confirm_password: confirmPassword,
            });
            navigate("/login", {
                state: { message: "Password reset successfully. Please log in." },
            });
        } catch (err) {
            const data = err.response?.data;
            const fields = data?.error?.fields;

            setError(
                fields?.new_password?.[0] ||
                fields?.confirm_password?.[0] ||
                fields?.password?.[0] ||
                fields?.code?.[0] ||
                fields?.email?.[0] ||
                data?.error?.message ||
                data?.detail ||
                "Could not reset password."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="auth-page">
            <section className="auth-hero">
                <h1>Campus Marketplace</h1>
                <p>Reset your password securely using your campus email.</p>
            </section>

            <section className="auth-card">
                <h2>Forgot password?</h2>
                <p className="auth-subtitle">
                    {step === "request" && "Enter your campus email to receive a reset code."}
                    {step === "verify" && "Enter the reset code sent to your email."}
                    {step === "reset" && "Create and confirm your new password."}
                </p>

                {message && <p className="success">{message}</p>}
                {error && <p className="error">{error}</p>}

                {step === "request" && (
                    <form onSubmit={handleRequest}>
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

                        <button className="auth-button" type="submit" disabled={loading}>
                            {loading ? "Sending..." : "Send Reset Code"}
                        </button>
                    </form>
                )}

                {step === "verify" && (
                    <form onSubmit={handleVerifyCode}>
                        <label className="label">
                            Reset Code
                            <input
                                className="input full-input"
                                type="text"
                                value={code}
                                placeholder="Enter reset code"
                                onChange={(e) => setCode(e.target.value)}
                                required
                            />
                        </label>

                        <button className="auth-button" type="submit">
                            Verify Code
                        </button>
                    </form>
                )}

                {step === "reset" && (
                    <form onSubmit={handleResetPassword}>
                        <label className="label">
                            New Password
                            <input
                                className="input full-input"
                                type="password"
                                value={newPassword}
                                placeholder="Enter new password"
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </label>

                        <label className="label">
                            Confirm Password
                            <input
                                className="input full-input"
                                type="password"
                                value={confirmPassword}
                                placeholder="Confirm new password"
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </label>

                        <small className="form-help">
                            Password must include at least one special character.
                        </small>

                        <button className="auth-button" type="submit" disabled={loading}>
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>
                    </form>
                )}

                <p className="auth-footer">
                    Remembered it? <Link to="/login">Back to login</Link>
                </p>
            </section>
        </main>
    );
}