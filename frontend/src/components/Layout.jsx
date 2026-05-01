/**
 * Page wrapper that conditionally renders the NavBar.
 * The NavBar is hidden on auth-only screens (login, signup, verify)
 * where navigation links are not relevant.
 */

import { useLocation } from "react-router-dom";
import NavBar from "./NavBar";

export default function Layout({ children }) {
  const location = useLocation();

  const hideNavRoutes = ["/login", "/signup", "/verify"];
  const hideNav = hideNavRoutes.includes(location.pathname);

  return (
    <>
      {!hideNav && <NavBar />}
      {children}
    </>
  );
}