import { randomUUID } from "node:crypto";
import type { Queryable } from "../types.js";
import { DuplicateUserError } from "../../auth/store.js";
import type { AuthRepository, AuthenticatedUserRecord, RefreshSessionRecord } from "../../auth/types.js";

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

interface RefreshSessionRow {
  token_hash: string;
  user_id: string;
  expires_at: Date;
  revoked_at: Date | null;
}

export class DatabaseAuthRepository implements AuthRepository {
  constructor(private readonly db: Queryable) {}

  async createUser(input: { email: string; displayName: string; passwordHash: string }): Promise<AuthenticatedUserRecord> {
    const existing = await this.findUserByEmail(input.email);

    if (existing) {
      throw new DuplicateUserError(input.email);
    }

    const result = await this.db.query<UserRow>(
      `
        insert into users (id, email, password_hash, display_name)
        values ($1, $2, $3, $4)
        returning id, email, display_name, password_hash, created_at, updated_at
      `,
      [randomUUID(), input.email, input.passwordHash, input.displayName]
    );

    return mapUserRow(result.rows[0]!);
  }

  async findUserByEmail(email: string): Promise<AuthenticatedUserRecord | undefined> {
    const result = await this.db.query<UserRow>(
      `
        select id, email, display_name, password_hash, created_at, updated_at
        from users
        where email = $1
      `,
      [email]
    );

    return result.rows[0] ? mapUserRow(result.rows[0]) : undefined;
  }

  async findUserById(userId: string): Promise<AuthenticatedUserRecord | undefined> {
    const result = await this.db.query<UserRow>(
      `
        select id, email, display_name, password_hash, created_at, updated_at
        from users
        where id = $1
      `,
      [userId]
    );

    return result.rows[0] ? mapUserRow(result.rows[0]) : undefined;
  }

  async saveRefreshSession(session: RefreshSessionRecord): Promise<void> {
    await this.db.query(
      `
        insert into auth_refresh_sessions (token_hash, user_id, expires_at, revoked_at)
        values ($1, $2, $3, $4)
      `,
      [session.tokenHash, session.userId, session.expiresAt, session.revokedAt ?? null]
    );
  }

  async findRefreshSession(tokenHash: string): Promise<RefreshSessionRecord | undefined> {
    const result = await this.db.query<RefreshSessionRow>(
      `
        select token_hash, user_id, expires_at, revoked_at
        from auth_refresh_sessions
        where token_hash = $1
      `,
      [tokenHash]
    );

    return result.rows[0] ? mapRefreshSessionRow(result.rows[0]) : undefined;
  }

  async revokeRefreshSession(tokenHash: string, revokedAt = new Date().toISOString()): Promise<void> {
    await this.db.query(
      `
        update auth_refresh_sessions
        set revoked_at = $2
        where token_hash = $1 and revoked_at is null
      `,
      [tokenHash, revokedAt]
    );
  }
}

function mapUserRow(row: UserRow): AuthenticatedUserRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function mapRefreshSessionRow(row: RefreshSessionRow): RefreshSessionRecord {
  const session: RefreshSessionRecord = {
    tokenHash: row.token_hash,
    userId: row.user_id,
    expiresAt: row.expires_at.toISOString()
  };

  if (row.revoked_at) {
    session.revokedAt = row.revoked_at.toISOString();
  }

  return session;
}
