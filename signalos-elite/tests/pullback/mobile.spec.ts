import { expect, test, type Page } from "@playwright/test";
import { event, item, now } from "./fixtures";

async function acknowledgeLegal(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: "Before you continue", exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "I understand investing and trading", exact: false }).check();
  await page.getByRole("checkbox", { name: "I agree to the Terms", exact: false }).check();
  await page.getByRole("checkbox", { name: "I understand Sigi AI", exact: false }).check();
  await page.getByRole("button", { name: "Continue to SigiOS", exact: true }).click();
}

test("mobile watch -> fresh follow-up -> exact Vision evidence, notification control and unchanged navigation", async ({ page }) => {
  const saved = event();
  let notifying = false;
  await page.clock.setFixedTime(now);
  await page.route("**/api/pullback-watch**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "POST") {
      notifying = request.postDataJSON().notify;
      await route.fulfill({ json: { ok: true } });
    } else if (url.searchParams.has("event")) await route.fulfill({ json: { event: saved } });
    else if (url.searchParams.has("symbol")) await route.fulfill({ json: { item: item(url.searchParams.get("symbol")!) } });
    else await route.fulfill({ json: {
      watches: [{ symbol: "TEST", notify: notifying, trusted_firms: ["Schwab", "Morningstar", "CFRA", "Argus"], snapshot: item() }],
      events: [saved],
    } });
  });
  await page.route("**/api/experts/institutional-activity**", (route) => route.fulfill({
    json: { ok: true, activity: { symbol: "TEST", through: "2026-11-19", funds: [], quarters: [], warnings: [] } },
  }));
  await page.goto("/watchlist/pullback?previewPlan=pro");
  await acknowledgeLegal(page);
  const watch = page.getByRole("region", { name: "Pullback Watch", exact: true });
  await expect(watch.getByRole("tab", { name: "Price & Volume", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(watch.getByRole("link", { name: "TEST 2.00x volume", exact: false })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Mobile navigation", exact: true }).getByRole("link")).toHaveCount(5);
  await watch.getByRole("button", { name: "Notify me", exact: true }).first().click();
  await expect(watch.getByRole("status").filter({ hasText: "In-app notifications enabled" })).toBeVisible();
  expect(notifying).toBe(true);
  await watch.getByRole("link", { name: "TEST" }).click();
  await expect(page).toHaveURL(new RegExp(`event=${saved.id}`));
  const evidence = page.getByRole("region", { name: "Pullback alert evidence" });
  await expect(evidence.getByRole("heading", { name: "Why did Sigi alert me?" })).toBeVisible();
  await expect(evidence.getByText("TEST · Price & Volume", { exact: true })).toBeVisible();
  await expect(evidence.getByText("Quote:", { exact: false })).toContainText("11:20");
  await expect(evidence.getByText("Quarterly filings establish", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("one qualifying firm is visible without inventing an alert", async ({ page }) => {
  const pending = item();
  pending.evaluation.firms = pending.evaluation.firms.slice(0, 1);
  pending.evaluation.analystAt = null;
  pending.evaluation.priceVolume = null;
  await page.route("**/api/pullback-watch**", (route) => {
    const symbol = new URL(route.request().url()).searchParams.get("symbol");
    return route.fulfill({ json: symbol ? { item: { ...pending, symbol } } :
      { watches: [{ symbol: "TEST", notify: false, trusted_firms: ["CFRA", "Argus"], snapshot: pending }], events: [] } });
  });
  await page.goto("/watchlist/pullback?previewPlan=pro");
  await acknowledgeLegal(page);
  await expect(page.getByRole("link", { name: "TEST 1 of 2 firms View evidence", exact: false })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Analyst Support", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("link", { name: "View alert", exact: true })).toHaveCount(0);
});

test("Today places the compact card between Market Thesis and Sigi and integrates desktop Emerging Setups", async ({ page }) => {
  await page.route("**/api/pullback-watch**", (route) => {
    const symbol = new URL(route.request().url()).searchParams.get("symbol");
    return route.fulfill({ json: symbol ? { item: item(symbol) } : { watches: [], events: [event()] } });
  });
  await page.goto("/today?previewPlan=pro");
  await acknowledgeLegal(page);
  const home = page.locator("#sigi-command-panel");
  const card = home.getByRole("region", { name: "Pullback Watch", exact: true });
  await expect(card).toBeVisible();
  const thesisBox = await home.getByText("Market thesis", { exact: true }).boundingBox();
  const cardBox = await card.boundingBox();
  const sigiBox = await home.locator("summary").filter({ hasText: "Ask Sigi" }).boundingBox();
  expect(thesisBox && cardBox && thesisBox.y < cardBox.y).toBe(true);
  expect(sigiBox && cardBox && cardBox.y + cardBox.height <= sigiBox.y).toBe(true);
  expect(await card.getByRole("tabpanel").getByRole("link").count()).toBeLessThanOrEqual(3);
  await expect(page.getByRole("navigation", { name: "Mobile navigation", exact: true }).getByRole("link")).toHaveCount(5);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const emerging = page.locator("section").filter({ has: page.getByRole("heading", { name: "Emerging Setups", exact: true }) });
  await expect(emerging.getByRole("region", { name: "Pullback Watch", exact: true })).toHaveCount(1);
  await expect(emerging.getByRole("region", { name: "Pullback Watch", exact: true })).toBeVisible();
});
