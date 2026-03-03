import { useEffect, useMemo, useRef, useState } from "react";
import type { CardDto, DeckDto, ProgressDto } from "@kids-games/shared";
import { useAuth } from "../auth/AuthProvider";
import {
  createQueueStorage,
  enqueueOperation,
  flushQueue,
  readQueue,
  writeQueue,
  type FlashcardsQueuedOperation
} from "../flashcards/offlineQueue";
import { applyKnownLocally, applyPositionLocally, createInitialOrder } from "../flashcards/progress";

export function FlashcardsPage() {
  const auth = useAuth();
  const storageRef = useRef(createQueueStorage());
  const storage = storageRef.current;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [languageCode, setLanguageCode] = useState("en");
  const [decks, setDecks] = useState<DeckDto[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardDto[]>([]);
  const [progress, setProgress] = useState<ProgressDto | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(() => typeof navigator !== "undefined" && !navigator.onLine);
  const [queuedCount, setQueuedCount] = useState<number>(() => readQueue(storage).length);

  const currentCard = cards[order[currentIndex] ?? 0] ?? null;
  const knownCount = progress?.knownCount ?? 0;
  const knownCardIds = progress?.knownCardIds ?? [];
  const completionPercent = cards.length > 0 ? Math.round((knownCount / cards.length) * 100) : 0;

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
    }

    function handleOffline() {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!auth.session || isOffline) {
      return;
    }

    let isActive = true;
    const operations = readQueue(storage);

    if (operations.length === 0) {
      return;
    }

    void flushQueue({
      accessToken: auth.session.tokens.accessToken,
      client: auth.client,
      operations
    }).then((result) => {
      if (!isActive) {
        return;
      }

      writeQueue(storage, result.remaining);
      setQueuedCount(result.remaining.length);

      if (selectedDeckId && result.latestProgressByDeckId[selectedDeckId]) {
        setProgress(result.latestProgressByDeckId[selectedDeckId]);
      }
    });

    return () => {
      isActive = false;
    };
  }, [auth.client, auth.session, isOffline, selectedDeckId, storage]);

  useEffect(() => {
    if (!auth.session) {
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setErrorMessage(null);

    void auth.client
      .listFlashcardDecks(languageCode)
      .then((response) => {
        if (!isActive) {
          return;
        }

        setDecks(response.decks);
        setSelectedDeckId((current) => current ?? response.decks[0]?.id ?? null);
      })
      .catch((error: Error) => {
        if (isActive) {
          setErrorMessage(error.message);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [auth.client, auth.session, languageCode]);

  useEffect(() => {
    if (!auth.session || !selectedDeckId) {
      return;
    }

    let isActive = true;
    setIsLoading(true);

    void Promise.all([
      auth.client.listFlashcardCards(selectedDeckId),
      auth.client.getDeckProgress(selectedDeckId, auth.session.tokens.accessToken)
    ])
      .then(([cardsResponse, nextProgress]) => {
        if (!isActive) {
          return;
        }

        setCards(cardsResponse.cards);
        setProgress(nextProgress);
        setOrder(createInitialOrder(cardsResponse.cards));
        setCurrentIndex(Math.min(nextProgress.lastIndex, Math.max(cardsResponse.cards.length - 1, 0)));
      })
      .catch((error: Error) => {
        if (isActive) {
          setErrorMessage(error.message);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [auth.client, auth.session, selectedDeckId]);

  const stats = useMemo(
    () => [
      { label: "Known", value: `${knownCount}/${cards.length}` },
      { label: "Completion", value: `${completionPercent}%` },
      { label: "Queued", value: `${queuedCount}` },
      { label: "Language", value: languageCode.toUpperCase() }
    ],
    [cards.length, completionPercent, knownCount, queuedCount, languageCode]
  );

  async function savePosition(nextIndex: number) {
    if (!auth.session || !selectedDeckId) {
      return;
    }

    const operation: FlashcardsQueuedOperation = {
      id: createIdempotencyKey(),
      type: "savePosition",
      deckId: selectedDeckId,
      lastIndex: nextIndex
    };

    setProgress((current) => applyPositionLocally(current, selectedDeckId, nextIndex));

    if (isOffline) {
      persistOperation(operation);
      return;
    }

    try {
      const nextProgress = await auth.client.saveDeckPosition(
        selectedDeckId,
        auth.session.tokens.accessToken,
        { lastIndex: nextIndex },
        operation.id
      );

      setProgress(nextProgress);
    } catch {
      persistOperation(operation);
      setIsOffline(true);
    }
  }

  async function markKnown() {
    if (!auth.session || !selectedDeckId || !currentCard) {
      return;
    }

    const operation: FlashcardsQueuedOperation = {
      id: createIdempotencyKey(),
      type: "markKnown",
      deckId: selectedDeckId,
      cardId: currentCard.id
    };

    setProgress((current) => applyKnownLocally(current, currentCard.id));

    if (isOffline) {
      persistOperation(operation);
      return;
    }

    try {
      const nextProgress = await auth.client.markKnown(
        selectedDeckId,
        auth.session.tokens.accessToken,
        { cardId: currentCard.id },
        operation.id
      );

      setProgress(nextProgress);
    } catch {
      persistOperation(operation);
      setIsOffline(true);
    }
  }

  async function goPrevious() {
    if (cards.length === 0) {
      return;
    }

    const nextIndex = currentIndex === 0 ? cards.length - 1 : currentIndex - 1;
    setCurrentIndex(nextIndex);
    await savePosition(nextIndex);
  }

  async function goNext() {
    if (cards.length === 0) {
      return;
    }

    const nextIndex = currentIndex === cards.length - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(nextIndex);
    await savePosition(nextIndex);
  }

  function shuffleDeck() {
    setOrder((current) => {
      const next = [...current];

      for (let index = next.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        const currentValue = next[index];
        const swapValue = next[swapIndex];

        if (currentValue === undefined || swapValue === undefined) {
          continue;
        }

        next[index] = swapValue;
        next[swapIndex] = currentValue;
      }

      return next;
    });
    setCurrentIndex(0);
    void savePosition(0);
  }

  function playAudio() {
    if (!currentCard) {
      return;
    }

    if (currentCard.audioPath && audioRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play();
      return;
    }

    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(currentCard.term);
      utterance.lang = languageCode;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }

  function persistOperation(operation: FlashcardsQueuedOperation) {
    const nextQueue = enqueueOperation(readQueue(storage), operation);
    writeQueue(storage, nextQueue);
    setQueuedCount(nextQueue.length);
  }

  return (
    <main className="dashboard-grid">
      <section className="panel panel-hero">
        <p className="eyebrow">Flash Cards</p>
        <h1>Gameplay</h1>
        <p>Decks, cards, and progress come from the backend. When the connection drops, writes queue locally and replay on reconnect.</p>
      </section>
      <section className="panel">
        <h2>Deck picker</h2>
        <label className="inline-form">
          Language
          <select value={languageCode} onChange={(event) => setLanguageCode(event.target.value)}>
            <option value="en">English</option>
          </select>
        </label>
        <label className="inline-form">
          Deck
          <select value={selectedDeckId ?? ""} onChange={(event) => setSelectedDeckId(event.target.value || null)}>
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.title}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">
          {isOffline ? "Offline mode active. Progress writes will queue locally." : "Online. Progress sync is live."}
        </p>
      </section>
      <section className="panel stats-grid">
        {stats.map((item) => (
          <article className="stat-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>
      <section className="panel card-stage">
        {isLoading ? <p className="muted">Loading deck...</p> : null}
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        {!isLoading && !errorMessage && currentCard ? (
          <>
            <div className="card-face">
              <p className="eyebrow">Card {currentIndex + 1}</p>
              <h2>{currentCard.term}</h2>
              <p>{knownCardIds.includes(currentCard.id) ? "Known card" : "Tap Mark Known when this one is mastered."}</p>
              <div className="audio-row">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={playAudio}
                >
                  {currentCard.audioPath ? "Play audio" : "Speak word"}
                </button>
                {currentCard.audioPath ? <audio ref={audioRef} src={currentCard.audioPath} preload="none" /> : null}
              </div>
            </div>
            <div className="control-row">
              <button className="ghost-button" type="button" onClick={() => void goPrevious()}>
                Previous
              </button>
              <button className="ghost-button" type="button" onClick={shuffleDeck}>
                Shuffle
              </button>
              <button className="primary-button" type="button" onClick={() => void markKnown()}>
                Mark Known
              </button>
              <button className="ghost-button" type="button" onClick={() => void goNext()}>
                Next
              </button>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
