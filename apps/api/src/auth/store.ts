import { createHash, randomUUID } from "node:crypto";
import type { AuthRepository, AuthenticatedUserRecord, RefreshSessionRecord } from "./types.js";

export class DuplicateUserError extends Error {
  constructor(email: string) {
    super(`User already exists: ${email}`);
  }
}

export class InMemoryAuthStore implements AuthRepository {
  readonly usersById = new Map<string, AuthenticatedUserRecord>();
  readonly userIdsByEmail = new Map<string, string>();
  readonly refreshSessionsByHash = new Map<string, RefreshSessionRecord>();

  async createUser(input: { email: string; displayName: string; passwordHash: string }): Promise<AuthenticatedUserRecord> {
    if (this.userIdsByEmail.has(input.email)) {
      throw new DuplicateUserError(input.email);
    }

    const timestamp = new Date().toISOString();
    const user: AuthenticatedUserRecord = {
      id: randomUUID(),
      email: input.email,
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.usersById.set(user.id, user);
    this.userIdsByEmail.set(user.email, user.id);

    return user;
  }

  async findUserByEmail(email: string): Promise<AuthenticatedUserRecord | undefined> {
    const userId = this.userIdsByEmail.get(email);
    return userId ? this.usersById.get(userId) : undefined;
  }

  async findUserById(userId: string): Promise<AuthenticatedUserRecord | undefined> {
    return this.usersById.get(userId);
  }

  async saveRefreshSession(session: RefreshSessionRecord): Promise<void> {
    this.refreshSessionsByHash.set(session.tokenHash, session);
  }

  async findRefreshSession(tokenHash: string): Promise<RefreshSessionRecord | undefined> {
    return this.refreshSessionsByHash.get(tokenHash);
  }

  async revokeRefreshSession(tokenHash: string, revokedAt = new Date().toISOString()): Promise<void> {
    const existingSession = this.refreshSessionsByHash.get(tokenHash);

    if (!existingSession) {
      return;
    }

    this.refreshSessionsByHash.set(tokenHash, {
      ...existingSession,
      revokedAt
    });
  }
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
