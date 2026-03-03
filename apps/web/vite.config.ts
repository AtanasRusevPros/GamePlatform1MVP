import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(currentDirectory, "../..");

export default defineConfig({
  root: currentDirectory,
  plugins: [react()],
  resolve: {
    alias: {
      "@kids-games/game-sdk": resolve(workspaceRoot, "packages/game-sdk/src/index.ts"),
      "@kids-games/shared": resolve(workspaceRoot, "packages/shared/src/index.ts")
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  }
});
