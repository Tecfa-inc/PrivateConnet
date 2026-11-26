import { defineConfig } from "vitest/config";
import path from "node:path";

// Integration tests run against the PostgreSQL in DATABASE_URL, one file at a time.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
