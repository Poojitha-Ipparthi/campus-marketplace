import { Link, NavLink } from "react-router-dom";

export default function NavBar() {
  const isLoggedIn = Boolean(localStorage.getItem("accessToken"));

  return (
    <header className="nav">
      <Link to="/" className="nav-logo">
        Campus Marketplace
      </Link>

      <nav className="nav-links">
        <NavLink to="/" className="nav-link">Home</NavLink>

        {isLoggedIn ? (
          <>
            <NavLink to="/orders" className="nav-link">Orders</NavLink>
            <NavLink to="/messages" className="nav-link">Messages</NavLink>
            <NavLink to="/create-listing" className="nav-link">+ Create a Listing</NavLink>
            <NavLink to="/profile" className="nav-link">Profile</NavLink>
          </>
        ) : (
          <>
            <NavLink to="/login" className="nav-link">Login</NavLink>
            <NavLink to="/signup" className="nav-link">Sign Up</NavLink>
            {localStorage.getItem("isStaff") === "true" && (
              <NavLink to="/admin" className="nav-link">Admin</NavLink>)}
          </>
        )}
      </nav>
    </header>
  );
}