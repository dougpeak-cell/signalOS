import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  completedPriceCutoff,
  HEDGE_FUND_SAMPLE,
  isDate,
  periodTarget,
  rankInvestments,
  valueHolding,
  type InvestmentRow,
  type PricePoint,
  type ReportedHolding,
} from "../../src/lib/experts/hedgeFundInvestments";
import { HedgeFundDataError, loadFmpHedgeFundInvestments } from "../../src/lib/experts/fmpHedgeFunds";
import HedgeFundInvestmentsPanel from "../../src/components/experts/HedgeFundInvestmentsPanel";

const prices: PricePoint[] = [
  { date: "2026-10-22", close: 120 },
  { date: "2026-10-21", close: 115 },
  { date: "2026-10-15", close: 100 },
  { date: "2026-09-22", close: 80 },
];
const holdings: ReportedHolding[] = [
  { symbol: "AAA", shares: 10, reportDate: "2026-06-30", fund: "Fund A" },
  { symbol: "AAA", shares: 20, reportDate: "2026-09-30", fund: "Fund B" },
];

test("dollar values and changes use summed, split-adjusted constant shares", () => {
  const row = valueHolding(holdings, prices,
    [{ date: "2026-08-01", numerator: 2, denominator: 1 }], "2026-10-22", "Alpha", "Technology");
  assert.ok(row);
  assert.equal(row.estimatedValue, 4800);
  assert.deepEqual(row.changes, {
    daily: { dollars: 200, from: "2026-10-21" },
    weekly: { dollars: 800, from: "2026-10-15" },
    monthly: { dollars: 1600, from: "2026-09-22" },
  });
  assert.deepEqual(row.funds, ["Fund A", "Fund B"]);
  assert.deepEqual(row.reportDates, ["2026-06-30", "2026-09-30"]);
});

test("period targets use calendar boundaries, leap years, and the previous trading close", () => {
  assert.equal(periodTarget("2026-03-31", "monthly"), "2026-02-28");
  assert.equal(periodTarget("2024-03-31", "monthly"), "2024-02-29");
  assert.equal(periodTarget("2026-01-31", "monthly"), "2025-12-31");
  assert.equal(periodTarget("2026-10-26", "weekly"), "2026-10-19");
  const monday = valueHolding(holdings, [
    { date: "2026-10-26", close: 100 },
    { date: "2026-10-23", close: 110 },
  ], [], "2026-10-26", "Alpha", "Technology");
  assert.deepEqual(monday?.changes.daily, { dollars: -300, from: "2026-10-23" });
  assert.equal(monday?.changes.weekly, null);
  assert.equal(monday?.changes.monthly, null);
});

test("incomplete sessions, invalid dates, and stale baselines are not treated as valid history", () => {
  assert.equal(completedPriceCutoff(new Date("2026-10-22T19:59:00Z")), "2026-10-21");
  assert.equal(completedPriceCutoff(new Date("2026-10-22T20:14:00Z")), "2026-10-21");
  assert.equal(completedPriceCutoff(new Date("2026-10-22T20:15:00Z")), "2026-10-22");
  assert.equal(completedPriceCutoff(new Date("2026-12-22T21:15:00Z")), "2026-12-22");
  assert.equal(isDate("2026-02-30"), false);
  assert.equal(isDate("2024-02-29"), true);
  assert.equal(valueHolding(holdings, prices, [], "2026-10-23", "Alpha", "Technology"), null);
  const stale = valueHolding(holdings, [
    { date: "2026-10-22", close: 100 },
    { date: "2026-09-01", close: 90 },
  ], [], "2026-10-22", "Alpha", "Technology");
  assert.equal(stale?.changes.monthly, null);
});

test("sector totals include stocks outside the top 20 and never fabricate missing changes", () => {
  const rows: InvestmentRow[] = Array.from({ length: 25 }, (_, index) => ({
    name: `Company ${index}`, symbol: `S${index}`, sector: "Technology",
    estimatedValue: index + 1, funds: ["Fund A"], reportDates: ["2026-06-30"],
    changes: { daily: { dollars: 1, from: "2026-10-21" }, weekly: null, monthly: null },
  }));
  const ranked = rankInvestments(rows);
  assert.equal(ranked.stocks.length, 20);
  assert.equal(ranked.stocks[0].symbol, "S24");
  assert.equal(ranked.sectors.length, 1);
  assert.equal(ranked.sectors[0].estimatedValue, 325);
  assert.equal(ranked.sectors[0].changes.daily?.dollars, 25);
  assert.equal(ranked.sectors[0].changes.weekly, null);
  rows[0].changes.daily = { dollars: 1, from: "2026-10-20" };
  assert.equal(rankInvestments(rows).sectors[0].changes.daily, null);
  rows[0].changes.daily = null;
  assert.equal(rankInvestments(rows).sectors[0].changes.daily, null);
});

test("restricted subscriptions stop after one request and return an explicit upgrade error", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.FMP_API_KEY;
  process.env.FMP_API_KEY = "test-key";
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response("Restricted Endpoint", { status: 402 });
  };
  try {
    await assert.rejects(loadFmpHedgeFundInvestments(), (error: unknown) =>
      error instanceof HedgeFundDataError && error.status === 503 &&
      error.message.includes("subscription") && !error.message.includes("test-key"));
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.FMP_API_KEY;
    else process.env.FMP_API_KEY = originalKey;
  }
});

test("mocked provider pipeline selects latest reports, excludes options/ETFs, and values every stock", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.FMP_API_KEY;
  const originalNow = Date.now;
  const fixedTime = new Date("2026-10-22T23:00:00Z");
  // Pin the Date constructor as well as Date.now for the loader's session cutoff.
  class FixedDate extends Date {
    constructor(value?: string | number) {
      super(value === undefined ? fixedTime.getTime() : value);
    }
    static now(): number { return fixedTime.getTime(); }
  }
  const OriginalDate = globalThis.Date;
  globalThis.Date = FixedDate as DateConstructor;
  process.env.FMP_API_KEY = "test-key";
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    const symbol = url.searchParams.get("symbol");
    if (url.pathname.endsWith("/dates")) {
      return Response.json([{ date: "2026-03-31" }, { date: "2026-06-30" }]);
    }
    if (url.pathname.endsWith("/extract")) {
      assert.equal(url.searchParams.get("quarter"), "2");
      return Response.json([
        { symbol: "AAA", shares: 10, date: "2026-06-30", putCall: "", sharesType: "SH" },
        { symbol: "BBB", shares: 5, date: "2026-06-30", putCallShare: "Share", sharesType: "SH" },
        { symbol: "AAA", shares: 99999, putCall: "Call", sharesType: "SH" },
        { symbol: "ETF", shares: 100, sharesType: "SH" },
      ]);
    }
    if (url.pathname.endsWith("/profile")) return Response.json([{
      symbol, companyName: `Company ${symbol}`, sector: "Technology", currency: "USD",
      isEtf: symbol === "ETF", isFund: false,
    }]);
    if (url.pathname.endsWith("/splits")) return Response.json([]);
    if (url.pathname.endsWith("/full")) return Response.json(prices);
    throw new Error(`Unexpected mock endpoint: ${url.pathname}`);
  };
  try {
    const result = await loadFmpHedgeFundInvestments();
    assert.equal(result.priceDate, "2026-10-22");
    assert.equal(result.funds.length, HEDGE_FUND_SAMPLE.length);
    assert.equal(result.stockCount, 2);
    assert.equal(result.stocks[0].symbol, "AAA");
    assert.equal(result.stocks[0].estimatedValue, 3600);
    assert.equal(result.stocks[0].changes.daily?.dollars, 150);
    assert.equal(result.sectors[0].estimatedValue, 5400);
    assert.equal(result.excludedRows, 6);
    assert.deepEqual(result.warnings, []);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.Date = OriginalDate;
    Date.now = originalNow;
    if (originalKey === undefined) delete process.env.FMP_API_KEY;
    else process.env.FMP_API_KEY = originalKey;
  }
});

test("panel renders upgrade errors without sample dollar amounts and exposes period controls", () => {
  const markup = renderToStaticMarkup(createElement(HedgeFundInvestmentsPanel, {
    feed: null, loading: false, error: "Upgrade FMP institutional ownership access.",
    period: "weekly", onPeriodChange: () => {}, onRetry: () => {},
  }));
  assert.match(markup, /role="alert"/);
  assert.match(markup, /Upgrade FMP institutional ownership access/);
  assert.match(markup, /aria-pressed="true"[^>]*>Weekly/);
  assert.doesNotMatch(markup, /\$\d/);
  assert.match(markup, /not purchases, sales, or fund flows/);
});
