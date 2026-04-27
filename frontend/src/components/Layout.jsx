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