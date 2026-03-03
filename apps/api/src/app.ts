import fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import fastifyJwt from "@fastify/jwt";
import {
  healthRoutePath,
  loginRoutePath,
  logoutRoutePath,
  meRoutePath,
  refreshRoutePath,
  registerRoutePath,
  type AuthUser
} from "@kids-games/shared";
import type { AuthRepository } from "./auth/types.js";
import { AuthService } from "./auth/service.js";
import { loadApiConfig, type ApiConfig } from "./config.js";
import {
  closeDatabase,
  createDatabaseContext,
  initializeDatabase,
  waitForDatabaseConnection,
  type DatabaseContext
} from "./db/context.js";
import { registerRoutes } from "./routes.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
    };
    user: AuthUser;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate(request: FastifyRequest): Promise<void>;
    authRepository: AuthRepository;
    db: DatabaseContext;
  }
}

export interface ApiManifest {
  name: string;
  status: "phase-4";
  routes: readonly string[];
}

export interface CreateAppOptions {
  config?: Partial<ApiConfig>;
  authRepository?: AuthRepository;
  db?: DatabaseContext;
}

export async function createApp(options: CreateAppOptions = {}): Promise<FastifyInstance> {
  const config = {
    ...loadApiConfig(),
    ...options.config
  };

  const app = fastify({
    logger: {
      level: config.logLevel
    }
  });

  const db = options.db ?? (await createDatabaseContext(config));

  if (!options.db) {
    await waitForDatabaseConnection(db, {
      retries: config.databaseConnectRetries,
      delayMs: config.databaseConnectRetryDelayMs
    });
    await initializeDatabase(db, {
      runMigrations: config.autoMigrate,
      runSeed: config.autoSeed
    });
  }

  await app.register(fastifyJwt, {
    secret: config.jwtSecret
  });

  const authRepository = options.authRepository ?? db.repositories.auth;

  app.decorate("db", db);
  app.decorate("authRepository", authRepository);
  app.decorate("authenticate", async (request: FastifyRequest) => {
    const tokenPayload = await request.jwtVerify<{ sub: string; email: string }>();
    const currentUser = await authRepository.findUserById(tokenPayload.sub);

    if (!currentUser) {
      const error = new Error("Authenticated user no longer exists");
      Object.assign(error, { statusCode: 401 });
      throw error;
    }

    request.user = {
      id: currentUser.id,
      email: currentUser.email,
      displayName: currentUser.displayName
    };
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, "request failed");

    const statusCode = typeof error === "object" && error && "statusCode" in error ? error.statusCode : undefined;

    if (typeof statusCode === "number") {
      const message =
        typeof error === "object" && error && "message" in error && typeof error.message === "string"
          ? error.message
          : "Request failed";

      return reply.code(statusCode).send({ message });
    }

    return reply.code(500).send({ message: "Internal server error" });
  });

  const authService = new AuthService(app, authRepository, {
    accessTokenTtlSeconds: config.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: config.refreshTokenTtlSeconds
  });

  await registerRoutes(app, authService);
  app.addHook("onClose", async () => {
    if (!options.db) {
      await closeDatabase(db);
    }
  });

  return app;
}

export function createApiManifest(): ApiManifest {
  return {
    name: "kids-games-api",
    status: "phase-4",
    routes: [healthRoutePath, registerRoutePath, loginRoutePath, refreshRoutePath, logoutRoutePath, meRoutePath]
  };
}
