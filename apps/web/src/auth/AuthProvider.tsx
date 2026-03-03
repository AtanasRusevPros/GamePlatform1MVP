import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import type { ApiClient, AuthTokens, AuthUser } from "@kids-games/shared";
import { ApiClientError, createApiClient } from "@kids-games/shared";

const SESSION_STORAGE_KEY = "kids-games-session";

export interface SessionState {
  user: AuthUser;
  tokens: AuthTokens;
}

interface AuthContextValue {
  status: "loading" | "authenticated" | "unauthenticated";
  user: AuthUser | null;
  session: SessionState | null;
  client: ApiClient;
  errorMessage: string | null;
  login(input: { email: string; password: string }): Promise<void>;
  register(input: { email: string; password: string; displayName: string }): Promise<void>;
  logout(): Promise<void>;
  clearError(): void;
}

interface AuthProviderProps extends PropsWithChildren {
  client?: ApiClient;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const defaultClient = createApiClient("/api");

export function AuthProvider({ children, client = defaultClient, storage, }: AuthProviderProps) {
  const safeStorage = storage ?? getBrowserStorage();
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [session, setSession] = useState<SessionState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    if (hasRestoredRef.current) {
      return;
    }

    hasRestoredRef.current = true;

    const run = async () => {
      const storedSession = readStoredSession(safeStorage);

      if (!storedSession) {
        setStatus("unauthenticated");
        return;
      }

      const restoredSession = await restoreSession(client, storedSession);

      if (!restoredSession) {
        safeStorage.removeItem(SESSION_STORAGE_KEY);
        setSession(null);
        setStatus("unauthenticated");
        return;
      }

      persistSession(safeStorage, restoredSession);
      setSession(restoredSession);
      setStatus("authenticated");
    };

    void run();
  }, [client, safeStorage]);

  const value: AuthContextValue = {
    status,
    user: session?.user ?? null,
    session,
    client,
    errorMessage,
    async login(input) {
      setErrorMessage(null);
      const response = await client.login(input);
      const nextSession = { user: response.user, tokens: response.tokens };
      persistSession(safeStorage, nextSession);
      setSession(nextSession);
      setStatus("authenticated");
    },
    async register(input) {
      setErrorMessage(null);
      const response = await client.register(input);
      const nextSession = { user: response.user, tokens: response.tokens };
      persistSession(safeStorage, nextSession);
      setSession(nextSession);
      setStatus("authenticated");
    },
    async logout() {
      const currentSession = session;

      if (currentSession) {
        try {
          await client.logout({ refreshToken: currentSession.tokens.refreshToken });
        } catch (error) {
          if (!(error instanceof ApiClientError) || error.statusCode !== 401) {
            throw error;
          }
        }
      }

      safeStorage.removeItem(SESSION_STORAGE_KEY);
      setSession(null);
      setStatus("unauthenticated");
      setErrorMessage(null);
    },
    clearError() {
      setErrorMessage(null);
    }
  };

  return <AuthContext.Provider value={wrapWithErrorHandling(value, setErrorMessage)}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

function getBrowserStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined
    };
  }

  return window.localStorage;
}

function persistSession(storage: Pick<Storage, "setItem">, session: SessionState) {
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function readStoredSession(storage: Pick<Storage, "getItem">): SessionState | null {
  const raw = storage.getItem(SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

async function restoreSession(client: ApiClient, storedSession: SessionState): Promise<SessionState | null> {
  try {
    const me = await client.me(storedSession.tokens.accessToken);
    return {
      user: me.user,
      tokens: storedSession.tokens
    };
  } catch (error) {
    if (!(error instanceof ApiClientError) || error.statusCode !== 401) {
      return null;
    }
  }

  try {
    const refreshed = await client.refresh({ refreshToken: storedSession.tokens.refreshToken });
    const me = await client.me(refreshed.tokens.accessToken);

    return {
      user: me.user,
      tokens: refreshed.tokens
    };
  } catch {
    return null;
  }
}

function wrapWithErrorHandling(
  value: AuthContextValue,
  setErrorMessage: (value: string | null) => void
): AuthContextValue {
  return {
    ...value,
    async login(input) {
      try {
        await value.login(input);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
        throw error;
      }
    },
    async register(input) {
      try {
        await value.register(input);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
        throw error;
      }
    },
    async logout() {
      try {
        await value.logout();
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
        throw error;
      }
    }
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
