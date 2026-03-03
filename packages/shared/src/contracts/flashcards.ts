import { z } from "zod";

export const gamesRoutePath = "/games";
export const flashcardDecksRoutePath = "/flashcards/decks";

export const gameSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  createdAt: z.string()
});

export const deckSchema = z.object({
  id: z.string().uuid(),
  gameId: z.string(),
  languageCode: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  version: z.string(),
  createdAt: z.string()
});

export const cardSchema = z.object({
  id: z.string().uuid(),
  deckId: z.string().uuid(),
  term: z.string(),
  imagePath: z.string().nullable(),
  audioPath: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: z.string()
});

export const progressSchema = z.object({
  deckId: z.string().uuid(),
  lastIndex: z.number().int().nonnegative(),
  knownCount: z.number().int().nonnegative(),
  knownCardIds: z.array(z.string().uuid()),
  updatedAt: z.string()
});

export const listGamesResponseSchema = z.object({
  games: z.array(gameSchema)
});

export const listDecksResponseSchema = z.object({
  decks: z.array(deckSchema)
});

export const listCardsResponseSchema = z.object({
  cards: z.array(cardSchema)
});

export const getProgressResponseSchema = z.object({
  progress: progressSchema
});

export const savePositionRequestSchema = z.object({
  lastIndex: z.number().int().nonnegative()
});

export const markKnownRequestSchema = z.object({
  cardId: z.string().uuid()
});

export const writeProgressResponseSchema = z.object({
  progress: progressSchema
});

export type GameDto = z.infer<typeof gameSchema>;
export type DeckDto = z.infer<typeof deckSchema>;
export type CardDto = z.infer<typeof cardSchema>;
export type ProgressDto = z.infer<typeof progressSchema>;
export type SavePositionRequest = z.infer<typeof savePositionRequestSchema>;
export type MarkKnownRequest = z.infer<typeof markKnownRequestSchema>;

