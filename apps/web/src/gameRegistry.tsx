import type { ReactNode } from "react";
import { createGameRegistry, type GameModule } from "@kids-games/game-sdk";

export interface WebGameModule extends GameModule {
  summary: string;
  marketingNote: string;
  hero: ReactNode;
}

export const mainMenuSections = ["Auth", "Games", "Points", "Settings"] as const;

const flashCardsModule: WebGameModule = {
  id: "flashcards",
  title: "Flash Cards",
  summary: "Vocabulary practice with deck progress, known markers, and session shuffle.",
  marketingNote: "Frontend gameplay preview is active now while persistent deck APIs are still being built.",
  requiresAuth: true,
  routes: [
    {
      path: "/games/flashcards"
    }
  ],
  hero: (
    <div className="game-hero">
      <p className="eyebrow">First Game Module</p>
      <h2>Flash cards for early English vocabulary</h2>
      <p>Built as the MVP reference game and ready for backend deck integration next.</p>
    </div>
  )
};

const registry = createGameRegistry([flashCardsModule]);

export const gameRegistry = {
  list: (): readonly WebGameModule[] => registry.list() as readonly WebGameModule[],
  getById: (id: string): WebGameModule | undefined => registry.getById(id) as WebGameModule | undefined
};
