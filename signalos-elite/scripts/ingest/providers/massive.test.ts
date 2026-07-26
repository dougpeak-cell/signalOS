import { afterEach, describe, expect, it, vi } from "vitest";

import {
  latestCompletedSessionDate,
  massiveProvider,
} from "./massive";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("massiveProvider", () => {
  it("uses Friday as the latest completed session on Sunday", () => {
    expect(
      latestCompletedSessionDate(new Date("2026-07-26T16:00:00.000Z")),
    ).toBe("2026-07-24");
  });

  it("normalizes valid completed OHLCV bars and rejects malformed rows", async () => {
    process.env.MASSIVE_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            results: [
              {
                t: Date.parse("2026-07-24T04:00:00.000Z"),
                o: 207.45,
                h: 211.91,
                l: 204.81,
                c: 206.84,
                v: 114836805.9,
              },
              {
                t: Date.parse("2026-07-24T04:00:00.000Z"),
                o: 207.45,
                h: 200,
                l: 204.81,
                c: 206.84,
                v: 100,
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const bars = await massiveProvider.fetchDailyBars({
      tickers: ["nvda", "NVDA"],
      from: "2026-07-20",
      to: "2026-07-24",
    });

    expect(bars).toEqual([
      {
        ticker: "NVDA",
        d: "2026-07-24",
        sourceUpdatedAt: "2026-07-24T04:00:00.000Z",
        open: 207.45,
        high: 211.91,
        low: 204.81,
        close: 206.84,
        volume: 114836805,
        vwap: null,
      },
    ]);
  });
});