import { test, expect } from "./fixtures";

test("redirects an unauthenticated visitor to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login");
});

test.describe("dashboard (fresh player)", () => {
  test("shows the points header at zero with a progress bar", async ({ playerPage }) => {
    await playerPage.goto("/dashboard");

    await expect(playerPage.getByText("Moje body")).toBeVisible();
    await expect(playerPage.getByText("0", { exact: true })).toBeVisible();
    await expect(playerPage.getByText(/ještě \d+ b\. a odemkneš tajný achievement/)).toBeVisible();
  });

  test("shows the empty state for today's daily challenge", async ({ playerPage }) => {
    await playerPage.goto("/dashboard");

    await expect(playerPage.getByText("Denní výzva", { exact: true })).toBeVisible();
    await expect(playerPage.getByText("Dnes žádná denní výzva.")).toBeVisible();
  });

  test("groups achievements by category, all locked", async ({ playerPage }) => {
    await playerPage.goto("/dashboard");

    await expect(playerPage.getByText("Pitkarské")).toBeVisible();
    await expect(playerPage.getByText("Výlety")).toBeVisible();
    await expect(playerPage.getByText("Aktivity", { exact: true })).toBeVisible();

    await expect(playerPage.getByText("Vypij 10 piv")).toBeVisible();

    const lockedPills = playerPage.getByText("Nesplněno");
    await expect(lockedPills).toHaveCount(8);
  });

  test("clicking an achievement card opens its detail page", async ({ playerPage }) => {
    await playerPage.goto("/dashboard");

    await playerPage.getByText("Vypij 10 piv").click();
    await expect(playerPage).toHaveURL(/\/achievement\/[^/]+$/);
    await expect(playerPage.getByText("Vypij 10 piv")).toBeVisible();
  });

  test("clicking 'Zobrazit historii' navigates to daily history", async ({ playerPage }) => {
    await playerPage.goto("/dashboard");

    await playerPage.getByText("Zobrazit historii →").click();
    await expect(playerPage).toHaveURL("/daily-history");
  });
});
