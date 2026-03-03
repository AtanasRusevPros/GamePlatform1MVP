import { describe, expect, it } from "vitest";
import {
  closeDatabase,
  createDatabaseContext,
  FlashcardsRepository,
  hashPassword,
  initializeDatabase,
  runMigrations
} from "@kids-games/api";
import { DatabaseAuthRepository } from "@kids-games/api";

describe("database layer", () => {
  it("runs migrations from an empty database", async () => {
    const db = await createDatabaseContext({ databaseMode: "memory" });

    try {
      const applied = await runMigrations(db.pool);
      expect(applied).toContain("001_initial_schema.sql");

      const migrations = await db.pool.query<{ filename: string }>(
        "select filename from schema_migrations order by filename"
      );

      expect(migrations.rows.map((row) => row.filename)).toContain("001_initial_schema.sql");

      await expect(
        db.pool.query(
          `
            insert into games (id, title, status)
            values ('migration-smoke', 'Migration Smoke', 'enabled')
          `
        )
      ).resolves.toBeDefined();
    } finally {
      await closeDatabase(db);
    }
  });

  it("loads the seed deck and cards", async () => {
    const db = await createDatabaseContext({ databaseMode: "memory" });

    try {
      await initializeDatabase(db, { runMigrations: true, runSeed: true });

      const flashcardsRepository = new FlashcardsRepository(db.pool);
      const decks = await flashcardsRepository.listDecks("en");

      expect(decks).toHaveLength(1);
      expect(decks[0]?.title).toBe("Early English Nouns");

      const cards = await flashcardsRepository.listCards(decks[0]!.id);
      expect(cards).toHaveLength(4);
    } finally {
      await closeDatabase(db);
    }
  });

  it("persists users and deck progress through repositories", async () => {
    const db = await createDatabaseContext({ databaseMode: "memory" });

    try {
      await initializeDatabase(db, { runMigrations: true, runSeed: true });

      const authRepository = new DatabaseAuthRepository(db.pool);
      const flashcardsRepository = new FlashcardsRepository(db.pool);
      const passwordHash = await hashPassword("password123");
      const user = await authRepository.createUser({
        email: "player@example.com",
        displayName: "Player One",
        passwordHash
      });

      const persistedUser = await authRepository.findUserByEmail("player@example.com");
      expect(persistedUser?.id).toBe(user.id);

      const deck = (await flashcardsRepository.listDecks("en"))[0]!;
      const card = (await flashcardsRepository.listCards(deck.id))[0]!;

      await flashcardsRepository.saveProgressPosition(user.id, deck.id, 2);
      await flashcardsRepository.markKnown(user.id, deck.id, card.id);

      const progress = await flashcardsRepository.getProgress(user.id, deck.id);
      expect(progress?.lastIndex).toBe(2);
      expect(progress?.knownCount).toBe(1);
    } finally {
      await closeDatabase(db);
    }
  });
});
