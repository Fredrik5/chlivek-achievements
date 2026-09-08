import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const PORT = 3100;
const TEST_DB_PATH = path.join(__dirname, "prisma", "test.db");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Bootstrap the test database (idempotent: migrate deploy applies only
    // pending migrations, seed.ts upserts) strictly before `next dev` opens
    // it — running these concurrently instead (e.g. via globalSetup) races
    // with the app's own Prisma client and intermittently fails with
    // "database is locked".
    command: `npx prisma migrate deploy && npx tsx prisma/seed.ts && npx next dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: `file:${TEST_DB_PATH}`,
    },
  },
});
