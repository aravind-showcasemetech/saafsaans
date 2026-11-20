import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**", "test/e2e/**"],
    // Structured request logs (one JSON line each) are expected output, not test noise.
    onConsoleLog: (log) => !log.startsWith('{"time"'),
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      // Process entry points: server.ts is covered by the smoke test, capture-air.ts is a manual
      // script that calls the real Air Quality API.
      exclude: ["src/server/server.ts", "src/server/capture-air.ts"],
      thresholds: {
        "src/shared/**": { lines: 95 },
        "src/server/**": { lines: 85 },
      },
    },
  },
});
