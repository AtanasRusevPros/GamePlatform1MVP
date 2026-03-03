import type { FastifyReply, FastifyRequest } from "fastify";
import {
  authSuccessResponseSchema,
  createHealthResponse,
  gamesRoutePath,
  getProgressResponseSchema,
  healthRoutePath,
  listCardsResponseSchema,
  listDecksResponseSchema,
  listGamesResponseSchema,
  loginRequestSchema,
  loginRoutePath,
  markKnownRequestSchema,
  logoutRequestSchema,
  logoutResponseSchema,
  logoutRoutePath,
  meRoutePath,
  savePositionRequestSchema,
  refreshRequestSchema,
  refreshRoutePath,
  registerRequestSchema,
  registerRoutePath,
  writeProgressResponseSchema
} from "@kids-games/shared";
import { AuthConflictError, AuthService, InvalidCredentialsError, InvalidRefreshTokenError } from "./auth/service.js";

export async function registerRoutes(app: FastifyRequest["server"], authService: AuthService): Promise<void> {
  app.get(healthRoutePath, async () => createHealthResponse("ok"));
  app.get(gamesRoutePath, async () => {
    const games = await app.db.repositories.flashcards.listEnabledGames();
    return listGamesResponseSchema.parse({ games });
  });

  app.get("/flashcards/decks", async (request, reply) => {
    const languageCode = parseLanguageCode(reply, request.query);

    if (!languageCode) {
      return;
    }

    const decks = await app.db.repositories.flashcards.listDecks(languageCode);
    return listDecksResponseSchema.parse({ decks });
  });

  app.get("/flashcards/decks/:deckId/cards", async (request) => {
    const deckId = (request.params as { deckId: string }).deckId;
    const cards = await app.db.repositories.flashcards.listCards(deckId);
    return listCardsResponseSchema.parse({ cards });
  });

  app.post(registerRoutePath, async (request, reply) => {
    const payload = parseBody(reply, registerRequestSchema, request.body);

    if (!payload) {
      return;
    }

    try {
      return authSuccessResponseSchema.parse(await authService.register(payload));
    } catch (error) {
      if (error instanceof AuthConflictError) {
        return reply.code(409).send({ message: error.message });
      }

      throw error;
    }
  });

  app.post(loginRoutePath, async (request, reply) => {
    const payload = parseBody(reply, loginRequestSchema, request.body);

    if (!payload) {
      return;
    }

    try {
      return authSuccessResponseSchema.parse(await authService.login(payload));
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        return reply.code(401).send({ message: error.message });
      }

      throw error;
    }
  });

  app.post(refreshRoutePath, async (request, reply) => {
    const payload = parseBody(reply, refreshRequestSchema, request.body);

    if (!payload) {
      return;
    }

    try {
      return authSuccessResponseSchema.parse(await authService.refresh(payload));
    } catch (error) {
      if (error instanceof InvalidRefreshTokenError) {
        return reply.code(401).send({ message: error.message });
      }

      throw error;
    }
  });

  app.post(logoutRoutePath, async (request, reply) => {
    const payload = parseBody(reply, logoutRequestSchema, request.body);

    if (!payload) {
      return;
    }

    try {
      await authService.logout(payload);
      return logoutResponseSchema.parse({ success: true });
    } catch (error) {
      if (error instanceof InvalidRefreshTokenError) {
        return reply.code(401).send({ message: error.message });
      }

      throw error;
    }
  });

  app.get(meRoutePath, { preHandler: [app.authenticate] }, async (request) => ({
    user: request.user
  }));

  app.get("/flashcards/decks/:deckId/progress", { preHandler: [app.authenticate] }, async (request) => {
    const deckId = (request.params as { deckId: string }).deckId;
    const progress = await getOrCreateProgress(app, request.user.id, deckId);
    return getProgressResponseSchema.parse({ progress });
  });

  app.post("/flashcards/decks/:deckId/known", { preHandler: [app.authenticate] }, async (request, reply) => {
    const deckId = (request.params as { deckId: string }).deckId;
    const payload = parseBody(reply, markKnownRequestSchema, request.body);

    if (!payload) {
      return;
    }

    const idempotencyKey = requireIdempotencyKey(reply, request.headers["idempotency-key"]);

    if (!idempotencyKey) {
      return;
    }

    const scope = `${request.user.id}:known:${deckId}`;
    const cached = await app.db.repositories.idempotency.find<{ progress: Awaited<ReturnType<typeof getOrCreateProgress>> }>(
      scope,
      idempotencyKey
    );

    if (cached) {
      return reply.code(cached.statusCode).send(cached.response);
    }

    await app.db.repositories.flashcards.markKnown(request.user.id, deckId, payload.cardId);
    const response = writeProgressResponseSchema.parse({
      progress: await getOrCreateProgress(app, request.user.id, deckId)
    });

    await app.db.repositories.idempotency.save(scope, idempotencyKey, 200, response);
    return response;
  });

  app.post("/flashcards/decks/:deckId/position", { preHandler: [app.authenticate] }, async (request, reply) => {
    const deckId = (request.params as { deckId: string }).deckId;
    const payload = parseBody(reply, savePositionRequestSchema, request.body);

    if (!payload) {
      return;
    }

    const idempotencyKey = requireIdempotencyKey(reply, request.headers["idempotency-key"]);

    if (!idempotencyKey) {
      return;
    }

    const scope = `${request.user.id}:position:${deckId}`;
    const cached = await app.db.repositories.idempotency.find<{ progress: Awaited<ReturnType<typeof getOrCreateProgress>> }>(
      scope,
      idempotencyKey
    );

    if (cached) {
      return reply.code(cached.statusCode).send(cached.response);
    }

    await app.db.repositories.flashcards.saveProgressPosition(request.user.id, deckId, payload.lastIndex);
    const response = writeProgressResponseSchema.parse({
      progress: await getOrCreateProgress(app, request.user.id, deckId)
    });

    await app.db.repositories.idempotency.save(scope, idempotencyKey, 200, response);
    return response;
  });
}

function parseBody<T>(
  reply: FastifyReply,
  schema: { safeParse(input: unknown): { success: true; data: T } | { success: false; error: { flatten(): { fieldErrors: Record<string, string[]> } } } },
  body: unknown
): T | undefined {
  const result = schema.safeParse(body);

  if (result.success) {
    return result.data;
  }

  reply.code(400).send({
    message: "Invalid request body",
    errors: result.error.flatten().fieldErrors
  });

  return undefined;
}

function parseLanguageCode(reply: FastifyReply, query: unknown): string | undefined {
  if (!query || typeof query !== "object" || !("lang" in query) || typeof query.lang !== "string" || !query.lang.trim()) {
    reply.code(400).send({
      message: "Missing lang query parameter"
    });

    return undefined;
  }

  return query.lang.trim().toLowerCase();
}

function requireIdempotencyKey(reply: FastifyReply, headerValue: string | string[] | undefined): string | undefined {
  const key = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!key) {
    reply.code(400).send({
      message: "Missing Idempotency-Key header"
    });

    return undefined;
  }

  return key;
}

async function getOrCreateProgress(app: FastifyRequest["server"], userId: string, deckId: string) {
  const existingProgress = await app.db.repositories.flashcards.getProgress(userId, deckId);

  if (existingProgress) {
    return {
      deckId: existingProgress.deckId,
      lastIndex: existingProgress.lastIndex,
      knownCount: existingProgress.knownCount,
      knownCardIds: existingProgress.knownCardIds,
      updatedAt: existingProgress.updatedAt
    };
  }

  await app.db.repositories.flashcards.saveProgressPosition(userId, deckId, 0);
  const createdProgress = await app.db.repositories.flashcards.getProgress(userId, deckId);

  if (!createdProgress) {
    throw new Error("Progress record could not be created");
  }

  return {
    deckId: createdProgress.deckId,
    lastIndex: createdProgress.lastIndex,
    knownCount: createdProgress.knownCount,
    knownCardIds: createdProgress.knownCardIds,
    updatedAt: createdProgress.updatedAt
  };
}
