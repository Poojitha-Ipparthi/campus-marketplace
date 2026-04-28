import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";

// Pages YOU own
import Home from "./pages/Home";
import Listings from "./pages/Listings";
import ListingDetail from "./pages/ListingDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Verification from "./pages/Verification";
import UserProfile from "./pages/UserProfile";
import PublicProfile from "./pages/PublicProfile";
import CreateListing from "./pages/CreateListing";

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
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}