import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resolves the "@/*" alias from tsconfig.json (Vite-native since v8).
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    // Transaction dates are UTC calendar dates end to end. Running the
    // suite from a non-UTC timezone makes any local-time Date constructor
    // in src/lib/dates.ts fail loudly instead of passing on a UTC machine.
    env: {
      TZ: "Asia/Yangon",
    },
  },
});
