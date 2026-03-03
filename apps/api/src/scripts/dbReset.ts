import { closeDatabase, createDatabaseContext } from "../db/context.js";
import { runMigrations } from "../db/migrations.js";
import { seedDatabase } from "../db/seed.js";
import { loadApiConfig } from "../config.js";

const config = loadApiConfig();
const db = await createDatabaseContext(config);

try {
  await db.pool.query("drop schema public cascade; create schema public;");
  await runMigrations(db.pool);
  await seedDatabase(db.pool);
  console.log("Database reset completed.");
} finally {
  await closeDatabase(db);
}

