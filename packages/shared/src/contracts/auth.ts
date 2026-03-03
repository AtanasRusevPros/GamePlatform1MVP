import { z } from "zod";

export const registerRoutePath = "/auth/register";
export const loginRoutePath = "/auth/login";
export const refreshRoutePath = "/auth/refresh";
export const logoutRoutePath = "/auth/logout";
export const meRoutePath = "/auth/me";

const emailSchema = z.string().trim().max(320).email().transform((value) => value.toLowerCase());
const passwordSchema = z.string().min(8).max(72);
const displayNameSchema = z.string().trim().min(1).max(50);
const refreshTokenSchema = z.string().min(20).max(512);

export const registerRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema
});

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const refreshRequestSchema = z.object({
  refreshToken: refreshTokenSchema
});

export const logoutRequestSchema = refreshRequestSchema;

export const authUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  displayName: z.string()
});

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenType: z.literal("Bearer"),
  expiresInSeconds: z.number().int().positive()
});

export const authSuccessResponseSchema = z.object({
  user: authUserSchema,
  tokens: authTokensSchema
});

export const logoutResponseSchema = z.object({
  success: z.literal(true)
});

export const authMeResponseSchema = z.object({
  user: authUserSchema
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;
export type LogoutRequest = z.infer<typeof logoutRequestSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;
export type AuthSuccessResponse = z.infer<typeof authSuccessResponseSchema>;
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;
export type AuthMeResponse = z.infer<typeof authMeResponseSchema>;
