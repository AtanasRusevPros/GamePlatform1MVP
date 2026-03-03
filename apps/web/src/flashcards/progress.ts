import type { CardDto, ProgressDto } from "@kids-games/shared";

export function applyKnownLocally(progress: ProgressDto | null, cardId: string): ProgressDto | null {
  if (!progress || progress.knownCardIds.includes(cardId)) {
    return progress;
  }

  return {
    ...progress,
    knownCount: progress.knownCount + 1,
    knownCardIds: [...progress.knownCardIds, cardId],
    updatedAt: new Date().toISOString()
  };
}

export function applyPositionLocally(progress: ProgressDto | null, deckId: string, lastIndex: number): ProgressDto {
  if (!progress) {
    return {
      deckId,
      lastIndex,
      knownCount: 0,
      knownCardIds: [],
      updatedAt: new Date().toISOString()
    };
  }

  return {
    ...progress,
    lastIndex,
    updatedAt: new Date().toISOString()
  };
}

export function createInitialOrder(cards: CardDto[]): number[] {
  return cards.map((_, index) => index);
}

