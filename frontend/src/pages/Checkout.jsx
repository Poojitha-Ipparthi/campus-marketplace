import { Link, useParams } from "react-router-dom";

export default function Checkout() {
  const { orderId } = useParams();

  return (
    <div>
      <header className="header">
        <h1>Checkout</h1>
        <p>Order #{orderId}</p>
      </header>

      <main className="container">
        <div className="card">
          <h2>Checkout Placeholder</h2>

          <p>
            Your order was created successfully. Real Stripe payment integration
            will be connected by your teammate.
          </p>

          <p>
            For now, this screen proves the buyer flow:
            listing → order → checkout.
          </p>

          <Link className="button-link" to="/orders">
            View My Orders
          </Link>

          <Link className="secondary-link" to="/">
            Continue Browsing
          </Link>
        </div>
      </main>
    </div>
  );
}