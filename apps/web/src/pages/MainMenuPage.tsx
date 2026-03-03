import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { gameRegistry, mainMenuSections } from "../gameRegistry";
import { useAuth } from "../auth/AuthProvider";

interface MenuGameState {
  id: string;
  title: string;
  status?: string;
}

export function MainMenuPage() {
  const auth = useAuth();
  const enabledGames = gameRegistry.list();
  const [games, setGames] = useState<MenuGameState[]>(() =>
    enabledGames.map((module) => ({
      id: module.id,
      title: module.title,
      status: "local"
    }))
  );

  useEffect(() => {
    let isActive = true;

    void auth.client
      .listGames()
      .then((response) => {
        if (!isActive) {
          return;
        }

        setGames(response.games);
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [auth.client]);

  return (
    <main className="dashboard-grid">
      <section className="panel panel-hero">
        <p className="eyebrow">Main Menu</p>
        <h1>Choose a game</h1>
        <p>The platform shell is now wired to auth and route protection. Flash Cards is the first active module.</p>
      </section>
      <section className="panel">
        <h2>Shell sections</h2>
        <ul className="tag-list">
          {mainMenuSections.map((section) => (
            <li key={section}>{section}</li>
          ))}
        </ul>
      </section>
      {enabledGames.map((module) => {
        const serverGame = games.find((game) => game.id === module.id);

        return (
        <section className="panel game-card" key={module.id}>
          {module.hero}
          <p>{module.summary}</p>
          <p className="muted">
            {serverGame ? `Backend status: ${serverGame.status ?? "enabled"}. ` : ""}
            {module.marketingNote}
          </p>
          <Link className="primary-button inline-action" to={module.routes[0]?.path ?? "/app"}>
            Open {module.title}
          </Link>
        </section>
        );
      })}
    </main>
  );
}
