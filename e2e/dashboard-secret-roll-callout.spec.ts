import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "./fixtures";

// Grants `points` worth of approved points to a player by creating a
// throwaway secret achievement and admin-granting it directly (source:
// admin_manual, auto-approved) — the fastest path to a given points total
// without depending on the seeded achievement catalog or the submission
// approval flow.
async function grantPoints(adminRequest: APIRequestContext, playerId: string, points: number) {
  const created = await adminRequest.post("/api/admin/achievements", {
    data: {
      title: `E2E grant ${points}pts ${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      description: "e2e test fixture achievement",
      points,
      isSecret: true,
    },
  });
  if (!created.ok()) {
    throw new Error(`Failed to create fixture achievement: ${created.status()} ${await created.text()}`);
  }
  const { achievement } = await created.json();

  const granted = await adminRequest.post(`/api/admin/players/${playerId}/achievements`, {
    data: { achievementId: achievement.id },
  });
  if (!granted.ok()) {
    throw new Error(`Failed to grant fixture achievement: ${granted.status()} ${await granted.text()}`);
  }
}

async function findPlayerId(adminRequest: APIRequestContext, username: string): Promise<string> {
  const res = await adminRequest.get(`/api/admin/players?q=${encodeURIComponent(username)}`);
  if (!res.ok()) {
    throw new Error(`Failed to look up player: ${res.status()} ${await res.text()}`);
  }
  const { players } = await res.json();
  const player = players.find((p: { name: string }) => p.name === username);
  if (!player) throw new Error(`Player "${username}" not found via admin players search`);
  return player.id as string;
}

test.describe("dashboard secret roll callout (fresh player, no rolls available)", () => {
  test("shows no callout and no roll button", async ({ playerPage }) => {
    await playerPage.goto("/dashboard");

    await expect(playerPage.getByText(/Máš k dispozici/)).toHaveCount(0);
    await expect(playerPage.getByRole("button", { name: "Vylosovat →" })).toHaveCount(0);
  });

  test("no longer shows the removed bottom secret teaser card", async ({ playerPage }) => {
    await playerPage.goto("/dashboard");

    await expect(playerPage.getByText("Legendary")).toHaveCount(0);
    await expect(playerPage.getByText("??? Tajný achievement")).toHaveCount(0);
  });
});

test.describe("dashboard secret roll callout (rolls available)", () => {
  test("shows singular copy for one available roll and links to /secret", async ({
    playerPage,
    playerUsername,
    adminRequest,
  }) => {
    const playerId = await findPlayerId(adminRequest, playerUsername);
    await grantPoints(adminRequest, playerId, 100);

    await playerPage.goto("/dashboard");

    await expect(playerPage.getByText("Máš k dispozici 1 losování tajného achievementu.")).toBeVisible();

    await playerPage.getByRole("button", { name: "Vylosovat →" }).click();
    await expect(playerPage).toHaveURL("/secret");
  });

  test("shows plural copy for multiple available rolls", async ({ playerPage, playerUsername, adminRequest }) => {
    const playerId = await findPlayerId(adminRequest, playerUsername);
    await grantPoints(adminRequest, playerId, 200);

    await playerPage.goto("/dashboard");

    await expect(playerPage.getByText("Máš k dispozici 2 losování tajných achievementů.")).toBeVisible();
  });

  test("disappears again once the available roll is drawn", async ({ playerPage, playerUsername, adminRequest }) => {
    const playerId = await findPlayerId(adminRequest, playerUsername);
    await grantPoints(adminRequest, playerId, 100);

    await playerPage.goto("/dashboard");
    await expect(playerPage.getByText("Máš k dispozici 1 losování tajného achievementu.")).toBeVisible();

    const draw = await playerPage.request.post("/api/secret/draw", { data: { threshold: 100 } });
    expect(draw.ok()).toBe(true);

    await playerPage.reload();
    await expect(playerPage.getByText(/Máš k dispozici/)).toHaveCount(0);
  });
});
