import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type {
  AuthSuccessResponse,
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
  RegisterRequest
} from "@kids-games/shared";
import { hashPassword, verifyPassword } from "./password.js";
import { DuplicateUserError, hashOpaqueToken } from "./store.js";
import type { AccessTokenClaims, AuthRepository, AuthenticatedUserRecord } from "./types.js";

export class AuthConflictError extends Error {}
export class InvalidCredentialsError extends Error {}
export class InvalidRefreshTokenError extends Error {}

export interface AuthServiceConfig {
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
}

export class AuthService {
  constructor(
    private readonly app: FastifyInstance,
    private readonly repository: AuthRepository,
    private readonly config: AuthServiceConfig
  ) {}

  async register(payload: RegisterRequest): Promise<AuthSuccessResponse> {
    const passwordHash = await hashPassword(payload.password);

    let user: AuthenticatedUserRecord;

    try {
      user = await this.repository.createUser({
        email: payload.email,
        displayName: payload.displayName,
        passwordHash
      });
    } catch (error) {
      if (error instanceof DuplicateUserError) {
        throw new AuthConflictError("Email is already registered");
      }

      throw error;
    }

    return this.issueTokens(user);
  }

  async login(payload: LoginRequest): Promise<AuthSuccessResponse> {
    const user = await this.repository.findUserByEmail(payload.email);

    if (!user || !(await verifyPassword(payload.password, user.passwordHash))) {
      throw new InvalidCredentialsError("Invalid email or password");
    }

    return this.issueTokens(user);
  }

  async refresh(payload: RefreshRequest): Promise<AuthSuccessResponse> {
    const tokenHash = hashOpaqueToken(payload.refreshToken);
    const session = await this.repository.findRefreshSession(tokenHash);

    if (!session || session.revokedAt || new Date(session.expiresAt).getTime() <= Date.now()) {
      throw new InvalidRefreshTokenError("Refresh token is invalid or expired");
    }

    const user = await this.repository.findUserById(session.userId);

    if (!user) {
      throw new InvalidRefreshTokenError("Refresh token user no longer exists");
    }

    await this.repository.revokeRefreshSession(tokenHash);

    return this.issueTokens(user);
  }

  async logout(payload: LogoutRequest): Promise<void> {
    const tokenHash = hashOpaqueToken(payload.refreshToken);
    const session = await this.repository.findRefreshSession(tokenHash);

    if (!session || session.revokedAt) {
      throw new InvalidRefreshTokenError("Refresh token is invalid or expired");
    }

    await this.repository.revokeRefreshSession(tokenHash);
  }

  private async issueTokens(user: AuthenticatedUserRecord): Promise<AuthSuccessResponse> {
    const accessTokenPayload: AccessTokenClaims = {
      sub: user.id,
      email: user.email
    };

    const accessToken = await this.app.jwt.sign(accessTokenPayload, {
      expiresIn: this.config.accessTokenTtlSeconds
    });

    const refreshToken = randomBytes(32).toString("hex");
    const refreshTokenExpiresAt = new Date(Date.now() + this.config.refreshTokenTtlSeconds * 1000).toISOString();

    await this.repository.saveRefreshSession({
      tokenHash: hashOpaqueToken(refreshToken),
      userId: user.id,
      expiresAt: refreshTokenExpiresAt
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName
      },
      tokens: {
        accessToken,
        refreshToken,
        tokenType: "Bearer",
        expiresInSeconds: this.config.accessTokenTtlSeconds
      }
    };
  }
}
