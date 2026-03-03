import { describe, expect, it } from "vitest";
import { createApp } from "@kids-games/api";

const seededDeckId = "7f40b7c7-b44d-40da-8a0e-c16768d1d001";
const seededCardId = "f4969318-57c2-4ec1-b81a-cbf688854001";

describe("flashcards api", () => {
  it("lists games, decks, and cards", async () => {
    const app = await createApp({ config: { logLevel: "fatal" } });

    const gamesResponse = await app.inject({
      method: "GET",
      url: "/games"
    });

    expect(gamesResponse.statusCode).toBe(200);
    expect(gamesResponse.json().games[0].id).toBe("flashcards");

    const decksResponse = await app.inject({
      method: "GET",
      url: "/flashcards/decks?lang=en"
    });

    expect(decksResponse.statusCode).toBe(200);
    expect(decksResponse.json().decks[0].id).toBe(seededDeckId);

    const cardsResponse = await app.inject({
      method: "GET",
      url: `/flashcards/decks/${seededDeckId}/cards`
    });

    expect(cardsResponse.statusCode).toBe(200);
    expect(cardsResponse.json().cards).toHaveLength(4);

    await app.close();
  });

  it("requires auth for progress and supports save/known flows", async () => {
    const app = await createApp({ config: { logLevel: "fatal" } });
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "player@example.com",
        password: "password123",
        displayName: "Player One"
      }
    });

    const auth = registerResponse.json();

    const unauthorized = await app.inject({
      method: "GET",
      url: `/flashcards/decks/${seededDeckId}/progress`
    });

    expect(unauthorized.statusCode).toBe(401);

    const progressResponse = await app.inject({
      method: "GET",
      url: `/flashcards/decks/${seededDeckId}/progress`,
      headers: {
        authorization: `Bearer ${auth.tokens.accessToken}`
      }
    });

    expect(progressResponse.statusCode).toBe(200);
    expect(progressResponse.json().progress.lastIndex).toBe(0);

    const savePositionResponse = await app.inject({
      method: "POST",
      url: `/flashcards/decks/${seededDeckId}/position`,
      headers: {
        authorization: `Bearer ${auth.tokens.accessToken}`,
        "idempotency-key": "position-1"
      },
      payload: {
        lastIndex: 2
      }
    });

    expect(savePositionResponse.statusCode).toBe(200);
    expect(savePositionResponse.json().progress.lastIndex).toBe(2);

    const markKnownResponse = await app.inject({
      method: "POST",
      url: `/flashcards/decks/${seededDeckId}/known`,
      headers: {
        authorization: `Bearer ${auth.tokens.accessToken}`,
        "idempotency-key": "known-1"
      },
      payload: {
        cardId: seededCardId
      }
    });

    expect(markKnownResponse.statusCode).toBe(200);
    expect(markKnownResponse.json().progress.knownCount).toBe(1);
    expect(markKnownResponse.json().progress.knownCardIds).toContain(seededCardId);

    await app.close();
  });

  it("rejects invalid payloads and replays idempotent writes", async () => {
    const app = await createApp({ config: { logLevel: "fatal" } });
    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "player@example.com",
        password: "password123",
        displayName: "Player One"
      }
    });

    const auth = registerResponse.json();

    const invalidPayload = await app.inject({
      method: "POST",
      url: `/flashcards/decks/${seededDeckId}/position`,
      headers: {
        authorization: `Bearer ${auth.tokens.accessToken}`,
        "idempotency-key": "invalid-position"
      },
      payload: {
        lastIndex: -1
      }
    });

    expect(invalidPayload.statusCode).toBe(400);

    const missingIdempotency = await app.inject({
      method: "POST",
      url: `/flashcards/decks/${seededDeckId}/known`,
      headers: {
        authorization: `Bearer ${auth.tokens.accessToken}`
      },
      payload: {
        cardId: seededCardId
      }
    });

    expect(missingIdempotency.statusCode).toBe(400);

    const firstResponse = await app.inject({
      method: "POST",
      url: `/flashcards/decks/${seededDeckId}/known`,
      headers: {
        authorization: `Bearer ${auth.tokens.accessToken}`,
        "idempotency-key": "known-repeat"
      },
      payload: {
        cardId: seededCardId
      }
    });

    const secondResponse = await app.inject({
      method: "POST",
      url: `/flashcards/decks/${seededDeckId}/known`,
      headers: {
        authorization: `Bearer ${auth.tokens.accessToken}`,
        "idempotency-key": "known-repeat"
      },
      payload: {
        cardId: seededCardId
      }
    });

    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(200);
    expect(secondResponse.json()).toEqual(firstResponse.json());

    await app.close();
  });
});
