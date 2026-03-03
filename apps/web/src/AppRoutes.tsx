import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { AppFrame } from "./components/AppFrame";
import { LoginPage } from "./pages/LoginPage";
import { MainMenuPage } from "./pages/MainMenuPage";
import { RegisterPage } from "./pages/RegisterPage";
import { FlashcardsPage } from "./pages/FlashcardsPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedLayout />}>
        <Route element={<AppFrame />}>
          <Route path="/app" element={<MainMenuPage />} />
          <Route path="/games/flashcards" element={<FlashcardsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function HomeRedirect() {
  const auth = useAuth();

  if (auth.status === "loading") {
    return <p className="status-banner">Restoring your session...</p>;
  }

  return <Navigate to={auth.status === "authenticated" ? "/app" : "/login"} replace />;
}

function ProtectedLayout() {
  const auth = useAuth();

  if (auth.status === "loading") {
    return <p className="status-banner">Checking your session...</p>;
  }

  if (auth.status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

