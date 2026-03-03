import {
  authMeResponseSchema,
  authSuccessResponseSchema,
  logoutResponseSchema,
  type AuthMeResponse,
  type AuthSuccessResponse,
  type LoginRequest,
  type LogoutRequest,
  type LogoutResponse,
  type RefreshRequest,
  type RegisterRequest
} from "../contracts/auth.js";
import {
  getProgressResponseSchema,
  listCardsResponseSchema,
  listDecksResponseSchema,
  listGamesResponseSchema,
  markKnownRequestSchema,
  savePositionRequestSchema,
  writeProgressResponseSchema,
  type MarkKnownRequest,
  type ProgressDto,
  type SavePositionRequest
} from "../contracts/flashcards.js";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly details?: unknown
  ) {
    super(message);
  }
}

export interface ApiClient {
  register(payload: RegisterRequest): Promise<AuthSuccessResponse>;
  login(payload: LoginRequest): Promise<AuthSuccessResponse>;
  refresh(payload: RefreshRequest): Promise<AuthSuccessResponse>;
  logout(payload: LogoutRequest): Promise<LogoutResponse>;
  me(accessToken: string): Promise<AuthMeResponse>;
  listGames(): Promise<ReturnType<typeof listGamesResponseSchema.parse>>;
  listFlashcardDecks(languageCode: string): Promise<ReturnType<typeof listDecksResponseSchema.parse>>;
  listFlashcardCards(deckId: string): Promise<ReturnType<typeof listCardsResponseSchema.parse>>;
  getDeckProgress(deckId: string, accessToken: string): Promise<ProgressDto>;
  saveDeckPosition(deckId: string, accessToken: string, payload: SavePositionRequest, idempotencyKey: string): Promise<ProgressDto>;
  markKnown(deckId: string, accessToken: string, payload: MarkKnownRequest, idempotencyKey: string): Promise<ProgressDto>;
}

type SchemaParser<T> = {
  parse(input: unknown): T;
};

export function createApiClient(baseUrl: string): ApiClient {
  return {
    register: (payload) => request(`${baseUrl}/auth/register`, { method: "POST", body: payload }, authSuccessResponseSchema),
    login: (payload) => request(`${baseUrl}/auth/login`, { method: "POST", body: payload }, authSuccessResponseSchema),
    refresh: (payload) => request(`${baseUrl}/auth/refresh`, { method: "POST", body: payload }, authSuccessResponseSchema),
    logout: (payload) => request(`${baseUrl}/auth/logout`, { method: "POST", body: payload }, logoutResponseSchema),
    me: (accessToken) =>
      request(
        `${baseUrl}/auth/me`,
        {
          method: "GET",
          headers: {
            authorization: `Bearer ${accessToken}`
          }
        },
        authMeResponseSchema
      ),
    listGames: () => request(`${baseUrl}/games`, { method: "GET" }, listGamesResponseSchema),
    listFlashcardDecks: (languageCode) =>
      request(`${baseUrl}/flashcards/decks?lang=${encodeURIComponent(languageCode)}`, { method: "GET" }, listDecksResponseSchema),
    listFlashcardCards: (deckId) =>
      request(`${baseUrl}/flashcards/decks/${deckId}/cards`, { method: "GET" }, listCardsResponseSchema),
    getDeckProgress: async (deckId, accessToken) =>
      (
        await request(
          `${baseUrl}/flashcards/decks/${deckId}/progress`,
          {
            method: "GET",
            headers: {
              authorization: `Bearer ${accessToken}`
            }
          },
          getProgressResponseSchema
        )
      ).progress,
    saveDeckPosition: async (deckId, accessToken, payload, idempotencyKey) =>
      (
        await request(
          `${baseUrl}/flashcards/decks/${deckId}/position`,
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${accessToken}`,
              "idempotency-key": idempotencyKey
            },
            body: savePositionRequestSchema.parse(payload)
          },
          writeProgressResponseSchema
        )
      ).progress,
    markKnown: async (deckId, accessToken, payload, idempotencyKey) =>
      (
        await request(
          `${baseUrl}/flashcards/decks/${deckId}/known`,
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${accessToken}`,
              "idempotency-key": idempotencyKey
            },
            body: markKnownRequestSchema.parse(payload)
          },
          writeProgressResponseSchema
        )
      ).progress
  };
}

async function request<T>(
  url: string,
  init: { method: string; body?: unknown; headers?: Record<string, string> },
  schema: SchemaParser<T>
): Promise<T> {
  const requestInit: RequestInit = {
    method: init.method,
    headers: {
      "content-type": "application/json",
      ...init.headers
    }
  };

  if (init.body) {
    requestInit.body = JSON.stringify(init.body);
  }

  const response = await fetch(url, requestInit);

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : `Request failed with status ${response.status}`;

    throw new ApiClientError(message, response.status, payload);
  }

  return schema.parse(payload);
}
