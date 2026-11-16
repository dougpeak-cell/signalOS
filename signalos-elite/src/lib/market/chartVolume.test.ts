import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/stocks/volume/route";
import { getChartVolume } from "./chartVolume";
import type { FmpRow } from "@/lib/experts/fmpClient";

const now = new Date("2026-11-16T20:05:00Z");
const dates = ["2026-11-13", "2026-11-12", "2026-11-11", "2026-11-10", "2026-11-09",
  "2026-11-06", "2026-11-05", "2026-11-04", "2026-11-03", "2026-11-02"];

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function provider(rows: FmpRow[], quote: FmpRow = {
  symbol: "AAPL", volume: 12_345, timestamp: Date.parse("2026-11-16T20:01:00Z") / 1000,
}) {
  vi.stubEnv("FMP_API_KEY", "fmp-test-only");
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input));
    expect(url.hostname).toBe("financialmodelingprep.com");
    expect(url.searchParams.get("symbol")).toBe("AAPL");
    if (url.pathname === "/stable/quote") return Response.json([quote]);
    expect(url.pathname).toBe("/stable/historical-price-eod/full");
    return Response.json(rows);
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

describe("chart session volume", () => {
  it("uses the last completed trading day and exactly ten completed sessions, independent of candle history", async () => {
    const rows = dates.map((date, index) => ({ symbol: "AAPL", date, volume: (index + 1) * 100 }));
    provider([
      { symbol: "AAPL", date: "2026-11-16", volume: 1_000_000 },
      ...[...rows].reverse(),
      { symbol: "AAPL", date: "2026-11-13", volume: 100 },
      { symbol: "AAPL", date: "2026-10-30", volume: 9_000_000 },
      { symbol: "AAPL", date: "2026-11-17", volume: 5_000_000 },
      { symbol: "NVDA", date: "2026-11-15", volume: 4_000_000 },
      { symbol: "AAPL", date: "2026-11-00", volume: 3_000_000 },
    ]);
    expect(await getChartVolume(" aapl ", now)).toEqual({
      symbol: "AAPL", marketDate: "2026-11-16",
      previousDayDate: "2026-11-13", previousDayVolume: 100,
      todayVolume: 12_345, quoteUpdatedAt: "2026-11-16T20:01:00.000Z",
      average10DayVolume: 550, averageSessionCount: 10,
    });
  });

  it("does not substitute a short history or skip a missing daily volume to complete the average", async () => {
    provider([
      ...dates.map((date, index) => ({ symbol: "AAPL", date, volume: index === 0 ? null : 100 })),
      { symbol: "AAPL", date: "2026-10-30", volume: 100 },
    ]);
    expect(await getChartVolume("AAPL", now)).toMatchObject({
      previousDayDate: "2026-11-13", previousDayVolume: null, average10DayVolume: null, averageSessionCount: 9,
    });
    provider([{ symbol: "AAPL", date: "2026-11-13", volume: 100 }]);
    expect(await getChartVolume("AAPL", now)).toMatchObject({
      previousDayVolume: 100, average10DayVolume: null, averageSessionCount: 1,
    });
  });

  it("preserves genuine zero volumes but never coerces invalid quote or daily volume to zero", async () => {
    provider(dates.map((date) => ({ symbol: "AAPL", date, volume: "0" })), {
      symbol: "AAPL", volume: 0, timestamp: now.getTime() / 1000,
    });
    expect(await getChartVolume("AAPL", now)).toMatchObject({
      previousDayVolume: 0, todayVolume: 0, average10DayVolume: 0,
    });
    provider([{ symbol: "AAPL", date: dates[0], volume: -1 }], {
      symbol: "AAPL", volume: null, timestamp: now.getTime() / 1000,
    });
    expect(await getChartVolume("AAPL", now)).toMatchObject({
      previousDayVolume: null, todayVolume: null, average10DayVolume: null,
    });
  });

  it("does not display Friday's cumulative quote volume as today's total on Monday or a weekend", async () => {
    provider([{ symbol: "AAPL", date: "2026-11-13", volume: 100 }], {
      symbol: "AAPL", volume: 100, timestamp: Date.parse("2026-11-13T21:00:00Z") / 1000,
    });
    for (const date of [now, new Date("2026-11-14T18:00:00Z")]) {
      expect(await getChartVolume("AAPL", date)).toMatchObject({ previousDayVolume: 100, todayVolume: null });
    }
  });

  it.each([
    ["2026-11-17T02:00:00Z", "2026-11-16T21:00:00Z", "2026-11-16"],
    ["2026-07-17T02:00:00Z", "2026-07-16T20:00:00Z", "2026-07-16"],
  ])("uses the Eastern calendar day, including DST, at %s", async (current, quoted, marketDate) => {
    provider([], { symbol: "AAPL", volume: 500, timestamp: Date.parse(quoted) / 1000 });
    expect(await getChartVolume("AAPL", new Date(current))).toMatchObject({
      marketDate, todayVolume: 500, previousDayVolume: null, average10DayVolume: null,
    });
  });

  it("exposes the volume endpoint without caching the minute-refresh response in the browser", async () => {
    provider([]);
    const response = await GET(new Request("http://localhost/api/stocks/volume?symbol=aapl"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ ok: true, source: "FMP", volume: { symbol: "AAPL" } });
  });

  it("rejects malformed tickers before requesting FMP and surfaces provider failures", async () => {
    const fetcher = provider([]);
    expect((await GET(new Request("http://localhost/api/stocks/volume?symbol=..%2FAAPL"))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockImplementation(async () => new Response(null, { status: 402 }));
    const response = await GET(new Request("http://localhost/api/stocks/volume?symbol=AAPL"));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false, volume: null, error: expect.stringContaining("subscription"),
    });
  });
});
