import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import type { Pool } from "pg";

const migrationsDirectory = resolve(process.cwd(), "infra/sql/migrations");

interface MigrationRecordRow {
  filename: string;
  checksum: string;
}

export async function runMigrations(pool: Pick<Pool, "query">): Promise<string[]> {
  await pool.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      checksum text not null,
      applied_at timestamptz not null default current_timestamp
    )
  `);

  const filenames = (await fs.readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  const appliedResult = await pool.query<MigrationRecordRow>("select filename, checksum from schema_migrations");
  const applied = new Map(appliedResult.rows.map((row) => [row.filename, row.checksum]));
  const executed: string[] = [];

  for (const filename of filenames) {
    const sql = await fs.readFile(resolve(migrationsDirectory, filename), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existingChecksum = applied.get(filename);

    if (existingChecksum === checksum) {
      continue;
    }

    if (existingChecksum && existingChecksum !== checksum) {
      throw new Error(`Migration checksum mismatch for ${filename}`);
    }

    await pool.query("begin");

    try {
      await pool.query(sql);
      await pool.query("insert into schema_migrations (filename, checksum) values ($1, $2)", [filename, checksum]);
      await pool.query("commit");
      executed.push(filename);
    } catch (error) {
      await pool.query("rollback");
      throw error;
    }
  }

  return executed;
}

