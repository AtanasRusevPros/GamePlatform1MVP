export interface ApiConfig {
  host: string;
  port: number;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  jwtSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  databaseMode: "memory" | "postgres";
  databaseUrl?: string;
  autoMigrate: boolean;
  autoSeed: boolean;
  databaseConnectRetries: number;
  databaseConnectRetryDelayMs: number;
}

export function loadApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const databaseUrl = env.DATABASE_URL;
  const databaseMode = (env.DATABASE_MODE as ApiConfig["databaseMode"] | undefined) ?? (databaseUrl ? "postgres" : "memory");
  const config: ApiConfig = {
    host: env.API_HOST ?? "127.0.0.1",
    port: Number.parseInt(env.API_PORT ?? "3001", 10),
    logLevel: (env.API_LOG_LEVEL as ApiConfig["logLevel"] | undefined) ?? "info",
    jwtSecret: env.JWT_SECRET ?? "local-dev-jwt-secret-change-me",
    accessTokenTtlSeconds: Number.parseInt(env.ACCESS_TOKEN_TTL_SECONDS ?? "900", 10),
    refreshTokenTtlSeconds: Number.parseInt(env.REFRESH_TOKEN_TTL_SECONDS ?? "604800", 10),
    databaseMode,
    autoMigrate: parseBooleanFlag(env.DB_AUTO_MIGRATE, true),
    autoSeed: parseBooleanFlag(env.DB_AUTO_SEED, databaseMode === "memory"),
    databaseConnectRetries: Number.parseInt(env.DB_CONNECT_RETRIES ?? "30", 10),
    databaseConnectRetryDelayMs: Number.parseInt(env.DB_CONNECT_RETRY_DELAY_MS ?? "1000", 10)
  };

  if (databaseUrl) {
    config.databaseUrl = databaseUrl;
  }

  return config;
}

function parseBooleanFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return value === "1" || value.toLowerCase() === "true";
}
