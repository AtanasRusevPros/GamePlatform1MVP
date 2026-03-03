import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@kids-games/api";
import { loginRequestSchema, registerRequestSchema } from "@kids-games/shared";

describe("password helpers", () => {
  it("verifies a valid password against its hash", async () => {
    const passwordHash = await hashPassword("correct-horse-battery");

    await expect(verifyPassword("correct-horse-battery", passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", passwordHash)).resolves.toBe(false);
  });
});

describe("auth validation schemas", () => {
  it("normalizes register email and rejects too-short passwords", () => {
    const validPayload = registerRequestSchema.parse({
      email: " Player@Example.com ",
      password: "password123",
      displayName: "Player"
    });

    expect(validPayload.email).toBe("player@example.com");

    expect(() =>
      loginRequestSchema.parse({
        email: "player@example.com",
        password: "short"
      })
    ).toThrow();
  });
});

