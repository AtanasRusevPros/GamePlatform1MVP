import { expect, test } from "@playwright/test";

test("registers, opens a deck, marks known, and keeps progress after reload", async ({ page }) => {
  await page.goto("/register");

  const uniqueEmail = `player-${Date.now()}@example.com`;

  await page.getByLabel("Display Name").fill("Player One");
  await page.getByLabel("Email").fill(uniqueEmail);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Choose a game" })).toBeVisible();
  await page.getByRole("link", { name: "Open Flash Cards" }).click();

  await expect(page.getByRole("heading", { name: "Gameplay" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Apple" })).toBeVisible();

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Cat" })).toBeVisible();

  await page.getByRole("button", { name: "Mark Known" }).click();
  await expect(page.getByText("1/4")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Gameplay" })).toBeVisible();
  await expect(page.getByText("1/4")).toBeVisible();
});

