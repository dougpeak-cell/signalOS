import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFreeNewsForWatchlist, fetchTopFreeCryptoNews, fetchTopFreeMarketNews } from "./fetchFreeNews";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("FMP-only news feeds", () => {
  it("uses FMP stock and crypto news with provider timestamps, publisher, and symbol associations", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T17:00:00Z"));
    vi.stubEnv("FMP_API_KEY", "news-test");
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      expect(url.hostname).toBe("financialmodelingprep.com");
      const crypto = url.pathname.includes("crypto");
      return Response.json([{
        symbol: crypto ? "BTCUSD" : "USD", title: "Market update", text: "Reported company update.",
        url: `https://example.com/${crypto ? "crypto" : "stock"}`, publisher: "Provider publisher",
        publishedDate: "2026-11-13 11:00:00", image: "https://example.com/image.jpg",
      }]);
    });
    vi.stubGlobal("fetch", fetcher);
    expect((await fetchTopFreeMarketNews())[0]).toMatchObject({
      source: "Provider publisher", tickers: ["USD"], rawPublishedAt: "2026-11-13T16:00:00.000Z",
    });
    expect((await fetchTopFreeCryptoNews())[0].tickers).toContain("BTC");
    await fetchFreeNewsForWatchlist(["AAPL", "MSFT"]);
    expect(String(fetcher.mock.calls[2][0])).toContain("/stable/news/stock?");
    expect(new URL(String(fetcher.mock.calls[2][0])).searchParams.get("symbols")).toBe("AAPL,MSFT");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("does not turn a provider failure into a fabricated news story or RSS fallback", async () => {
    vi.stubEnv("FMP_API_KEY", "news-test");
    const fetcher = vi.fn(async () => new Response(null, { status: 403 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(fetchTopFreeMarketNews()).rejects.toThrow("rejected access");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
