import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";

import Home from "./pages/Home";
import Listings from "./pages/Listings";
import ListingDetail from "./pages/ListingDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Verification from "./pages/Verification";
import UserProfile from "./pages/UserProfile";
import PublicProfile from "./pages/PublicProfile";

import CreateListing from "./pages/CreateListing";
import OrderHistory from "./pages/OrderHistory";
import OrderDetail from "./pages/OrderDetail";
import Checkout from "./pages/Checkout";
import Messages from "./pages/Messages";
import Report from "./pages/Report";
import LeaveReview from "./pages/LeaveReview";
import ForgotPassword from "./pages/ForgotPassword";
import AdminDashboard from "./pages/AdminDashboard";


export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/listings/:id" element={<ListingDetail />} />

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify" element={<Verification />} />

          <Route path="/profile" element={<UserProfile />} />
          <Route path="/users/:id" element={<PublicProfile />} />
          <Route path="/create-listing" element={<CreateListing />} />
          <Route path="/orders" element={<OrderHistory />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/checkout/:orderId" element={<Checkout />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/report" element={<Report />} />
          <Route path="/reviews/create/:orderId" element={<LeaveReview />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}