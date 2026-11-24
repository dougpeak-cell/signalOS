import { describe, expect, it } from "vitest";
import { calculateScreenerScore } from "@/lib/screenerScore";
import { groupWatchlistAlerts, stockAlertColor, type AlertQuote } from "./alerts";

describe("watchlist screener alerts", () => {
  it.each([
    [54, 0, null], [55, 0, "yellow"], [69, 0, "yellow"], [70, 0, "green"],
    [90, 6.999, "green"], [90, 7, "red"], [80, -7, "red"],
    [20, -8, "red"], [null, null, null], [NaN, NaN, null],
  ] as const)("classifies score %s and day move %s as %s", (score, move, color) => {
    expect(stockAlertColor(score, move)).toBe(color);
  });

  it("uses the same fixed score for a ticker regardless of sector, search, or row order", () => {
    expect(calculateScreenerScore("NVDA", 0)).toBe(58);
    expect(calculateScreenerScore("NVDA", 2)).toBe(70);
    expect(calculateScreenerScore(" nvda ", 2)).toBe(70);
    expect(calculateScreenerScore("MSFT", 0)).toBe(59);
    expect(calculateScreenerScore("ADBE", 0)).toBe(54);
    expect(calculateScreenerScore("CUSTOM", 0)).toBe(58);
    expect(calculateScreenerScore("NVDA", null)).toBeNull();
    expect(calculateScreenerScore("NVDA", Infinity)).toBeNull();
  });

  it("groups only unique watched stocks, with red overriding green and no missing-data alerts", () => {
    const quotes: AlertQuote[] = [
      { ticker: "NVDA", price: 100, changePercent: 0 },
      { ticker: "MSFT", price: 100, changePercent: 2 },
      { ticker: "AAPL", price: 100, changePercent: 7 },
      { ticker: "AMD", price: 100, changePercent: -8 },
      { ticker: "TSLA", price: 100, changePercent: 8 },
      { ticker: "MISSING", price: null, changePercent: 10 },
      { ticker: "NOCHANGE", price: 100, changePercent: null },
      { ticker: "LOW", price: 100, changePercent: -1 },
    ];
    const groups = groupWatchlistAlerts(
      ["nvda", "NVDA", "MSFT", "AAPL", "AMD", "MISSING", "NOCHANGE", "LOW", "ABSENT"],
      quotes,
    );
    expect(groups).toEqual({
      red: [
        { ticker: "AMD", score: 34, changePercent: -8 },
        { ticker: "AAPL", score: 80, changePercent: 7 },
      ],
      green: [{ ticker: "MSFT", score: 71, changePercent: 2 }],
      yellow: [{ ticker: "NVDA", score: 58, changePercent: 0 }],
    });
    expect(groupWatchlistAlerts([], quotes)).toEqual({ red: [], green: [], yellow: [] });
    expect(groupWatchlistAlerts(["NVDA"], [])).toEqual({ red: [], green: [], yellow: [] });
  });
});
