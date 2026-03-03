import { describe, expect, it } from "vitest";
import { createApp } from "@kids-games/api";

describe("api auth flow", () => {
  it("returns health status", async () => {
    const app = await createApp({ config: { logLevel: "fatal" } });

    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("ok");

    await app.close();
  });

  it("registers, logs in, refreshes, logs out, and protects auth-only routes", async () => {
    const app = await createApp({ config: { logLevel: "fatal" } });

    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "player@example.com",
        password: "password123",
        displayName: "Player One"
      }
    });

    expect(registerResponse.statusCode).toBe(200);
    const registered = registerResponse.json();

    const meWithoutToken = await app.inject({
      method: "GET",
      url: "/auth/me"
    });

    expect(meWithoutToken.statusCode).toBe(401);

    const meWithToken = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: {
        authorization: `Bearer ${registered.tokens.accessToken}`
      }
    });

    expect(meWithToken.statusCode).toBe(200);
    expect(meWithToken.json().user.email).toBe("player@example.com");

    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "player@example.com",
        password: "password123"
      }
    });

    expect(loginResponse.statusCode).toBe(200);
    const loggedIn = loginResponse.json();

    const refreshResponse = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: {
        refreshToken: loggedIn.tokens.refreshToken
      }
    });

    expect(refreshResponse.statusCode).toBe(200);
    const refreshed = refreshResponse.json();
    expect(refreshed.tokens.refreshToken).not.toBe(loggedIn.tokens.refreshToken);

    const logoutResponse = await app.inject({
      method: "POST",
      url: "/auth/logout",
      payload: {
        refreshToken: refreshed.tokens.refreshToken
      }
    });

    expect(logoutResponse.statusCode).toBe(200);
    expect(logoutResponse.json()).toEqual({ success: true });

    const refreshAfterLogout = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: {
        refreshToken: refreshed.tokens.refreshToken
      }
    });

    expect(refreshAfterLogout.statusCode).toBe(401);

    await app.close();
  });

  it("rejects duplicate registration, invalid payloads, and invalid credentials", async () => {
    const app = await createApp({ config: { logLevel: "fatal" } });

    const initialRegistration = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "player@example.com",
        password: "password123",
        displayName: "Player One"
      }
    });

    expect(initialRegistration.statusCode).toBe(200);

    const duplicateRegistration = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "player@example.com",
        password: "password123",
        displayName: "Duplicate Player"
      }
    });

    expect(duplicateRegistration.statusCode).toBe(409);

    const invalidPayload = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "not-an-email",
        password: "short"
      }
    });

    expect(invalidPayload.statusCode).toBe(400);

    const invalidCredentials = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "player@example.com",
        password: "wrong-password"
      }
    });

    expect(invalidCredentials.statusCode).toBe(401);

    await app.close();
  });
});

