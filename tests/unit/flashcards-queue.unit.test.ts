import { describe, expect, it, vi } from "vitest";
import type { ApiClient } from "@kids-games/shared";
import { enqueueOperation, flushQueue } from "../../apps/web/src/flashcards/offlineQueue";
import { applyKnownLocally, applyPositionLocally } from "../../apps/web/src/flashcards/progress";

describe("flashcards queue helpers", () => {
  it("keeps only the latest queued position per deck and deduplicates known cards", () => {
    const queue = enqueueOperation(
      enqueueOperation(
        enqueueOperation([], { id: "1", type: "savePosition", deckId: "deck-1", lastIndex: 1 }),
        { id: "2", type: "savePosition", deckId: "deck-1", lastIndex: 4 }
      ),
      { id: "3", type: "markKnown", deckId: "deck-1", cardId: "card-1" }
    );

    const finalQueue = enqueueOperation(queue, { id: "4", type: "markKnown", deckId: "deck-1", cardId: "card-1" });

    expect(finalQueue).toEqual([
      { id: "2", type: "savePosition", deckId: "deck-1", lastIndex: 4 },
      { id: "3", type: "markKnown", deckId: "deck-1", cardId: "card-1" }
    ]);
  });

  it("flushes operations and keeps failed entries for retry", async () => {
    const client: ApiClient = {
      register: vi.fn(),
      login: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
      me: vi.fn(),
      listGames: vi.fn(),
      listFlashcardDecks: vi.fn(),
      listFlashcardCards: vi.fn(),
      getDeckProgress: vi.fn(),
      saveDeckPosition: vi.fn().mockResolvedValue({
        deckId: "deck-1",
        lastIndex: 2,
        knownCount: 0,
        knownCardIds: [],
        updatedAt: new Date(0).toISOString()
      }),
      markKnown: vi.fn().mockRejectedValue(new Error("offline"))
    };

    const result = await flushQueue({
      accessToken: "token",
      client,
      operations: [
        { id: "1", type: "savePosition", deckId: "deck-1", lastIndex: 2 },
        { id: "2", type: "markKnown", deckId: "deck-1", cardId: "card-1" }
      ]
    });

    expect(result.latestProgressByDeckId["deck-1"]?.lastIndex).toBe(2);
    expect(result.remaining).toEqual([{ id: "2", type: "markKnown", deckId: "deck-1", cardId: "card-1" }]);
  });
});

describe("flashcards optimistic progress helpers", () => {
  it("updates position and known cards locally", () => {
    const positioned = applyPositionLocally(null, "deck-1", 3);
    const known = applyKnownLocally(positioned, "card-1");

    expect(positioned.lastIndex).toBe(3);
    expect(known?.knownCount).toBe(1);
    expect(known?.knownCardIds).toContain("card-1");
  });
});
