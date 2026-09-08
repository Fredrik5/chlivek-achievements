import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";

type Fixtures = {
  playerUsername: string;
  playerPage: Page;
  adminRequest: APIRequestContext;
};

export const test = base.extend<Fixtures>({
  playerUsername: async ({}, use) => {
    const username = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    await use(username);
  },

  // A page whose browser context already holds a session cookie for a
  // freshly registered player — registering via the API (rather than
  // driving the login form) keeps each test's fixture data independent
  // without slowing every test down with UI form-filling.
  playerPage: async ({ page, playerUsername }, use) => {
    const response = await page.request.post("/api/auth/register", {
      data: { username: playerUsername, password: "testpass123" },
    });
    if (!response.ok()) {
      throw new Error(
        `Failed to register test player: ${response.status()} ${await response.text()}`,
      );
    }
    await use(page);
  },

  // An API request context authenticated as the seeded admin ("gm", see
  // prisma/seed.ts) — for tests that need to set up state only an admin
  // can reach (e.g. granting achievements) without driving the admin UI.
  adminRequest: async ({ request }, use) => {
    const response = await request.post("/api/auth/login", {
      data: { username: "gm", password: "pivo123" },
    });
    if (!response.ok()) {
      throw new Error(`Failed to log in as admin: ${response.status()} ${await response.text()}`);
    }
    await use(request);
  },
});

export { expect };
