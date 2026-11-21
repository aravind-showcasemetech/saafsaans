import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**", "test/e2e/**"],
    // Clears DEMO and API keys from the shell so results never depend on the environment.
    setupFiles: ["test/setup-env.ts"],
    // Structured request logs (one JSON line each) are expected output, not test noise.
    onConsoleLog: (log) => !log.startsWith('{"time"'),
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      // The process entry point server.ts is covered by the smoke test.
      exclude: ["src/server/server.ts"],
      thresholds: {
        "src/shared/**": { lines: 95 },
        "src/server/**": { lines: 85 },
      },
    },
  },
});
