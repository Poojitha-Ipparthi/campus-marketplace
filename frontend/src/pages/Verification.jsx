import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { sendVerificationCode, verifyEmail, loginUser } from "../api/authApi";

export default function Verification() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialEmail = location.state?.email || "";
  const [email] = useState(initialEmail);
  const [code, setCode] = useState("");

  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate("/signup");
    }
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSendCode(e) {
    e.preventDefault();

    if (cooldown > 0) return;

    try {
      setLoadingSend(true);
      setError("");
      setMessage("");

      await sendVerificationCode({ email });

      setCodeSent(true);
      setCooldown(30);
      setMessage(`Verification code sent to ${email}.`);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        "Could not send verification code.";
      setError(msg);
    } finally {
      setLoadingSend(false);
    }
  }

async function handleVerify(e) {
  e.preventDefault();

  if (!codeSent) return;

  try {
    setLoadingVerify(true);
    setError("");
    setMessage("");

    await verifyEmail({ email, code });

    const password = sessionStorage.getItem("pendingSignupPassword");

    if (!password) {
      setMessage("Email verified successfully. Redirecting to login...");
      setTimeout(() => navigate("/login"), 900);
      return;
    }

    const loginRes = await loginUser({ email, password });

    const access =
      loginRes.data.access || loginRes.data.accessToken || loginRes.data.token;
    const refresh = loginRes.data.refresh || loginRes.data.refreshToken;

    if (!access) {
      throw new Error("Login response did not include an access token.");
    }

    localStorage.setItem("accessToken", access);

    if (refresh) {
      localStorage.setItem("refreshToken", refresh);
    }

    sessionStorage.removeItem("pendingSignupPassword");

    navigate("/listings");
  } catch (err) {
    const msg =
      err.response?.data?.error?.message ||
      err.response?.data?.detail ||
      err.message ||
      "Verification failed.";
    setError(msg);
  } finally {
    setLoadingVerify(false);
  }
}

  return (
    <main className="verify-page">
      <section className="verify-card">
        <h1>Verify your email</h1>

        <p className="auth-subtitle">
          A verification code will be sent to <strong>{email}</strong>.
        </p>

        <p className="auth-subtitle">
          Edit email? <Link to="/signup">Go back to sign up</Link>
        </p>

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSendCode}>
          <label className="label">
            Campus Email
            <input
              className="input full-input"
              type="email"
              value={email}
              disabled
              readOnly
            />
          </label>

          <button
            className="auth-button"
            type="submit"
            disabled={loadingSend || cooldown > 0}
          >
            {loadingSend
              ? "Sending..."
              : cooldown > 0
              ? `Send again in ${cooldown}s`
              : codeSent
              ? "Resend Code"
              : "Send Code"}
          </button>
        </form>

        {codeSent && (
          <>
            <div className="auth-divider" />

            <form onSubmit={handleVerify}>
              <label className="label">
                Verification Code
                <input
                  className="input full-input"
                  type="text"
                  value={code}
                  placeholder="Enter verification code"
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </label>

              <button
                className="auth-button"
                type="submit"
                disabled={loadingVerify || !code.trim()}
              >
                {loadingVerify ? "Verifying..." : "Verify Email"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}