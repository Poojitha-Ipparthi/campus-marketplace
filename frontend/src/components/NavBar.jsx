import { Link, NavLink } from "react-router-dom";

export default function NavBar() {
  return (
    <header className="nav">
      <Link to="/" className="nav-logo">
        Campus Marketplace
      </Link>

      <nav className="nav-links">
        <NavLink to="/" className="nav-link">
          Home
        </NavLink>

        <NavLink to="/profile" className="nav-link">
          Profile
        </NavLink>
      </nav>
    </header>
  );
}