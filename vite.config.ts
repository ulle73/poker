import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: { advisor: resolve("index.html"), table: resolve("table.html") },
    },
  },
  test: { environment: "jsdom", include: ["tests/**/*.test.ts"] },
});
