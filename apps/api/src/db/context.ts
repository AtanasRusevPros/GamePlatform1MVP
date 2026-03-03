import { newDb } from "pg-mem";
import { Pool } from "pg";
import type { ApiConfig } from "../config.js";
import { DatabaseAuthRepository } from "./repositories/authRepository.js";
import { FlashcardsRepository } from "./repositories/flashcardsRepository.js";
import { IdempotencyRepository } from "./repositories/idempotencyRepository.js";
import { runMigrations } from "./migrations.js";
import { seedDatabase } from "./seed.js";

export interface DatabaseContext {
  mode: "memory" | "postgres";
  pool: Pool;
  repositories: {
    auth: DatabaseAuthRepository;
    flashcards: FlashcardsRepository;
    idempotency: IdempotencyRepository;
  };
}

export async function createDatabaseContext(config: Pick<ApiConfig, "databaseMode" | "databaseUrl">): Promise<DatabaseContext> {
  let pool: Pool;

  if (config.databaseMode === "postgres") {
    if (!config.databaseUrl) {
      throw new Error("DATABASE_URL is required when DATABASE_MODE=postgres");
    }

    pool = new Pool({
      connectionString: config.databaseUrl
    });
  } else {
    const memoryDatabase = newDb({
      autoCreateForeignKeyIndices: true
    });
    const adapter = memoryDatabase.adapters.createPg();
    pool = new adapter.Pool();
  }

  return {
    mode: config.databaseMode,
    pool,
    repositories: {
      auth: new DatabaseAuthRepository(pool),
      flashcards: new FlashcardsRepository(pool),
      idempotency: new IdempotencyRepository(pool)
    }
  };
}

export async function initializeDatabase(
  db: DatabaseContext,
  options: { runMigrations: boolean; runSeed: boolean }
): Promise<void> {
  if (options.runMigrations) {
    await runMigrations(db.pool);
  }

  if (options.runSeed) {
    await seedDatabase(db.pool);
  }
}

export async function closeDatabase(db: DatabaseContext): Promise<void> {
  await db.pool.end();
}

export async function waitForDatabaseConnection(
  db: DatabaseContext,
  options: { retries: number; delayMs: number }
): Promise<void> {
  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      await db.pool.query("select 1");
      return;
    } catch (error) {
      if (attempt === options.retries) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
  }
}
