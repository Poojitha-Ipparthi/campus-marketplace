import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cancelOrder, getOrders } from "../api/ordersApi";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const res = await getOrders();
      setOrders(res.data);
    } catch {
      setError("Could not load orders. Make sure you are logged in.");
    }
  }

  async function handleCancel(id) {
    try {
      await cancelOrder(id);
      loadOrders();
    } catch {
      setError("Could not cancel order");
    }
  }

  return (
    <div>
      <header className="header">
        <h1>My Orders</h1>
        <p>View order history and order status</p>
      </header>

      <main className="container">
        <Link to="/" className="text-link">
          ← Back to listings
        </Link>

        {error && <p className="error">{error}</p>}

        {orders.length === 0 && <p>No orders yet.</p>}

        <div className="order-list">
          {orders.map((order) => (
            <div key={order.id} className="card">
              <h3 className="title">Order #{order.id}</h3>

              <p>Listing ID: {order.listing}</p>
              <p>Offered Price: ${order.offered_price}</p>
              <p>Status: {order.status}</p>

              <Link className="button-link" to={`/listings/${order.listing}`}>
                View Listing
              </Link>

              {order.status === "PENDING" && (
                <button
                  className="danger-button"
                  onClick={() => handleCancel(order.id)}
                >
                  Cancel Order
                </button>
              )}

              {order.status === "ACCEPTED" && (
                <Link className="button-link" to={`/checkout/${order.id}`}>
                  Continue Checkout
                </Link>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}