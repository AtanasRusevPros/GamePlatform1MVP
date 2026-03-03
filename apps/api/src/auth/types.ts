export interface AuthenticatedUserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefreshSessionRecord {
  tokenHash: string;
  userId: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface AuthRepository {
  createUser(input: { email: string; displayName: string; passwordHash: string }): Promise<AuthenticatedUserRecord>;
  findUserByEmail(email: string): Promise<AuthenticatedUserRecord | undefined>;
  findUserById(userId: string): Promise<AuthenticatedUserRecord | undefined>;
  saveRefreshSession(session: RefreshSessionRecord): Promise<void>;
  findRefreshSession(tokenHash: string): Promise<RefreshSessionRecord | undefined>;
  revokeRefreshSession(tokenHash: string, revokedAt?: string): Promise<void>;
}

export interface AccessTokenClaims {
  sub: string;
  email: string;
}
