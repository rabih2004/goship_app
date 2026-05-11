import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — assumes the dev server is already running at :3000
 * (we don't spawn it via `webServer` so we can rely on the long-lived
 * Next.js process started by `npm run dev`).
 *
 * Tests use the seeded dev accounts from `npm run seed:dev`. They don't
 * write data that the seeder doesn't replay, so the suite is safe to re-run.
 */
export default defineConfig({
  testDir: "./tests-e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // sequential — shared DB
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
