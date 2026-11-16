import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as candles } from "./candles/route";
import { GET as snapshot } from "./snapshot/route";
import { GET as trades } from "./trades/route";
import { cryptoCandleTime, normalizeCryptoCandles } from "./_lib/marketData";

const request = (route: string, query = ""): Request => new Request(`https://signalos.test/api/crypto/${route}?${query}`);
const bar = (date: string, close = 12) => ({ date, open: 10, high: 15, low: 8, close, volume: 100 });

describe("FMP-only crypto market data", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubEnv("FMP_API_KEY", "test-fmp-key");
    vi.stubEnv("MASSIVE_API_KEY", "legacy-key");
    vi.stubEnv("NEXT_PUBLIC_POLYGON_KEY", "legacy-browser-key");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("parses New York candles independently of server timezone and DST", () => {
    expect(cryptoCandleTime("2026-01-15 09:30:00")).toBe(Date.parse("2026-01-15T14:30:00Z"));
    expect(cryptoCandleTime("2026-07-15 09:30:00")).toBe(Date.parse("2026-07-15T13:30:00Z"));
    expect(cryptoCandleTime("2026-03-08 01:59:00")).toBe(Date.parse("2026-03-08T06:59:00Z"));
    expect(cryptoCandleTime("2026-03-08 03:00:00")).toBe(Date.parse("2026-03-08T07:00:00Z"));
    expect(cryptoCandleTime("2026-03-08 02:30:00")).toBeNull();
    expect(cryptoCandleTime("2026-02-30 09:30:00")).toBeNull();
    expect(cryptoCandleTime("2026-07-15T09:30:00Z")).toBe(Date.parse("2026-07-15T09:30:00Z"));
  });

  it("sorts and deduplicates OHLCV bars, drops invalid rows, and aggregates real daily bars into weeks", () => {
    const rows = [bar("2026-07-14", 14), bar("2026-07-13"), bar("2026-07-13"),
      bar("2026-07-20", 11), { ...bar("2026-07-15"), high: 5 }];
    expect(normalizeCryptoCandles(rows, false)).toHaveLength(3);
    expect(normalizeCryptoCandles(rows, true)).toEqual([
      { time: cryptoCandleTime("2026-07-13"), open: 10, high: 15, low: 8, close: 14, volume: 200 },
      { time: cryptoCandleTime("2026-07-20"), open: 10, high: 15, low: 8, close: 11, volume: 100 },
    ]);
  });

  it("requests stable intraday candles using only the server FMP key and preserves millisecond timestamps", async () => {
    fetchMock.mockResolvedValue(Response.json([bar("2026-07-15 09:30:00")]));
    const response = await candles(request("candles", "ticker=X:BTCUSD&multiplier=5&timespan=minute"));
    expect(response.status).toBe(200);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe("https://financialmodelingprep.com/stable/historical-chart/5min");
    expect(url.searchParams.get("symbol")).toBe("BTCUSD");
    expect(url.searchParams.get("apikey")).toBe("test-fmp-key");
    expect(await response.json()).toMatchObject({
      source: "FMP", ticker: "X:BTCUSD",
      candles: [{ time: Date.parse("2026-07-15T13:30:00Z"), close: 12 }],
    });
  });

  it("uses daily FMP history for weekly bars and rejects unsupported intervals before fetching", async () => {
    fetchMock.mockResolvedValue(Response.json([bar("2026-07-13"), bar("2026-07-14", 14)]));
    const response = await candles(request("candles", "ticker=BTC&timespan=week&multiplier=1"));
    expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe("/stable/historical-price-eod/full");
    expect(await response.json()).toMatchObject({ aggregation: "weekly_from_daily", candles: [{ close: 14, volume: 200 }] });
    fetchMock.mockClear();
    expect((await candles(request("candles", "multiplier=7"))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps batched FMP quotes without inventing missing symbols or changes", async () => {
    fetchMock.mockResolvedValue(Response.json([{
      symbol: "USDCUSD", exchange: "CRYPTO", price: 1, change: -0.01,
      changePercentage: -1, timestamp: 1784111400, dayHigh: 1.01, volume: 40,
    }, { symbol: "BTCUSD", exchange: "NASDAQ", price: 123 }]));
    const response = await snapshot(request("snapshot", "tickers=USDC,BONK,BTC"));
    expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe("/stable/batch-quote");
    const json = await response.json();
    expect(json.rows[0]).toMatchObject({ symbol: "USDC", ticker: "X:USDCUSD", changePercent: -1, updated: 1784111400000 });
    expect(json.rows[1]).toMatchObject({ available: false, price: null, change: null, updated: null });
    expect(json.rows[2]).toMatchObject({ available: false, price: null });
  });

  it("does not use legacy keys as a fallback and never fetches a tick feed", async () => {
    vi.stubEnv("FMP_API_KEY", "");
    expect((await candles(request("candles"))).status).toBe(503);
    expect((await snapshot(request("snapshot"))).status).toBe(503);
    expect(await (await trades()).json()).toMatchObject({ ok: false, available: false, reason: "unsupported", feed: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns explicit missing-data and entitlement errors, not an empty success", async () => {
    fetchMock.mockResolvedValueOnce(Response.json([], { status: 402 }));
    expect((await candles(request("candles"))).status).toBe(503);
    fetchMock.mockResolvedValueOnce(Response.json([]));
    expect((await snapshot(request("snapshot"))).status).toBe(404);
  });

  it("does not expose fetch errors that may contain credentials", async () => {
    fetchMock.mockRejectedValue(new Error("https://provider.test?apikey=test-fmp-key"));
    const response = await candles(request("candles"));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("test-fmp-key");
  });
});
