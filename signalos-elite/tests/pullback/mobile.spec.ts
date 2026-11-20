import { expect, test, type Page } from "@playwright/test";
import { earlyEvent, event, item, now, watch as savedWatch } from "./fixtures";

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

test("red phone header button opens the matching saved follow-up, including at narrow widths", async ({ page }) => {
  const saved = event();
  await page.route("**/api/pullback-watch**", (route) => {
    const params = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: params.has("event") ? { event: saved } : params.has("symbol") ?
      { item: item(params.get("symbol")!) } : { watches: [savedWatch()], events: [event("analyst"), saved] } });
  });
  await page.route("**/api/experts/institutional-activity**", (route) => route.fulfill({
    json: { ok: true, activity: { symbol: "TEST", through: "2026-11-19", funds: [], quarters: [], warnings: [] } },
  }));
  await page.goto("/watchlist/pullback?previewPlan=pro");
  await acknowledgeLegal(page);
  const alert = page.getByRole("banner").getByRole("link", { name: /^Alerts: 2 saved\. Open TEST Price & Volume update/ });
  await expect(alert).toBeVisible();
  await expect(alert).toHaveClass(/bg-red-700/);
  const box = await alert.boundingBox();
  expect(box && box.x > 390 / 2 && box.x + box.width >= 366 && box.y < 120 && box.height >= 44).toBe(true);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await alert.click();
  await expect(page).toHaveURL(new RegExp(`event=${saved.id}`));
  await expect(page.getByRole("region", { name: "Pullback alert evidence" }).getByText("TEST · Price & Volume", { exact: true })).toBeVisible();
  await page.goto("/pulse?previewPlan=pro");
  await expect(page.getByRole("banner").getByRole("link", { name: /^Alerts: 2 saved/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test.describe("desktop alert action", () => {
test.use({ viewport: { width: 1440, height: 1000 }, isMobile: false, hasTouch: false });
test("desktop headers keep the alert action across app, news, workspace and Pulse screens", async ({ page }) => {
  await page.route("**/api/pullback-watch**", (route) => {
    const symbol = new URL(route.request().url()).searchParams.get("symbol");
    return route.fulfill({ json: symbol ? { item: item(symbol) } : { watches: [savedWatch()], events: [event()] } });
  });
  await page.goto("/watchlist/pullback?previewPlan=pro");
  await acknowledgeLegal(page);
  for (const path of ["/watchlist/pullback", "/news", "/workspace", "/pulse"]) {
    await page.goto(`${path}?previewPlan=pro`);
    const alert = page.getByRole("banner").getByRole("link", { name: /^Alerts: 1 saved/ });
    await expect(alert).toBeVisible();
    await expect(alert).toHaveAttribute("href", new RegExp(`event=${event().id}`));
    const box = await alert.boundingBox();
    const header = await page.getByRole("banner").boundingBox();
    expect(box && header && box.x + box.width >= header.x + header.width - 30).toBe(true);
  }
  await page.goto("/watchlist/pullback?previewPlan=pro");
  for (const width of [1280, 1536, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    const alert = page.getByRole("banner").getByRole("link", { name: /^Alerts: 1 saved/ });
    await expect(alert).toBeVisible();
    const box = await alert.boundingBox();
    expect(box && box.x + box.width <= width).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
});

test("empty or failed inboxes do not invent alert updates or counts", async ({ page }) => {
  let failed = false;
  let releaseInbox!: () => void;
  const inboxReady = new Promise<void>((resolve) => { releaseInbox = resolve; });
  await page.route("**/api/pullback-watch**", async (route) => {
    await inboxReady;
    await route.fulfill({
    status: failed ? 503 : 200,
    json: failed ? { error: "Saved alert inbox unavailable." } :
      new URL(route.request().url()).searchParams.has("symbol") ? { item: item() } : { watches: [], events: [] },
    });
  });
  await page.goto("/watchlist/pullback?previewPlan=pro");
  await acknowledgeLegal(page);
  const header = page.getByRole("banner");
  const checking = header.getByRole("link", { name: "Alerts: checking saved updates.", exact: true });
  await expect(checking).toHaveClass(/border-teal-400\/70/);
  await expect(checking).toHaveClass(/bg-transparent/);
  await expect(checking).not.toHaveClass(/bg-red-/);
  releaseInbox();
  const empty = header.getByRole("link", { name: "Alerts: no active updates. Open Pullback Watch.", exact: true });
  await expect(empty).toHaveAttribute("href", "/watchlist/pullback");
  await expect(empty).toHaveClass(/bg-transparent/);
  await expect(empty).not.toHaveClass(/bg-red-/);
  failed = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  const unavailable = header.getByRole("link", { name: /^Alerts unavailable:/ });
  await expect(unavailable).toHaveAttribute("href", "/watchlist/pullback");
  await expect(unavailable).toContainText("!");
  await expect(unavailable).toHaveClass(/bg-transparent/);
  await expect(unavailable).not.toHaveClass(/bg-red-/);
});

test("yellow early evidence opens the exact event, red requires full confirmation, and pausing returns to green outline", async ({ page }) => {
  const early = earlyEvent();
  let confirmed = false;
  let notify = true;
  await page.clock.setFixedTime(now);
  await page.route("**/api/pullback-watch**", (route) => {
    const request = route.request();
    const params = new URL(request.url()).searchParams;
    if (request.method() === "POST") {
      notify = request.postDataJSON().notify;
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ json: params.has("event") ? { event: params.get("event") === early.id ? early : event() } :
      params.has("symbol") ? { item: confirmed ? item() : early.evidence } :
      { watches: [{ ...savedWatch(), notify }], events: confirmed ? [early, event()] : [early] } });
  });
  await page.goto("/watchlist/pullback?previewPlan=pro");
  await acknowledgeLegal(page);
  const header = page.getByRole("banner");
  const yellow = header.getByRole("link", { name: /^Alerts: 1 saved\. Open TEST Early Signal/ });
  await expect(yellow).toHaveClass(/bg-yellow-400/);
  await expect(yellow).not.toHaveClass(/bg-red-/);
  await yellow.click();
  const evidence = page.getByRole("region", { name: "Pullback alert evidence" });
  await expect(evidence.getByText("TEST · Early Signal", { exact: true })).toBeVisible();
  await expect(evidence.getByText("CFRA: Hold to Buy.", { exact: true })).toBeVisible();
  confirmed = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(header.getByRole("link", { name: /^Alerts: 2 saved\. Open TEST Price & Volume/ })).toHaveClass(/bg-red-700/);
  await page.goto("/watchlist/pullback?previewPlan=pro");
  await page.getByRole("region", { name: "Pullback Watch", exact: true }).getByRole("button", { name: "Pause notifications", exact: true }).first().click();
  const neutral = header.getByRole("link", { name: "Alerts: no active updates. Open Pullback Watch.", exact: true });
  await expect(neutral).toHaveClass(/bg-transparent/);
  await expect(neutral).toHaveClass(/border-teal-400\/70/);
  await expect(page.getByText("Saved in-app alerts", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Mobile navigation", exact: true }).getByRole("link")).toHaveCount(5);
});
