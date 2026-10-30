import { describe, expect, it } from "vitest";
import { analyzeDebitStrategy, estimateImpliedMove, summarizePositioning, usableQuote, type OptionContract } from "./analysis";

const now = Date.parse("2026-10-30T15:00:00Z");
const contract: OptionContract = {
  symbol: "O:TEST", underlying: "TEST", expiration: "2026-11-20", side: "call",
  strike: 100, multiplier: 100, exerciseStyle: "american", bid: 4.8, ask: 5,
  quoteAt: "2026-10-30T14:59:00Z", timeframe: "DELAYED", last: 4.9, lastAt: null,
  volume: 20, dayAt: null, openInterest: 100, impliedVolatility: 0.3,
  delta: 0.5, gamma: 0.01, theta: -0.02, vega: 0.1,
};

describe("defined-risk option analysis", () => {
  it("calculates a long call using the ask, contract multiplier and quantity", () => {
    const result = analyzeDebitStrategy(contract, null, 2, 100, now)!;
    expect(result.cost).toBe(1000);
    expect(result.maxLoss).toBe(1000);
    expect(result.breakEven).toBe(105);
    expect(result.maxProfit).toBeNull();
    expect(result.points.find((point) => point.stockPrice === 100)?.profit).toBe(-1000);
    expect(result.points.find((point) => point.stockPrice === 105)?.profit).toBe(0);
  });
  it("bounds call and put debit spread risk using the short bid", () => {
    const short = { ...contract, symbol: "O:SHORT", strike: 110, bid: 2, ask: 2.2 };
    const call = analyzeDebitStrategy(contract, short, 1, 100, now)!;
    expect(call).toMatchObject({ cost: 300, maxLoss: 300, maxProfit: 700, breakEven: 103 });
    const put = analyzeDebitStrategy({ ...contract, side: "put" }, { ...short, side: "put", strike: 90 }, 1, 100, now)!;
    expect(put).toMatchObject({ cost: 300, maxLoss: 300, maxProfit: 700, breakEven: 97 });
    expect(Math.max(...put.points.map((point) => point.profit))).toBe(700);
  });
  it("calculates the finite maximum profit of a long put", () => {
    expect(analyzeDebitStrategy({ ...contract, side: "put" }, null, 1, 100, now))
      .toMatchObject({ maxLoss: 500, maxProfit: 9500, breakEven: 95 });
  });
  it("fails closed for stale, crossed, missing and unsupported quotes", () => {
    expect(usableQuote({ ...contract, quoteAt: "2026-10-30T14:30:00Z" }, now)).toBe(false);
    for (const invalid of [{ ask: null }, { bid: 6 }, { multiplier: 10 }, { exerciseStyle: null }, { expiration: "2026-10-29" }]) {
      expect(analyzeDebitStrategy({ ...contract, ...invalid }, null, 1, 100, now)).toBeNull();
    }
    expect(analyzeDebitStrategy(contract, null, 0, 100, now)).toBeNull();
    expect(analyzeDebitStrategy(contract, null, 1, NaN, now)).toBeNull();
  });
  it("rejects inverted, mismatched and non-debit spreads", () => {
    for (const invalid of [{ strike: 90 }, { expiration: "2026-12-18" }, { underlying: "OTHER" }, { bid: 6, ask: 6.2 }]) {
      expect(analyzeDebitStrategy(contract, { ...contract, ...invalid }, 1, 100, now)).toBeNull();
    }
  });
  it("keeps missing OI distinct from zero and never derives directional flow", () => {
    const summary = summarizePositioning([contract, { ...contract, side: "put", volume: null, openInterest: 0 }]);
    expect(summary).toMatchObject({ callVolume: 20, putVolume: null, callOpenInterest: 100, putOpenInterest: 0 });
    expect(summary.concentrations[0]).toEqual({ strike: 100, call: 100, put: 0 });
    expect(summarizePositioning([]).callOpenInterest).toBeNull();
  });
  it("estimates a nondirectional range from same-strike call/put IV without a price forecast", () => {
    const result = estimateImpliedMove([contract, { ...contract, side: "put", impliedVolatility: 0.4 }], 100, now)!;
    expect(result.days).toBe(21);
    expect(result.annualizedIV).toBe(0.35);
    expect(result.move).toBeCloseTo(100 * 0.35 * Math.sqrt(21 / 365));
    expect(result.high - 100).toBeCloseTo(100 - result.low);
    expect(estimateImpliedMove([contract], 100, now)).toBeNull();
    expect(estimateImpliedMove([contract, { ...contract, side: "put" }], null, now)).toBeNull();
    expect(estimateImpliedMove([{ ...contract, expiration: "2026-10-30" }], 100, now)).toBeNull();
    expect(estimateImpliedMove([
      { ...contract, impliedVolatility: null }, { ...contract, side: "put" },
      { ...contract, strike: 90 }, { ...contract, strike: 90, side: "put" },
    ], 100, now)).toBeNull();
  });
});