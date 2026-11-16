import { afterEach, describe, expect, it, vi } from "vitest";
import { getUpcomingEarnings } from "./upcomingEarnings";
import { GET } from "@/app/api/stocks/earnings/route";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

function provider(rows: unknown, status = 200) {
  vi.stubEnv("FMP_API_KEY", "fmp-test-only");
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(rows, { status }));
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

describe("upcoming earnings report dates", () => {
  it("chooses the earliest valid, unreported release for the exact symbol from unsorted rows", async () => {
    const fetcher = provider([
      { symbol: "AAPL", date: "2027-05-01" },
      { symbol: "NVDA", date: "2026-11-17" },
      { symbol: "AAPL", date: "2026-11-16", epsActual: 0 },
      { symbol: "AAPL", date: "2026-11-17", revenueActual: 100 },
      { symbol: "AAPL", date: "2026-11-15" },
      { symbol: "AAPL", date: "2026-11-31" },
      { symbol: "AAPL", date: "2026-12-01T00:00:00Z" },
      { symbol: "AAPL", date: null },
      { symbol: " aapl ", date: "2027-02-04", epsActual: null, revenueActual: null },
    ]);
    expect(await getUpcomingEarnings(" aapl ", new Date("2026-11-16T18:00:00Z"))).toEqual({
      symbol: "AAPL", date: "2027-02-04",
    });
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.pathname).toBe("/stable/earnings");
    expect(url.searchParams.get("symbol")).toBe("AAPL");
    expect(fetcher).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ next: { revalidate: 3600 } }));
  });

  it.each([
    ["2026-11-17T02:00:00Z", "2026-11-16"],
    ["2026-07-17T02:00:00Z", "2026-07-16"],
  ])("retains today's unreported release using the New York day at %s", async (now, date) => {
    provider([{ symbol: "AAPL", date }]);
    expect(await getUpcomingEarnings("AAPL", new Date(now))).toEqual({ symbol: "AAPL", date });
    expect(await getUpcomingEarnings("AAPL", new Date(new Date(now).getTime() + 12 * 60 * 60 * 1000))).toBeNull();
  });

  it("returns no date when the provider has only past or already-reported releases", async () => {
    provider([
      { symbol: "AAPL", date: "2026-11-16", epsActual: 0, revenueActual: 0 },
      { symbol: "AAPL", date: "2026-11-15" },
    ]);
    expect(await getUpcomingEarnings("AAPL", new Date("2026-11-16T18:00:00Z"))).toBeNull();
  });

  it("returns a real scheduled date through the API, or null without inventing one", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-16T18:00:00Z"));
    provider([{ symbol: "NVDA", date: "2026-11-17", epsActual: null, revenueActual: null }]);
    const response = await GET(new Request("http://localhost/api/stocks/earnings?symbol=nvda"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: true, source: "FMP", report: { symbol: "NVDA", date: "2026-11-17" },
    });
    provider([]);
    expect(await (await GET(new Request("http://localhost/api/stocks/earnings?symbol=NVDA"))).json()).toEqual({
      ok: true, source: "FMP", report: null,
    });
  });

  it("rejects invalid symbols before making a provider request", async () => {
    const fetcher = provider([]);
    const response = await GET(new Request("http://localhost/api/stocks/earnings?symbol=../../AAPL"));
    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("surfaces provider access errors instead of pretending there is no scheduled report", async () => {
    provider({}, 402);
    const response = await GET(new Request("http://localhost/api/stocks/earnings?symbol=AAPL"));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false, report: null, error: expect.stringContaining("subscription"),
    });
  });
});
