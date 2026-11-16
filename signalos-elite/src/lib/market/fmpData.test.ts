import { afterEach, describe, expect, it, vi } from "vitest";
import { getFmpBars, getFmpQuoteMap, parseFmpDate } from "./fmpData";
import { normalizeFmpQuote } from "./fmpQuote";
import { getMassiveFundamentals } from "./massiveFundamentals";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function provider(handler: (url: URL) => unknown): ReturnType<typeof vi.fn> {
  vi.stubEnv("FMP_API_KEY", "fmp-test-only");
  vi.stubEnv("MASSIVE_API_KEY", "cancelled-provider");
  vi.stubEnv("POLYGON_API_KEY", "cancelled-provider");
  const fetcher = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    expect(url.hostname).toBe("financialmodelingprep.com");
    expect(url.searchParams.get("apikey")).toBe("fmp-test-only");
    return Response.json(handler(url));
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

describe("FMP market-data migration", () => {
  it("parses exchange-local minutes with winter and summer offsets independently of server timezone", () => {
    expect(parseFmpDate("2026-11-13 09:30:00")).toBe(Date.parse("2026-11-13T14:30:00Z"));
    expect(parseFmpDate("2026-07-13 09:30:00")).toBe(Date.parse("2026-07-13T13:30:00Z"));
    expect(parseFmpDate("2026-11-13")).toBe(Date.parse("2026-11-13T05:00:00Z"));
    expect(parseFmpDate("unavailable")).toBeNull();
  });

  it("uses one FMP batch for stocks and true indexes without ETF scaling or cancelled providers", async () => {
    const fetcher = provider((url) => {
      expect(url.pathname).toBe("/stable/batch-quote");
      expect(url.searchParams.get("symbols")).toBe("AAPL,^GSPC");
      return [{ symbol: "^GSPC", price: 6000, previousClose: 5990 }, { symbol: "AAPL", price: 100 }];
    });
    const quotes = await getFmpQuoteMap(["AAPL", "SPX", "AAPL"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(normalizeFmpQuote("SPX", quotes.get("^GSPC")!)).toMatchObject({
      source: "true-index", price: 6000, prevClose: 5990, change: 10, updatedMs: null,
    });
  });

  it("sorts and deduplicates minute bars, rejects invalid OHLC, and aggregates unsupported two-minute intervals", async () => {
    provider((url) => {
      expect(url.pathname).toBe("/stable/historical-chart/1min");
      return [
        { date: "2026-11-13 09:31:00", open: 11, high: 14, low: 10, close: 13, volume: 200 },
        { date: "2026-11-13 09:30:00", open: 10, high: 12, low: 9, close: 11, volume: 100 },
        { date: "2026-11-13 09:30:00", open: 10, high: 12, low: 9, close: 11, volume: 100 },
        { date: "2026-11-13 09:32:00", open: null, high: 1, low: 0, close: 0 },
      ];
    });
    const bars = await getFmpBars("AAPL", "2026-11-13", "2026-11-13", "2m");
    expect(bars).toEqual([{ timestamp: Date.parse("2026-11-13T14:30:00Z"), open: 10, high: 14, low: 9, close: 13, volume: 300 }]);
  });

  it("queries intraday days separately so an empty current day cannot hide earlier sessions", async () => {
    const fetcher = provider((url) => {
      const start = Date.parse(url.searchParams.get("from")!);
      const end = Date.parse(url.searchParams.get("to")!);
      if (url.pathname.includes("historical-chart")) {
        expect(end).toBe(start);
        if (url.searchParams.get("from") === "2026-10-15") return [];
      }
      return [{ date: url.searchParams.get("from"), open: 10, high: 12, low: 9, close: 11, volume: 1 }];
    });
    expect(await getFmpBars("AAPL", "2026-10-13", "2026-10-15", "1m")).toHaveLength(2);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(await getFmpBars("AAPL", "2026-10-13", "2026-10-15", "1d")).toHaveLength(1);
  });

  it("maps FMP financial statement units, annual revenue order, total debt and dividend percentage", async () => {
    provider((url) => {
      if (url.pathname.endsWith("/profile")) return [{ companyName: "Apple", sector: "Technology", averageVolume: 300 }];
      if (url.pathname.endsWith("/quote")) return [{ symbol: "AAPL", price: 100, marketCap: 1_000_000, volume: 250 }];
      if (url.pathname.endsWith("/ratios-ttm")) return [{ priceToEarningsRatioTTM: 25, priceToEarningsGrowthRatioTTM: 2, dividendYieldTTM: 0.02 }];
      if (url.pathname.endsWith("/balance-sheet-statement")) return [{ totalDebt: 800, cashAndCashEquivalents: 500 }];
      return [{ date: "2024-09-30", revenue: 200 }, { date: "2025-09-30", revenue: 300, netIncome: 50 }, { date: "2023-09-30", revenue: 100 }];
    });
    expect(await getMassiveFundamentals("AAPL")).toMatchObject({
      pe: 25, peg: 2, dividendYield: 2, debt: 800, cash: 500, avgVolume: 300,
      revenue: 300, previousRevenue: 200, twoYearsAgoRevenue: 100, marketCap: 1_000_000,
    });
  });

  it("surfaces provider entitlement errors without falling back to another provider", async () => {
    vi.stubEnv("FMP_API_KEY", "fmp-test-only");
    const fetcher = vi.fn(async () => new Response(null, { status: 402 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(getFmpBars("AAPL", "2026-11-13", "2026-11-13")).rejects.toThrow("subscription");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
