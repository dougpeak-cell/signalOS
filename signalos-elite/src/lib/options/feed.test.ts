import { afterEach, describe, expect, it, vi } from "vitest";
import { loadOptionsFeed, normalizeOption } from "./feed";
import { fetchFmpRows } from "@/lib/experts/fmpClient";

vi.mock("@/lib/experts/fmpClient", async () => ({
  ...await vi.importActual<typeof import("@/lib/experts/fmpClient")>("../experts/fmpClient"), fetchFmpRows: vi.fn(),
}));

const now = new Date("2026-10-30T15:00:00Z");
const source = {
  details: { ticker: "O:AAPL261120C00100000", contract_type: "call", expiration_date: "2026-11-20", strike_price: 100, shares_per_contract: 100, exercise_style: "american" },
  underlying_asset: { ticker: "AAPL" },
  last_quote: { bid: 4, ask: 5, last_updated: 1793372400000000000, timeframe: "DELAYED" },
  day: { volume: 0, last_updated: 1793372400000000000 }, open_interest: 120,
  greeks: { delta: 0.5, theta: -0.02 }, implied_volatility: 0.3,
};
const originalKey = process.env.MASSIVE_API_KEY;
afterEach(() => {
  vi.unstubAllGlobals(); vi.clearAllMocks();
  if (originalKey === undefined) delete process.env.MASSIVE_API_KEY;
  else process.env.MASSIVE_API_KEY = originalKey;
});

function fmp(): void {
  vi.mocked(fetchFmpRows).mockImplementation(async (path) => path === "quote"
    ? [{ symbol: "AAPL", name: "Apple Inc.", price: 100, changePercentage: -1, timestamp: now.getTime() / 1000 }]
    : path === "earnings" ? [{ symbol: "AAPL", date: "2026-11-01" }]
    : path === "grades-consensus" ? [{ symbol: "AAPL", consensus: "Buy" }] : [{ symbol: "AAPL", targetConsensus: 120 }]);
  process.env.MASSIVE_API_KEY = "options-test-key";
}

describe("options data adapter", () => {
  it("preserves genuine zeroes, signed Greeks, provider recency and missing fields", () => {
    const option = normalizeOption(source, "AAPL", "2026-11-20");
    expect(option).toMatchObject({ bid: 4, ask: 5, volume: 0, openInterest: 120, delta: 0.5, theta: -0.02, gamma: null, timeframe: "DELAYED" });
    expect(option?.quoteAt).toBe(now.toISOString());
    expect(normalizeOption(source, "MSFT", "2026-11-20")).toBeNull();
    expect(normalizeOption(source, "AAPL", "2026-12-18")).toBeNull();
  });
  it("preserves FMP research when options entitlement is denied", async () => {
    fmp(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Restricted", { status: 403 })));
    const feed = await loadOptionsFeed("AAPL", null, now);
    expect(feed.chainStatus).toBe("unavailable");
    expect(feed.chainError).toContain("subscription");
    expect(feed.contracts).toEqual([]);
    expect(feed.stock).toMatchObject({ price: 100, consensus: "Buy", earningsDate: "2026-11-01" });
    expect(JSON.stringify(feed)).not.toContain("options-test-key");
  });
  it("keeps delayed aggregate closes separate from absent quotes and trades", () => {
    const option = normalizeOption({ ...source, last_quote: undefined, day: { ...source.day, close: 8.44 } }, "AAPL", "2026-11-20");
    expect(option).toMatchObject({ sessionClose: 8.44, bid: null, ask: null, quoteAt: null, last: null, lastAt: null, impliedVolatility: 0.3 });
    expect(normalizeOption({ ...source, day: { volume: 0 } }, "AAPL", "2026-11-20")?.sessionClose).toBeNull();
  });
  it("loads and deduplicates selected-expiration contracts", async () => {
    fmp(); vi.stubGlobal("fetch", vi.fn().mockImplementation(async (input) =>
      String(input).includes("/reference/") ? Response.json({ results: [{ expiration_date: "2026-11-20" }] })
        : Response.json({ results: [source, source] })));
    const feed = await loadOptionsFeed("AAPL", null, now);
    expect(feed.chainStatus).toBe("available");
    expect(feed.contracts).toHaveLength(1);
    expect(feed.expiration).toBe("2026-11-20");
  });
  it("rejects unsafe pagination instead of leaking credentials", async () => {
    fmp(); const fetcher = vi.fn().mockResolvedValue(Response.json({ results: [{ expiration_date: "2026-11-20" }], next_url: "https://example.com/v3/reference/options/contracts" }));
    vi.stubGlobal("fetch", fetcher);
    const feed = await loadOptionsFeed("AAPL", null, now);
    expect(feed.chainStatus).toBe("unavailable");
    expect(feed.chainError).toContain("invalid pagination");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("does not replace missing FMP facts with example data", async () => {
    fmp(); vi.mocked(fetchFmpRows).mockRejectedValue(new Error("unavailable"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ results: [] })));
    const feed = await loadOptionsFeed("AAPL", null, now);
    expect(feed.stock.price).toBeNull();
    expect(feed.stock.consensus).toBeNull();
    expect(feed.warnings).toHaveLength(4);
    await expect(loadOptionsFeed("../bad", null, now)).rejects.toThrow("valid US");
    await expect(loadOptionsFeed("AAPL", "2026-02-31", now)).rejects.toThrow("valid expiration");
  });
});