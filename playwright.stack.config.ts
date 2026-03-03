import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: "https://localhost:8443",
    trace: "retain-on-failure",
    ignoreHTTPSErrors: true
  }
});
