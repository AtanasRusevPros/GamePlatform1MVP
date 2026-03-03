import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure"
  },
  webServer: [
    {
      command: "npm run dev:api",
      port: 3001,
      reuseExistingServer: true,
      timeout: 120_000
    },
    {
      command: "npm run dev:web",
      port: 5173,
      reuseExistingServer: true,
      timeout: 120_000
    }
  ]
});

