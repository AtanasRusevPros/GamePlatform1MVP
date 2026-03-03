import type { ApiClient, ProgressDto } from "@kids-games/shared";

export type FlashcardsQueuedOperation =
  | {
      id: string;
      type: "savePosition";
      deckId: string;
      lastIndex: number;
    }
  | {
      id: string;
      type: "markKnown";
      deckId: string;
      cardId: string;
    };

export interface QueueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface FlushQueueOptions {
  accessToken: string;
  client: ApiClient;
  operations: FlashcardsQueuedOperation[];
}

export interface FlushQueueResult {
  latestProgressByDeckId: Record<string, ProgressDto>;
  remaining: FlashcardsQueuedOperation[];
}

export const flashcardsQueueStorageKey = "kids-games-flashcards-queue";

export function readQueue(storage: QueueStorage): FlashcardsQueuedOperation[] {
  const raw = storage.getItem(flashcardsQueueStorageKey);

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as FlashcardsQueuedOperation[];
  } catch {
    return [];
  }
}

export function writeQueue(storage: QueueStorage, operations: FlashcardsQueuedOperation[]): void {
  if (operations.length === 0) {
    storage.removeItem(flashcardsQueueStorageKey);
    return;
  }

  storage.setItem(flashcardsQueueStorageKey, JSON.stringify(operations));
}

export function enqueueOperation(
  operations: FlashcardsQueuedOperation[],
  operation: FlashcardsQueuedOperation
): FlashcardsQueuedOperation[] {
  if (operation.type === "savePosition") {
    const next = operations.filter(
      (entry) => !(entry.type === "savePosition" && entry.deckId === operation.deckId)
    );

    return [...next, operation];
  }

  const duplicate = operations.some(
    (entry) => entry.type === "markKnown" && entry.deckId === operation.deckId && entry.cardId === operation.cardId
  );

  if (duplicate) {
    return operations;
  }

  return [...operations, operation];
}

export async function flushQueue(options: FlushQueueOptions): Promise<FlushQueueResult> {
  const remaining: FlashcardsQueuedOperation[] = [];
  const latestProgressByDeckId: Record<string, ProgressDto> = {};

  for (const operation of options.operations) {
    try {
      if (operation.type === "savePosition") {
        latestProgressByDeckId[operation.deckId] = await options.client.saveDeckPosition(
          operation.deckId,
          options.accessToken,
          { lastIndex: operation.lastIndex },
          operation.id
        );
      } else {
        latestProgressByDeckId[operation.deckId] = await options.client.markKnown(
          operation.deckId,
          options.accessToken,
          { cardId: operation.cardId },
          operation.id
        );
      }
    } catch {
      remaining.push(operation);
    }
  }

  return {
    latestProgressByDeckId,
    remaining
  };
}

export function createQueueStorage(): QueueStorage {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined
    };
  }

  return window.localStorage;
}

