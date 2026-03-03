import type { Queryable } from "../types.js";

export interface GameRecord {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

export interface DeckRecord {
  id: string;
  gameId: string;
  languageCode: string;
  title: string;
  description: string | null;
  version: string;
  createdAt: string;
}

export interface CardRecord {
  id: string;
  deckId: string;
  term: string;
  imagePath: string | null;
  audioPath: string | null;
  tags: string[];
  createdAt: string;
}

export interface DeckProgressRecord {
  userId: string;
  deckId: string;
  lastIndex: number;
  knownCount: number;
  knownCardIds: string[];
  updatedAt: string;
}

interface GameRow {
  id: string;
  title: string;
  status: string;
  created_at: Date;
}

interface DeckRow {
  id: string;
  game_id: string;
  language_code: string;
  title: string;
  description: string | null;
  version: string;
  created_at: Date;
}

interface CardRow {
  id: string;
  deck_id: string;
  term: string;
  image_path: string | null;
  audio_path: string | null;
  tags: string[] | null;
  created_at: Date;
}

interface DeckProgressRow {
  user_id: string;
  deck_id: string;
  last_index: number;
  known_count: number;
  updated_at: Date;
}

interface KnownCardRow {
  card_id: string;
}

export class FlashcardsRepository {
  constructor(private readonly db: Queryable) {}

  async listEnabledGames(): Promise<GameRecord[]> {
    const result = await this.db.query<GameRow>(
      `
        select id, title, status, created_at
        from games
        where status = 'enabled'
        order by title asc
      `
    );

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      createdAt: row.created_at.toISOString()
    }));
  }

  async listDecks(languageCode: string): Promise<DeckRecord[]> {
    const result = await this.db.query<DeckRow>(
      `
        select id, game_id, language_code, title, description, version, created_at
        from decks
        where language_code = $1
        order by title asc
      `,
      [languageCode]
    );

    return result.rows.map((row) => ({
      id: row.id,
      gameId: row.game_id,
      languageCode: row.language_code,
      title: row.title,
      description: row.description,
      version: row.version,
      createdAt: row.created_at.toISOString()
    }));
  }

  async listCards(deckId: string): Promise<CardRecord[]> {
    const result = await this.db.query<CardRow>(
      `
        select id, deck_id, term, image_path, audio_path, tags, created_at
        from cards
        where deck_id = $1
        order by created_at asc, term asc
      `,
      [deckId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      deckId: row.deck_id,
      term: row.term,
      imagePath: row.image_path,
      audioPath: row.audio_path,
      tags: row.tags ?? [],
      createdAt: row.created_at.toISOString()
    }));
  }

  async getProgress(userId: string, deckId: string): Promise<DeckProgressRecord | undefined> {
    const result = await this.db.query<DeckProgressRow>(
      `
        select user_id, deck_id, last_index, known_count, updated_at
        from user_deck_progress
        where user_id = $1 and deck_id = $2
      `,
      [userId, deckId]
    );

    const row = result.rows[0];

    if (!row) {
      return undefined;
    }

    const knownCardIds = await this.listKnownCardIds(userId, deckId);

    return {
      userId: row.user_id,
      deckId: row.deck_id,
      lastIndex: row.last_index,
      knownCount: row.known_count,
      knownCardIds,
      updatedAt: row.updated_at.toISOString()
    };
  }

  async saveProgressPosition(userId: string, deckId: string, lastIndex: number): Promise<void> {
    await this.db.query(
      `
        insert into user_deck_progress (user_id, deck_id, last_index, known_count)
        values ($1, $2, $3, 0)
        on conflict (user_id, deck_id)
        do update set
          last_index = excluded.last_index,
          updated_at = current_timestamp
      `,
      [userId, deckId, lastIndex]
    );
  }

  async markKnown(userId: string, deckId: string, cardId: string): Promise<void> {
    await this.db.query(
      `
        insert into user_known_cards (user_id, deck_id, card_id, known_at)
        values ($1, $2, $3, current_timestamp)
        on conflict (user_id, card_id) do nothing
      `,
      [userId, deckId, cardId]
    );

    await this.db.query(
      `
        insert into user_deck_progress (user_id, deck_id, last_index, known_count)
        values (
          $1,
          $2,
          0,
          (select count(*)::int from user_known_cards where user_id = $1 and deck_id = $2)
        )
        on conflict (user_id, deck_id)
        do update set
          known_count = (select count(*)::int from user_known_cards where user_id = $1 and deck_id = $2),
          updated_at = current_timestamp
      `,
      [userId, deckId]
    );
  }

  async listKnownCardIds(userId: string, deckId: string): Promise<string[]> {
    const result = await this.db.query<KnownCardRow>(
      `
        select card_id
        from user_known_cards
        where user_id = $1 and deck_id = $2
        order by known_at asc
      `,
      [userId, deckId]
    );

    return result.rows.map((row) => row.card_id);
  }
}
