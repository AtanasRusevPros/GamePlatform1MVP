import { closeDatabase, createDatabaseContext } from "../db/context.js";
import { runMigrations } from "../db/migrations.js";
import { loadApiConfig } from "../config.js";

const config = loadApiConfig();
const db = await createDatabaseContext(config);

try {
  const applied = await runMigrations(db.pool);
  console.log(`Applied ${applied.length} migration(s).`);
} finally {
  await closeDatabase(db);
}

