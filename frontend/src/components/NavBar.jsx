import { Link, NavLink, useNavigate } from "react-router-dom";

export default function NavBar() {
  const navigate = useNavigate();
  const isLoggedIn = Boolean(localStorage.getItem("accessToken"));

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/login");
  }

  return (
    <header className="nav">
      <Link to="/" className="nav-logo">
        Campus Marketplace
      </Link>

      <nav className="nav-links">
        <NavLink to="/" className="nav-link">
          Home
        </NavLink>

        <NavLink to="/listings" className="nav-link">
          Listings
        </NavLink>

        {isLoggedIn ? (
          <>
            <NavLink to="/profile" className="nav-link">
              Profile
            </NavLink>

            <button className="nav-button" type="button" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className="nav-link">
              Login
            </NavLink>

            <NavLink to="/signup" className="nav-link">
              Sign Up
            </NavLink>
          </>
        )}
      </nav>
    </header>
  );
}