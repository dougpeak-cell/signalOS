import { describe, expect, it } from "vitest";
import { buildTodayPersonalBrief } from "./personalBrief";

describe("buildTodayPersonalBrief", () => {
  it("connects a saved list to confirmed strength and pressure", () => {
    const brief = buildTodayPersonalBrief({
      watchlist: [
        { ticker: "NVDA", changePercent: 3.2, catalystLabel: "AI demand" },
        { ticker: "TSLA", changePercent: -2.8 },
      ],
      setups: [
        { ticker: "NVDA", direction: "bullish", score: 84 },
        { ticker: "TSLA", direction: "bearish", score: 71 },
      ],
    });

    expect(brief.title).toBe("Your saved list is split");
    expect(brief.hasWatchlist).toBe(true);
    expect(brief.priorities).toEqual([
      expect.objectContaining({ ticker: "TSLA", status: "pressure" }),
      expect.objectContaining({ ticker: "NVDA", status: "confirmed" }),
    ]);
  });

  it("uses leading setups as an honest fallback without saved names", () => {
    const brief = buildTodayPersonalBrief({
      watchlist: [],
      setups: [{ ticker: "MSFT", direction: "bullish", score: 81 }],
    });

    expect(brief.title).toBe("Build your personal tape");
    expect(brief.hasWatchlist).toBe(false);
    expect(brief.priorities[0]).toMatchObject({ ticker: "MSFT", status: "confirmed" });
  });

  it("keeps quiet saved names in a wait-for-evidence state", () => {
    const brief = buildTodayPersonalBrief({
      watchlist: [{ ticker: "AAPL", changePercent: 0.3 }],
      setups: [],
    });

    expect(brief.title).toBe("Your saved names are quiet");
    expect(brief.priorities[0]).toMatchObject({
      ticker: "AAPL",
      status: "watch",
      nextCondition: "Wait for a qualified setup or fresh catalyst before acting.",
    });
  });

  it("puts a holding near its recorded stop ahead of ordinary watchlist movement", () => {
    const brief = buildTodayPersonalBrief({
      watchlist: [{ ticker: "MSFT", changePercent: 0.6 }],
      portfolio: [{ ticker: "MSFT", price: 100, stopPrice: 98 }],
      setups: [{ ticker: "MSFT", direction: "bullish", score: 80 }],
    });

    expect(brief.title).toBe("Your portfolio needs attention");
    expect(brief.priorities[0]).toMatchObject({
      ticker: "MSFT",
      source: "portfolio",
      status: "pressure",
      evidence: expect.stringContaining("2.0% above your recorded stop"),
      nextCondition: "Review this holding against its recorded stop and position plan.",
    });
  });
});