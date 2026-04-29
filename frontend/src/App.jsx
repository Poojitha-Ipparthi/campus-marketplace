import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Listings from "./pages/Listings";
import ListingDetail from "./pages/ListingDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Verification from "./pages/Verification";
import UserProfile from "./pages/UserProfile";
import PublicProfile from "./pages/PublicProfile";

import CreateListing from "./pages/CreateListing";
import EditListing from "./pages/EditListing";
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
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify" element={<Verification />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Regular user routes */}
          <Route path="/" element={<ProtectedRoute userOnly><Home /></ProtectedRoute>} />
          <Route path="/listings" element={<ProtectedRoute userOnly><Listings /></ProtectedRoute>} />
          <Route path="/listings/:id" element={<ProtectedRoute userOnly><ListingDetail /></ProtectedRoute>} />
          <Route path="/listings/:id/edit" element={<ProtectedRoute userOnly><EditListing /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute userOnly><UserProfile /></ProtectedRoute>} />
          <Route path="/users/:id" element={<ProtectedRoute userOnly><PublicProfile /></ProtectedRoute>} />
          <Route path="/create-listing" element={<ProtectedRoute userOnly><CreateListing /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute userOnly><OrderHistory /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute userOnly><OrderDetail /></ProtectedRoute>} />
          <Route path="/checkout/:orderId" element={<ProtectedRoute userOnly><Checkout /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute userOnly><Messages /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute userOnly><Report /></ProtectedRoute>} />
          <Route path="/reviews/create/:orderId" element={<ProtectedRoute userOnly><LeaveReview /></ProtectedRoute>} />

          {/* Admin-only route */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}