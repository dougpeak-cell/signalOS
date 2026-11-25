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

    test("removes the stale signal-match badge without removing screener results", async ({ page }) => {
      await mockStockAlerts(page);
      await page.goto("/screener?previewPlan=pro");
      await expect(page.getByRole("heading", { name: "Best Stocks Right Now", exact: true })).toBeVisible();
      await expect(page.getByText(/^\d+ signal match(?:es)?(?::.*)?$/i)).toHaveCount(0);
      await expect(page.getByText("70/100", { exact: true }).filter({ visible: true }).first()).toBeVisible();
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
      await expect(page.getByRole("heading", { name: "Watchlist", exact: true }).first()).toBeVisible();
      const remove = page.getByRole("button", { name: "Delete MSFT from watchlist" });
      await expect(remove).toHaveCount(0);
      await page.getByRole("button", { name: "Edit", exact: true }).click();
      await remove.click();
      await expect(remove).toHaveCount(0);
      await page.getByRole("button", { name: "Undo", exact: true }).click();
      await expect(remove).toBeVisible();
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

test("phone expert desk deduplicates published calls and keeps research filters between sources", async ({ page }) => {
  await mockStockAlerts(page);
  const call = { symbol:"MSFT", sector:"Technology", publishedDate:"2026-11-22", ratingTransition:"upgrade", currentGrade:"Buy", previousGrade:"Hold", recencyBucket:"week", firm:"Test desk", score:70 };
  await page.route("**/api/experts/fmp", route => route.fulfill({json:{ok:true, rows:[call],
    sectorRows:{Technology:[{...call, publishedDate:"2026-11-19", firm:"Older desk"}], Energy:[{...call, symbol:"XOM", sector:"Energy", ratingTransition:"downgrade"}]}}}));
  await page.goto("/experts?previewPlan=pro");
  await acknowledgeLegal(page);
  const calls = page.getByRole("region", {name:"Analyst ratings"});
  await expect(calls.getByRole("listitem")).toHaveCount(2);
  await expect(calls.getByText("Older desk", {exact:false})).toHaveCount(0);
  await calls.getByLabel("Sector").selectOption("Technology");
  await expect(calls.getByRole("listitem")).toHaveCount(1);
  await calls.getByText("Targets and research").click();
  await expect(calls.getByRole("link", {name:/MSFT analyst history/})).toBeVisible();
  await page.getByLabel("Research source").selectOption("Senate");
  await expect(calls).toHaveCount(0);
  await page.getByLabel("Research source").selectOption("Analysts");
  await expect(calls.getByLabel("Sector")).toHaveValue("Technology");
  await calls.getByLabel("Rating action").selectOption("downgrade");
  await expect(calls.getByRole("status")).toHaveText("No recent calls match these filters.");
});

test("phone alert fits on the profile row without consuming a second header row", async ({ page }) => {
  await mockStockAlerts(page);
  for (const path of ["/today", "/watchlist"]) {
    await page.goto(`${path}?previewPlan=pro`);
    const alert = alertButton(page);
    await expect(alert).toHaveClass(/bg-red-700/);
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const profile = page.locator('header button[aria-haspopup="menu"]:visible').first();
      const [a, p, h] = await Promise.all([alert.boundingBox(), profile.boundingBox(), alert.locator("xpath=ancestor::header").boundingBox()]);
      expect(a && p && h).toBeTruthy();
      expect(Math.abs(a!.y + a!.height / 2 - p!.y - p!.height / 2)).toBeLessThan(2);
      expect(a!.x + a!.width).toBeLessThanOrEqual(p!.x);
      expect(p!.x + p!.width).toBeLessThanOrEqual(width);
      expect(h!.height).toBeLessThanOrEqual(58);
    }
  }
});

test("rotating a phone hides chart navigation and restores it in portrait", async ({ page }) => {
  await mockStockAlerts(page);
  const portrait = { width: 390, height: 844 };
  const landscape = { width: 844, height: 390 };
  const nav = page.getByRole("navigation", { name: "Mobile navigation", exact: true });
  for (const path of ["/vision?symbol=MSFT", "/stocks/MSFT/live", "/stocks/MSFT/workspace"]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(path.split("?")[0] + "(?:\\?|$)"));
    await expect(nav).toBeVisible();
    await page.setViewportSize(landscape);
    await expect(nav).toBeHidden();
    await page.setViewportSize(portrait);
    await expect(nav).toBeVisible();
  }
  await page.setViewportSize(landscape);
  await page.goto("/watchlist");
  await expect(nav).toBeVisible();
});

test("phone Live Chart keeps the selected candles while inspecting the plan and research", async ({ page }) => {
  await mockStockAlerts(page);
  await page.goto("/stocks/MSFT/live?previewPlan=pro");
  await acknowledgeLegal(page);
  const chart = page.locator("#live-day-chart");
  const interval = chart.getByRole("button", {name:"15m", exact:true});
  await interval.click();
  await expect(interval).toHaveAttribute("aria-pressed", "true");
  const canvas = chart.locator("canvas").first();
  await expect(canvas).toBeAttached();
  const original = await canvas.elementHandle();
  for (const name of ["Trade Plan", "Research", "Overview"]) {
    await page.getByRole("tab", {name, exact:true}).click();
    await expect(page.getByRole("tabpanel", {name, exact:true})).toBeVisible();
    if (name === "Research") await expect(page.getByText("Sigi Investment Thesis", {exact:true})).toBeVisible();
    await expect(interval).toHaveAttribute("aria-pressed", "true");
    expect(await canvas.evaluate((el, previous) => el === previous, original)).toBe(true);
  }
  await chart.getByRole("button", {name:"Chart settings", exact:true}).click();
  await expect(page.getByText("MSFT Chart Controls", {exact:true})).toBeVisible();
});

test("phone Today opens the leading watchlist move and explains its direction", async ({ page }) => {
  await mockStockAlerts(page);
  await page.goto("/today?previewPlan=pro");
  await acknowledgeLegal(page);
  const brief = page.getByRole("region", { name: "Watchlist briefing" });
  await brief.getByRole("link", { name: /AAPL.*Large daily move/ }).click();
  await expect(page).toHaveURL(/\/alerts#red$/);
  await page.getByLabel("Why this alert for AAPL?").click();
  await expect(page.getByText(/AAPL is down 7.00% from the previous close/)).toBeVisible();
});

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

test.describe("Mobile Sigi welcome", () => {
  async function openCommand(page: Page): Promise<void> {
    await expect(alertButton(page)).toHaveAttribute("aria-label", /Alerts: 3 stocks/);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("signalos:mobile-sigi-open")));
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Sigi Command", exact: true })).toBeVisible();
  }

  test("shows a name input, accepts Return, and saves selected sector interests", async ({ page }) => {
    await mockStockAlerts(page);
    await page.goto("/alerts?previewPlan=pro");
    await openCommand(page);
    const dialog = page.getByRole("dialog");
    const greeting = dialog.getByRole("heading", { name: "Hi, I'm Sigi. What's your name?", exact: true });
    await expect(greeting).toBeFocused();
    const name = dialog.getByRole("textbox", { name: "Your name", exact: true });
    await expect(name).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
    await name.fill(" ");
    await expect(dialog.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
    await name.fill("");
    await name.pressSequentially("Sample", { delay: 80 });
    await expect(name).toHaveValue("Sample");
    await expect(name).toBeFocused();
    await name.press("Enter");
    await expect(dialog.getByRole("heading", { name: "Hi Sample, help me know your interests.", exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Technology", exact: true }).click();
    await dialog.getByRole("button", { name: "AI", exact: true }).click();
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Update sectors", exact: true })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("sigiProfile")!))).toEqual({
      name: "Sample", interests: ["Technology", "AI"],
    });
  });

  test("allows a saved profile without a name to finish setup without losing interests", async ({ page }) => {
    await mockStockAlerts(page);
    await page.addInitScript(() => localStorage.setItem("sigiProfile", JSON.stringify({ name: "", interests: ["AI"] })));
    await page.goto("/alerts?previewPlan=pro");
    await openCommand(page);
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Your name", exact: true }).fill("Sample");
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("sigiProfile")!))).toEqual({
      name: "Sample", interests: ["AI"],
    });
  });

  test("reopens at the greeting instead of the ticker keyboard and keeps sector editing available", async ({ page }) => {
    await mockStockAlerts(page);
    await page.addInitScript(() => localStorage.setItem("sigiProfile", JSON.stringify({ name: "Sample", interests: ["AI"] })));
    await page.goto("/alerts?previewPlan=pro");
    await openCommand(page);
    const dialog = page.getByRole("dialog");
    const greeting = dialog.getByRole("heading", { name: "Hi, I'm Sigi. Sample, what do you want to know today?", exact: true });
    await expect(greeting).toBeFocused();
    const ticker = dialog.getByPlaceholder("Stock/Ticker?", { exact: true });
    await ticker.fill("NVDA");
    await expect(ticker).toBeFocused();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await openCommand(page);
    await expect(greeting).toBeFocused();
    const position = await greeting.evaluate((element) => {
      const scroller = element.closest(".overflow-y-auto");
      return { top: element.getBoundingClientRect().top, scrollTop: scroller?.scrollTop };
    });
    expect(position.scrollTop).toBe(0);
    expect(position.top).toBeLessThan(844 / 2);
    await expect(ticker).not.toBeFocused();
    await dialog.getByRole("button", { name: "Update sectors", exact: true }).click();
    await expect(dialog.getByRole("heading", { name: "Update sectors for Sample.", exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Reset SIGI profile", exact: true }).click();
    await expect(dialog.getByRole("textbox", { name: "Your name", exact: true })).toBeVisible();
  });

  test("keeps explicit auto-submitted reads response-first and restores the greeting on a normal open", async ({ page }) => {
    await mockStockAlerts(page);
    await page.addInitScript(() => localStorage.setItem("sigiProfile", JSON.stringify({ name: "Sample", interests: ["AI"] })));
    await page.goto("/alerts?previewPlan=pro");
    await expect(alertButton(page)).toHaveAttribute("aria-label", /Alerts: 3 stocks/);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("signalos:mobile-sigi-open", {
      detail: { prompt: "What matters right now?", autoSubmit: true },
    })));
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator("h2").first()).toHaveText("Sigi Read");
    await expect(dialog.getByRole("heading", { name: /^Hi, I'm Sigi/ })).toHaveCount(0);
    await expect(dialog.getByPlaceholder("Stock/Ticker?", { exact: true })).toHaveCount(0);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await openCommand(page);
    await expect(dialog.getByRole("heading", { name: "Hi, I'm Sigi. Sample, what do you want to know today?", exact: true })).toBeFocused();
  });
});
