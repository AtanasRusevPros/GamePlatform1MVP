import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { ApiClient, AuthTokens, AuthUser } from "@kids-games/shared";
import { ApiClientError } from "@kids-games/shared";
import { AppRoutes } from "../../apps/web/src/AppRoutes";
import { AuthProvider } from "../../apps/web/src/auth/AuthProvider";
import { gameRegistry } from "../../apps/web/src/gameRegistry";

const mockUser: AuthUser = {
  id: "5ee8ff5f-6190-4e4c-a2b7-557488420001",
  email: "player@example.com",
  displayName: "Player One"
};

const mockTokens: AuthTokens = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  tokenType: "Bearer",
  expiresInSeconds: 900
};

describe("web app", () => {
  it("protects private routes by redirecting unauthenticated users to login", async () => {
    renderWithProviders("/app");

    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
  });

  it("submits login and lands on the main menu", async () => {
    const client = createMockClient({
      login: vi.fn().mockResolvedValue({
        user: mockUser,
        tokens: mockTokens
      })
    });

    renderWithProviders("/login", client);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "player@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Choose a game" })).toBeInTheDocument();
    });

    expect(screen.getByText("Flash Cards")).toBeInTheDocument();
  });

  it("shows backend errors on the auth screen", async () => {
    const client = createMockClient({
      login: vi.fn().mockRejectedValue(new ApiClientError("Invalid email or password", 401))
    });

    renderWithProviders("/login", client);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "player@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
  });

  it("registers flashcards in the game registry", () => {
    const module = gameRegistry.getById("flashcards");

    expect(module?.routes[0].path).toBe("/games/flashcards");
    expect(module?.summary).toContain("Vocabulary practice");
  });
});

function renderWithProviders(initialEntry: string, client = createMockClient()) {
  return render(
    <AuthProvider client={client} storage={createMemoryStorage()}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>
  );
}

function createMockClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    listGames: vi.fn().mockResolvedValue({
      games: [{ id: "flashcards", title: "Flash Cards", status: "enabled", createdAt: new Date(0).toISOString() }]
    }),
    listFlashcardDecks: vi.fn().mockResolvedValue({ decks: [] }),
    listFlashcardCards: vi.fn().mockResolvedValue({ cards: [] }),
    getDeckProgress: vi.fn().mockResolvedValue({
      deckId: "7f40b7c7-b44d-40da-8a0e-c16768d1d001",
      lastIndex: 0,
      knownCount: 0,
      knownCardIds: [],
      updatedAt: new Date(0).toISOString()
    }),
    saveDeckPosition: vi.fn(),
    markKnown: vi.fn(),
    ...overrides
  } as ApiClient;
}

function createMemoryStorage() {
  const data = new Map<string, string>();

  return {
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    }
  };
}
