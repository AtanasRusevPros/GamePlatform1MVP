import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export function AppFrame() {
  const auth = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="shell-header">
        <Link className="brand-lockup" to="/app">
          <span className="brand-kicker">Kids Games Platform</span>
          <strong>{auth.user?.displayName ?? "Player"}</strong>
        </Link>
        <nav className="shell-nav" aria-label="Primary">
          <NavLink to="/app">Main Menu</NavLink>
          <NavLink to="/games/flashcards">Flash Cards</NavLink>
        </nav>
        <button className="ghost-button" type="button" onClick={() => void handleLogout()}>
          Log out
        </button>
      </header>
      <Outlet />
    </div>
  );
}

