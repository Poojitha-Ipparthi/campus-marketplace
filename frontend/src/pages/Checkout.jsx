/**
 * Stripe payment screen for an accepted order.
 *
 * Creates a Payment Intent on the backend, which returns a client secret.
 * That secret is passed to Stripe's CardElement to render a secure card form.
 * Card data is collected and processed entirely by Stripe — it never passes
 * through the application server.
 *
 * On payment success, the backend receives a payment_intent.succeeded webhook
 * from Stripe, which marks the order as COMPLETED and the listing as SOLD.
 * The user is redirected to the order page with ?paid=true to show a
 * confirmation state while the webhook processes.
 */


import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const STRIPE_PK =
  "pk_test_51TQnIEH4UgModrnrlwGbx1p37laL9FplgMwVaKee5k0ixWuUJnzVVQGQdiF5bjOy6CkHVgPVR73u56XKoNqSZY2c00I3XqhIzu";

const stripePromise = loadStripe(STRIPE_PK);

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "16px",
      color: "#111",
      fontFamily: "Arial, sans-serif",
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: { color: "#dc2626" },
  },
};

function PaymentForm({ order, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();

  const [paying, setPaying] = useState(false);
  const [cardError, setCardError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    if (!stripe || !elements) return;

    setPaying(true);
    setCardError("");

    try {
      const intentRes = await api.post("/api/orders/payments/create-intent/", {
        order: order.id,
      });

      const { client_secret } = intentRes.data;

      const { error: stripeError, paymentIntent } =
        await stripe.confirmCardPayment(client_secret, {
          payment_method: {
            card: elements.getElement(CardElement),
          },
        });

      if (stripeError) {
        setCardError(stripeError.message);
        onError(stripeError.message);
        return;
      }

      if (paymentIntent.status === "succeeded") {
        await api.post("/api/orders/payments/confirm/", {
          payment_intent_id: paymentIntent.id,
        });

        onSuccess();
        return;
      }

      setCardError("Payment was not completed. Please try again.");
      onError("Payment was not completed. Please try again.");
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error?.message ||
        "Payment failed. Please try again.";

      setCardError(msg);
      onError(msg);
    } finally {
      setPaying(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          border: "1.5px solid #d1d5db",
          borderRadius: "8px",
          padding: "14px 16px",
          background: "#fafafa",
          marginBottom: "8px",
        }}
      >
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>

      {cardError && (
        <p style={{ color: "#dc2626", fontSize: "13px", margin: "6px 0 0" }}>
          {cardError}
        </p>
      )}

      <p style={{ fontSize: "12px", color: "#9ca3af", margin: "8px 0 0" }}>
        🔒 Test card: <strong>4242 4242 4242 4242</strong> · Any future expiry ·
        Any CVC
      </p>

      <button
        type="submit"
        className="auth-button"
        disabled={!stripe || paying}
        style={{ marginTop: "20px", width: "100%", fontSize: "16px" }}
      >
        {paying
          ? "Processing..."
          : `Pay $${parseFloat(order.offered_price).toFixed(2)}`}
      </button>
    </form>
  );
}

export default function Checkout() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    async function loadOrder() {
      try {
        setLoading(true);
        setError("");

        const res = await api.get(`/api/orders/${orderId}/`);
        setOrder(res.data);
      } catch {
        setError("Could not load order.");
      } finally {
        setLoading(false);
      }
    }

    loadOrder();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [orderId]);

  function handleSuccess() {
    setSuccess(true);

    timerRef.current = setTimeout(() => {
      navigate(`/orders/${orderId}?paid=true`);
    }, 2000);
  }

  if (loading) {
    return (
      <div className="container">
        <p>Loading...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="container">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!order) return null;

  if (order.status === "COMPLETED") {
    return (
      <div className="container" style={{ maxWidth: "560px" }}>
        <div className="form-card" style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ fontSize: "48px", margin: 0 }}>🎉</p>
          <h2 style={{ color: "#16a34a" }}>Payment Complete!</h2>
          <p style={{ color: "#555" }}>This order has already been completed.</p>

          <Link
            to={`/orders/${orderId}`}
            className="auth-button"
            style={{
              display: "inline-block",
              marginTop: "12px",
              textDecoration: "none",
            }}
          >
            View Order
          </Link>
        </div>
      </div>
    );
  }

  if (order.status !== "ACCEPTED") {
    return (
      <div className="container" style={{ maxWidth: "560px" }}>
        <div className="form-card">
          <p className="error">
            This order is not ready for payment (status: {order.status}).
          </p>

          <Link
            to={`/orders/${orderId}`}
            className="back-link"
            style={{ marginTop: "12px", display: "inline-block" }}
          >
            ← Back to Order
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "560px" }}>
      <Link to={`/orders/${orderId}`} className="back-link">
        ← Back to Order
      </Link>

      <div className="form-card" style={{ marginTop: "20px" }}>
        <h1 className="form-title">Complete Payment</h1>
        <p className="form-subtitle">
          Secure checkout for your Campus Marketplace order
        </p>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            className="detail-row"
            style={{ borderBottom: "none", paddingBottom: "6px" }}
          >
            <span className="detail-label">Item</span>
            <span className="detail-value" style={{ fontWeight: "600" }}>
              {order.listing_title || `Listing #${order.listing}`}
            </span>
          </div>

          <div
            className="detail-row"
            style={{ paddingTop: "6px", borderBottom: "none" }}
          >
            <span className="detail-label">Total</span>
            <span
              className="detail-value"
              style={{
                fontSize: "22px",
                fontWeight: "800",
                color: "#16a34a",
              }}
            >
              ${parseFloat(order.offered_price).toFixed(2)}
            </span>
          </div>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ fontSize: "48px", margin: 0 }}>✅</p>
            <h3 style={{ color: "#16a34a", marginTop: "12px" }}>
              Payment Successful!
            </h3>
            <p style={{ color: "#555", fontSize: "14px" }}>
              Redirecting to your order...
            </p>
          </div>
        ) : (
          <>
            <p
              style={{
                fontWeight: "700",
                color: "#003b70",
                marginBottom: "10px",
              }}
            >
              Card Details
            </p>

            <Elements stripe={stripePromise}>
              <PaymentForm
                order={order}
                onSuccess={handleSuccess}
                onError={(msg) => setError(msg)}
              />
            </Elements>

            {error && (
              <p className="error" style={{ marginTop: "12px" }}>
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}