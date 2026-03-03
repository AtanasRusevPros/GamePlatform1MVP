import { describe, expect, it } from "vitest";
import { createGameRegistry } from "@kids-games/game-sdk";

describe("game registry", () => {
  it("sorts modules by title", () => {
    const registry = createGameRegistry([
      { id: "zeta", title: "Zoo", requiresAuth: false, routes: [] },
      { id: "alpha", title: "Animals", requiresAuth: true, routes: [] }
    ]);

    expect(registry.list().map((module) => module.id)).toEqual(["alpha", "zeta"]);
  });
});

