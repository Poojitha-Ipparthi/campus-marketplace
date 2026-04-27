import { Link, NavLink, useNavigate } from "react-router-dom";

export default function NavBar() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/");
  }

  return (
    <header className="nav">
      <Link to="/" className="nav-logo">
        Campus Marketplace
      </Link>

      <nav className="nav-links">
        <NavLink to="/" className="nav-link">
          Listings
        </NavLink>

        <NavLink to="/orders" className="nav-link">
          Orders
        </NavLink>

        <NavLink to="/messages" className="nav-link">
          Messages
        </NavLink>

        <NavLink to="/profile" className="nav-link">
          Profile
        </NavLink>

        <button className="nav-button" onClick={logout}>
          Logout
        </button>
      </nav>
    </header>
  );
}