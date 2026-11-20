import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: {
    // The built app (run npm run build first), as it runs in production.
    command: "node dist/server/server/server.js",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
    env: {
      PORT: "3000",
      DEMO: "1",
      // One browser makes dozens of page loads a minute from 127.0.0.1; the real limits are
      // covered by test/server/security.test.ts.
      RATE_LIMIT_API_PER_MINUTE: "10000",
      RATE_LIMIT_AI_PER_MINUTE: "10000",
    },
  },
});
