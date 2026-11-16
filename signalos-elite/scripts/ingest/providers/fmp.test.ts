import { afterEach, describe, expect, it, vi } from "vitest";
import { fmpProvider } from "./fmp";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("FMP ingest", () => {
  it("ingests stable daily arrays rather than expecting the retired historical wrapper", async () => {
    vi.stubEnv("FMP_API_KEY", "ingest-test");
    const fetcher = vi.fn(async (url: string) => {
      expect(new URL(url).hostname).toBe("financialmodelingprep.com");
      return Response.json([{ date: "2026-11-13", open: 100, high: 102, low: 99, close: 101, volume: 200 }]);
    });
    vi.stubGlobal("fetch", fetcher);
    expect(await fmpProvider.fetchDailyBars({ tickers: ["AAPL"], from: "2026-11-13", to: "2026-11-13" })).toEqual([
      { ticker: "AAPL", d: "2026-11-13", open: 100, high: 102, low: 99, close: 101, volume: 200, vwap: null },
    ]);
  });

  it("rejects provider error objects instead of reporting an empty successful ingest", async () => {
    vi.stubEnv("FMP_API_KEY", "ingest-test");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ "Error Message": "Unavailable" })));
    await expect(fmpProvider.fetchDailyBars({ tickers: ["AAPL"], from: "2026-11-13", to: "2026-11-13" }))
      .rejects.toThrow("unexpected response");
  });
});
