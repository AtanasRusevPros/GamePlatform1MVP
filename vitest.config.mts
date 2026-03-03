import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vitest/config";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export const alias = {
  "@kids-games/api": resolve(currentDirectory, "apps/api/src/index.ts"),
  "@kids-games/game-sdk": resolve(currentDirectory, "packages/game-sdk/src/index.ts"),
  "@kids-games/shared": resolve(currentDirectory, "packages/shared/src/index.ts"),
  "@kids-games/web": resolve(currentDirectory, "apps/web/src/main.tsx")
};

export default defineConfig({
  resolve: {
    alias
  },
  test: {
    environment: "node"
  }
});

