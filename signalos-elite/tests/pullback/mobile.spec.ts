import { expect, test, type Page } from "@playwright/test";
import { event, item } from "./fixtures";

async function acknowledgeLegal(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: "Before you continue", exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "I understand investing and trading", exact: false }).check();
  await page.getByRole("checkbox", { name: "I agree to the Terms", exact: false }).check();
  await page.getByRole("checkbox", { name: "I understand Sigi AI", exact: false }).check();
  await page.getByRole("button", { name: "Continue to SigiOS", exact: true }).click();
}

async function mockStockAlerts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("signalos:watchlist", JSON.stringify(["NVDA", "MSFT", "AAPL"]));
    localStorage.setItem("signalos.watchlist.seeded.v1", "1");
  });
  await page.context().addCookies([{
    name: "signalos-dev-preview-plan", value: "pro", url: test.info().project.use.baseURL ?? "http://localhost:3100",
  }]);
  await page.route("**/api/intelligence**", (route) => route.fulfill({
    json: { ok: true, hasAccountSession: false, watchlist: [], portfolio: [] },
  }));
  await page.route("**/api/massive/quotes**", (route) => {
    const tickers = new URL(route.request().url()).searchParams.get("tickers")!.split(",");
    const moves: Record<string, number> = { NVDA: 2, MSFT: -2 / 3, AAPL: -7 };
    return route.fulfill({ json: { quotes: tickers.map((ticker) => ({
      ticker, price: 100, changePercent: moves[ticker] ?? 0,
    })) } });
  });
}

async function setWatchlist(page: Page, tickers: string[]): Promise<void> {
  await page.evaluate((tickers) => {
    Object.keys(localStorage).filter((key) => /watchlist/i.test(key)).forEach((key) => localStorage.removeItem(key));
    localStorage.setItem("signalos:watchlist", JSON.stringify(tickers));
    localStorage.setItem("signalos.watchlist.seeded.v1", "1");
    window.dispatchEvent(new Event("signalos:watchlist-updated"));
  }, tickers);
}

function alertButton(page: Page) {
  return page.locator('header a[href="/alerts"]:visible').first();
}

for (const device of [
  { name: "phone", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: "desktop", viewport: { width: 1440, height: 1000 }, isMobile: false, hasTouch: false },
]) {
  test.describe(`Score alerts on ${device.name}`, () => {
    test.use({ viewport: device.viewport, isMobile: device.isMobile, hasTouch: device.hasTouch });

    test("groups exact score thresholds and daily movers, and updates header priority after watchlist edits", async ({ page }) => {
      await mockStockAlerts(page);
      await page.goto("/alerts?previewPlan=pro");
      await expect(alertButton(page)).toHaveAttribute("aria-label", /Alerts: 3 stocks/);
      await expect(alertButton(page)).toHaveClass(/bg-red-700/);
      await expect(page.locator("#red")).toContainText("AAPL");
      await expect(page.locator("#red")).toContainText("-7.00% today");
      await expect(page.locator("#green")).toContainText("NVDA");
      await expect(page.locator("#green")).toContainText("70/100 points");
      await expect(page.locator("#yellow")).toContainText("MSFT");
      await expect(page.locator("#yellow")).toContainText("55/100 points");
      await expect(page.getByRole("tablist", { name: "Pullback alert stage" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Notify me", exact: true })).toHaveCount(0);
      if (device.isMobile) {
        await expect(page.getByRole("navigation", { name: "Mobile navigation", exact: true }).getByRole("link")).toHaveCount(5);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      await setWatchlist(page, ["NVDA", "MSFT"]);
      await expect(alertButton(page)).toHaveAttribute("aria-label", /Alerts: 2 stocks/);
      await expect(alertButton(page)).toHaveClass(/bg-green-500/);
      await setWatchlist(page, ["MSFT"]);
      await expect(alertButton(page)).toHaveAttribute("aria-label", /Alerts: 1 stock\./);
      await expect(alertButton(page)).toHaveClass(/bg-yellow-400/);
      await setWatchlist(page, []);
      await expect(alertButton(page)).toHaveAttribute("aria-label", /Alerts: 0 stocks/);
      await expect(alertButton(page)).toHaveClass(/bg-transparent/);
    });

    test("redirects the retired page and uses the same score on searched screener results", async ({ page }) => {
      await mockStockAlerts(page);
      await page.goto("/watchlist/pullback?previewPlan=pro");
      await expect(page).toHaveURL(/\/alerts\?previewPlan=pro$/);
      await expect(page.locator("#green")).toContainText("70/100 points");
      await page.goto("/screener?q=NVDA&previewPlan=pro");
      await expect(page.getByText("70/100", { exact: true }).filter({ visible: true }).first()).toBeVisible();
      await expect(alertButton(page)).toHaveAttribute("href", "/alerts");
    });

    test("shows quote outages without stale signal colors", async ({ page }) => {
      await mockStockAlerts(page);
      await page.goto("/alerts?previewPlan=pro");
      await expect(alertButton(page)).toHaveClass(/bg-red-700/);
      await page.route("**/api/massive/quotes**", (route) => route.fulfill({ status: 503, json: { error: "Quote outage" } }));
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect(page.getByRole("alert").filter({ hasText: "Stock alert quotes are unavailable" })).toBeVisible();
      await expect(alertButton(page)).toHaveClass(/bg-transparent/);
      await expect(alertButton(page)).toContainText("!");
    });
  });

  test.describe(`Watchlist actions on ${device.name}`, () => {
    test.use({ viewport: device.viewport, isMobile: device.isMobile, hasTouch: device.hasTouch });

    test("Sigi Alerts expands in place with the new color groups", async ({ page }) => {
      await mockStockAlerts(page);
      await page.goto("/watchlist?mode=quick&previewPlan=pro");
      await acknowledgeLegal(page);
      const alerts = page.getByRole("region", { name: "Sigi Alerts", exact: true });
      const toggle = alerts.locator("summary").first();
      const red = alerts.getByRole("heading", { name: "Red - Daily movers", exact: false });
      await expect(toggle).toBeVisible();
      await expect(red).toBeHidden();
      if (device.isMobile) await toggle.tap();
      else {
        await toggle.focus();
        await page.keyboard.press("Enter");
      }
      await expect(red).toBeVisible();
      await expect(alerts.getByText(/Watchlist stocks use the same scores as the screener/)).toBeVisible();
      await toggle.click();
      await expect(red).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });

    test("removes the condensed summary and opens the matching stock from Detail View", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("signalos:watchlist", JSON.stringify(["MSFT", "NVDA"]));
        localStorage.setItem("signalos.watchlist.v1", JSON.stringify([{ ticker: "MSFT" }, { ticker: "NVDA" }]));
        localStorage.setItem("signalos.watchlist.seeded.v1", "1");
      });
      await page.goto("/watchlist?mode=quick&previewPlan=smart");
      await acknowledgeLegal(page);
      await expect(page.getByText("Condensed Watchlist", { exact: true })).toBeVisible();
      await expect(page.getByRole("region", { name: "Watchlist Pulse changes", exact: true })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /^Check Pulse for / })).toHaveCount(0);
      await page.goto("/watchlist?mode=detail&previewPlan=smart");
      for (const ticker of ["MSFT", "NVDA"]) {
        const action = page.getByRole("link", { name: `Check Pulse for ${ticker}`, exact: true });
        await expect(action).toBeVisible();
        await expect(action).toHaveAttribute("href", `/pulse?symbol=${ticker}`);
      }
      await expect(page.getByRole("region", { name: "Watchlist Pulse changes", exact: true })).toHaveCount(0);
      await page.getByRole("link", { name: "Check Pulse for MSFT", exact: true }).click();
      await expect(page).toHaveURL(/\/pulse\?symbol=MSFT$/);
    });
  });
}

test("saved legacy research evidence remains accessible directly in Vision", async ({ page }) => {
  const saved = event();
  await page.route("**/api/pullback-watch**", (route) => {
    const params = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: params.has("event") ? { event: saved } : params.has("symbol")
      ? { item: item(params.get("symbol")!) } : { watches: [], events: [] } });
  });
  await page.route("**/api/experts/institutional-activity**", (route) => route.fulfill({
    json: { ok: true, activity: { symbol: "TEST", through: "2026-11-19", funds: [], quarters: [], warnings: [] } },
  }));
  await page.goto(`/vision?symbol=TEST&pullbackWatch=1&stage=price-volume&event=${saved.id}&previewPlan=pro`);
  await acknowledgeLegal(page);
  const evidence = page.getByRole("region", { name: "Pullback alert evidence" });
  await expect(evidence.getByRole("heading", { name: "Why did Sigi alert me?" })).toBeVisible();
  await expect(evidence.getByText("TEST · Price & Volume", { exact: true })).toBeVisible();
  await expect(evidence.getByText("Quote:", { exact: false })).toContainText("11:20");
});
