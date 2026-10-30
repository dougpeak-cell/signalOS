import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { normalizeSenatePurchase, selectSenatePurchases, senateWindow } from "../../src/lib/experts/senatePurchases";
import { loadSenatePurchases } from "../../src/lib/experts/fmpSenate";
import { FmpDataError } from "../../src/lib/experts/fmpClient";
import SenatePurchasesPanel from "../../src/components/experts/SenatePurchasesPanel";

const now = new Date("2026-10-30T14:00:00Z");
const purchase = {
  symbol: "AAA", firstName: "Example", lastName: "Senator", district: "CA",
  assetDescription: "Example Corporation", owner: "Spouse", assetType: "Stock",
  type: "Purchase", amount: "$1,001 - $15,000",
  transactionDate: "2026-10-01", disclosureDate: "2026-10-29",
  link: "https://efdsearch.senate.gov/search/view/ptr/example/",
};

test("calendar windows are inclusive and use New York date, not UTC date", () => {
  assert.deepEqual(senateWindow("today", now), { startDate: "2026-10-30", endDate: "2026-10-30" });
  assert.equal(senateWindow("week", now).startDate, "2026-10-24");
  assert.equal(senateWindow("month", now).startDate, "2026-10-01");
  assert.equal(senateWindow("quarter", now).startDate, "2026-08-02");
  assert.equal(senateWindow("year", now).startDate, "2025-10-31");
  assert.equal(senateWindow("today", new Date("2026-10-30T02:00:00Z")).endDate, "2026-10-29");
});

test("only explicit public-stock purchases qualify even when bonds/options have tickers", () => {
  assert.ok(normalizeSenatePurchase(purchase));
  for (const assetType of ["Corporate Bond", "Stock Option", "Non-Public Stock", "Other", ""]) {
    assert.equal(normalizeSenatePurchase({ ...purchase, assetType }), null);
  }
  for (const type of ["Sale", "Sale (Partial)", "Exchange"]) {
    assert.equal(normalizeSenatePurchase({ ...purchase, type }), null);
  }
  assert.equal(normalizeSenatePurchase({ ...purchase, symbol: "../BAD" }), null);
});

test("preserves amount ranges, owner, dates and safe Senate links without inventing exact dollars", () => {
  const row = normalizeSenatePurchase(purchase)!;
  assert.equal(row.amountRange, "$1,001 - $15,000");
  assert.equal(row.owner, "Spouse");
  assert.equal(row.senator, "Example Senator");
  assert.equal(row.purchaseDate, "2026-10-01");
  assert.equal(row.disclosureDate, "2026-10-29");
  assert.equal(row.filingUrl, purchase.link);
  for (const link of ["javascript:alert(1)", "https://example.com/filing", "http://efdsearch.senate.gov/test"]) {
    assert.equal(normalizeSenatePurchase({ ...purchase, link })?.filingUrl, null);
  }
  assert.equal(normalizeSenatePurchase({ ...purchase, amount: null })?.amountRange, "Not disclosed");
});

test("date basis distinguishes late disclosures from purchases and excludes future and missing dates", () => {
  assert.equal(selectSenatePurchases([purchase], "week", "disclosure", true, now).rows.length, 1);
  assert.equal(selectSenatePurchases([purchase], "week", "purchase", true, now).rows.length, 0);
  const rows = [
    { ...purchase, disclosureDate: "2026-10-24" },
    { ...purchase, disclosureDate: "2026-10-23" },
    { ...purchase, disclosureDate: "2026-10-31" },
    { ...purchase, disclosureDate: "2026-02-30" },
  ];
  const feed = selectSenatePurchases(rows, "week", "disclosure", true, now);
  assert.equal(feed.rows.length, 1);
  assert.equal(feed.rows[0].disclosureDate, "2026-10-24");
  assert.match(feed.warnings.join(" "), /no valid selected date/);
});

test("deduplicates exact overlapping records and discloses scan and display limits", () => {
  const rows = Array.from({ length: 60 }, (_, index) => ({ ...purchase, firstName: `Person ${index}` }));
  const feed = selectSenatePurchases([...rows, rows[0]], "week", "disclosure", false, now);
  assert.equal(feed.scannedRows, 61);
  assert.equal(feed.matchedRows, 60);
  assert.equal(feed.rows.length, 50);
  assert.equal(feed.scanLimitReached, true);
  assert.match(feed.warnings.join(" "), /1,000-row scan limit/);
  assert.match(feed.warnings.join(" "), /newest 50 of 60/);
});

test("provider scans are bounded to 10 pages with no fabricated success after restriction", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.FMP_API_KEY;
  process.env.FMP_API_KEY = "senate-test-key";
  const pages: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, "/stable/senate-latest");
    pages.push(url.searchParams.get("page") ?? "");
    return Response.json(Array.from({ length: 100 }, () => purchase));
  };
  try {
    const feed = await loadSenatePurchases("week", "disclosure", now);
    assert.deepEqual(pages, Array.from({ length: 10 }, (_, index) => String(index)));
    assert.equal(feed.scannedRows, 1000);
    assert.equal(feed.rows.length, 1);
    assert.equal(feed.scanLimitReached, true);
    globalThis.fetch = async () => new Response("Restricted Endpoint", { status: 402 });
    await assert.rejects(loadSenatePurchases("week", "disclosure", now), (error: unknown) =>
      error instanceof FmpDataError && error.status === 503 && !error.message.includes("senate-test-key"));
    globalThis.fetch = async () => Response.json([]);
    const empty = await loadSenatePurchases("today", "disclosure", now);
    assert.deepEqual(empty.rows, []);
    assert.equal(empty.scannedRows, 0);
    assert.equal(empty.scanLimitReached, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.FMP_API_KEY;
    else process.env.FMP_API_KEY = originalKey;
  }
});

test("responsive panel renders every time/date control and clearly labels empty results", () => {
  const feed = selectSenatePurchases([], "today", "disclosure", true, now);
  const html = renderToStaticMarkup(createElement(SenatePurchasesPanel, {
    feed, loading: false, error: null, period: "today", basis: "disclosure",
    onPeriodChange: () => {}, onBasisChange: () => {}, onRetry: () => {},
  }));
  for (const label of ["Today", "Past 7 days", "Past 30 days", "Past 90 days", "Past year", "Disclosure date", "Purchase date"]) {
    assert.ok(html.includes(label));
  }
  assert.match(html, /No matching stock purchases were found in the scanned sample/);
  assert.match(html, /not exact investments/);
});
