import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import type { Pool } from "pg";

interface SeedCard {
  id: string;
  term: string;
  imagePath?: string | null;
  audioPath?: string | null;
  tags?: string[];
}

interface SeedDeck {
  id: string;
  gameId: string;
  languageCode: string;
  title: string;
  description?: string | null;
  version: string;
  cards: SeedCard[];
}

interface SeedData {
  games: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  decks: SeedDeck[];
}

const seedFilePath = resolve(process.cwd(), "infra/sql/seeds/flashcards.en.basic.json");

export async function seedDatabase(pool: Pick<Pool, "query">): Promise<void> {
  const seedData = JSON.parse(await fs.readFile(seedFilePath, "utf8")) as SeedData;

  await pool.query("begin");

  try {
    for (const game of seedData.games) {
      await pool.query(
        `
          insert into games (id, title, status)
          values ($1, $2, $3)
          on conflict (id) do update set
            title = excluded.title,
            status = excluded.status
        `,
        [game.id, game.title, game.status]
      );
    }

    for (const deck of seedData.decks) {
      await pool.query(
        `
          insert into decks (id, game_id, language_code, title, description, version)
          values ($1, $2, $3, $4, $5, $6)
          on conflict (id) do update set
            game_id = excluded.game_id,
            language_code = excluded.language_code,
            title = excluded.title,
            description = excluded.description,
            version = excluded.version
        `,
        [deck.id, deck.gameId, deck.languageCode, deck.title, deck.description ?? null, deck.version]
      );

      for (const card of deck.cards) {
        await pool.query(
          `
            insert into cards (id, deck_id, term, image_path, audio_path, tags)
            values ($1, $2, $3, $4, $5, $6)
            on conflict (id) do update set
              deck_id = excluded.deck_id,
              term = excluded.term,
              image_path = excluded.image_path,
              audio_path = excluded.audio_path,
              tags = excluded.tags
          `,
          [card.id, deck.id, card.term, card.imagePath ?? null, card.audioPath ?? null, card.tags ?? []]
        );
      }
    }

    await pool.query("commit");
  } catch (error) {
    await pool.query("rollback");
    throw error;
  }
}

