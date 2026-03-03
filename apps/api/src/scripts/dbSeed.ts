import { closeDatabase, createDatabaseContext } from "../db/context.js";
import { runMigrations } from "../db/migrations.js";
import { seedDatabase } from "../db/seed.js";
import { loadApiConfig } from "../config.js";

const config = loadApiConfig();
const db = await createDatabaseContext(config);

try {
  await runMigrations(db.pool);
  await seedDatabase(db.pool);
  console.log("Seed completed.");
} finally {
  await closeDatabase(db);
}

