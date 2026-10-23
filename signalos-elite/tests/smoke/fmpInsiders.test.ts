import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InsiderDataError, loadFmpInsiderTradesFeed } from "../../src/lib/experts/fmpInsiders";
import InsiderTradesPanel from "../../src/components/experts/InsiderTradesPanel";

type MockRow = Record<string, unknown>;
type Responder = (url: URL) => Response | Promise<Response>;

function purchase(overrides: MockRow = {}): MockRow {
  return {
    symbol: "AAA",
    filingDate: "2026-10-23",
    transactionDate: "2026-10-22",
    reportingName: "Example Buyer",
    typeOfOwner: "director",
    transactionType: "P-Purchase",
    securitiesTransacted: 1000,
    price: 12.3456,
    securitiesOwned: 5000,
    acquisitionOrDisposition: "A",
    directOrIndirect: "D",
    formType: "4",
    securityName: "Common Stock",
    url: "https://www.sec.gov/Archives/edgar/data/123/filing.htm",
    ...overrides,
  };
}

function profile(symbol: string): MockRow {
  return { symbol, companyName: `Company ${symbol}`, sector: "Technology" };
}

async function withProvider(responder: Responder, run: () => Promise<void>): Promise<void> {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.FMP_API_KEY;
  process.env.FMP_API_KEY = "private-test-key";
  globalThis.fetch = async (input) => responder(new URL(String(input)));
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.FMP_API_KEY;
    else process.env.FMP_API_KEY = originalKey;
  }
}

test("FMP purchases carry real transaction prices, ownership details, dates, and SEC sources", async () => {
  await withProvider((url) => {
    assert.equal(url.searchParams.get("apikey"), "private-test-key");
    return Response.json(url.pathname.endsWith("/profile") ? [profile("AAA")] : [purchase()]);
  }, async () => {
    const feed = await loadFmpInsiderTradesFeed();
    assert.equal(feed.scannedFilings, 1);
    assert.equal(feed.matchedPurchases, 1);
    assert.deepEqual(feed.warnings, []);
    assert.ok(Number.isFinite(Date.parse(feed.updatedAt)));
    assert.deepEqual(feed.rows[0], {
      symbol: "AAA", companyName: "Company AAA", sector: "Technology",
      amountPurchased: 12345.6, sharesPurchased: 1000,
      transactionDate: "2026-10-22", filingDate: "2026-10-23",
      purchaserName: "Example Buyer", purchaserTitle: "director",
      transactionType: "P-Purchase", securityName: "Common Stock",
      filingUrl: "https://www.sec.gov/Archives/edgar/data/123/filing.htm",
      pricePerShare: 12.3456, sharesOwnedAfter: 5000, ownershipType: "Direct", formType: "4",
    });
  });
});

test("scans three pages, deduplicates overlapping rows, and returns the 20 newest trades", async () => {
  const requestedPages: string[] = [];
  const first = Array.from({ length: 100 }, (_, index) => purchase({
    reportingName: `Buyer ${index}`, transactionDate: "2026-09-01",
  }));
  const second = Array.from({ length: 100 }, (_, index) => purchase({
    reportingName: `New Buyer ${index}`, transactionDate: "2026-10-22",
  }));
  await withProvider((url) => {
    if (url.pathname.endsWith("/profile")) return Response.json([profile("AAA")]);
    const page = url.searchParams.get("page") ?? "";
    requestedPages.push(page);
    return Response.json(page === "0" ? first : page === "1" ? second : [first[0], second[0]]);
  }, async () => {
    const feed = await loadFmpInsiderTradesFeed();
    assert.deepEqual(requestedPages, ["0", "1", "2"]);
    assert.equal(feed.scannedFilings, 202);
    assert.equal(feed.matchedPurchases, 200);
    assert.equal(feed.rows.length, 20);
    assert.ok(feed.rows.every((row) => row.transactionDate === "2026-10-22"));
  });
});

test("excludes sales, grants, gifts, exercises, dispositions, invalid symbols, and non-positive shares", async () => {
  const invalid = [
    purchase({ transactionType: "S-Sale" }), purchase({ transactionType: "A-Award" }),
    purchase({ transactionType: "G-Gift" }), purchase({ transactionType: "M-Exempt" }),
    purchase({ acquisitionOrDisposition: "D" }), purchase({ securitiesTransacted: -1 }),
    purchase({ securitiesTransacted: 0 }), purchase({ securitiesTransacted: "NaN" }),
    purchase({ symbol: "../bad" }),
  ];
  await withProvider((url) => Response.json(url.pathname.endsWith("/profile")
    ? [profile("AAA")]
    : [...invalid, purchase({ symbol: " aaa ", transactionType: "P", securitiesTransacted: "1000", price: "12.3456" })]),
  async () => {
    const feed = await loadFmpInsiderTradesFeed();
    assert.equal(feed.rows.length, 1);
    assert.equal(feed.rows[0].symbol, "AAA");
    assert.equal(feed.rows[0].amountPurchased, 12345.6);
  });
});

test("missing or zero purchase prices stay unavailable, and zero ownership is preserved", async () => {
  await withProvider((url) => Response.json(url.pathname.endsWith("/profile") ? [profile("AAA")] : [
    purchase({ price: 0, securitiesOwned: 0, directOrIndirect: "I" }),
    purchase({ price: null, reportingName: "Other Buyer", url: "javascript:alert(1)" }),
  ]), async () => {
    const feed = await loadFmpInsiderTradesFeed();
    assert.equal(feed.rows.length, 2);
    assert.ok(feed.rows.every((row) => row.amountPurchased === null && row.pricePerShare === null));
    const direct = feed.rows.find((row) => row.purchaserName === "Example Buyer");
    assert.equal(direct?.sharesOwnedAfter, 0);
    assert.equal(direct?.ownershipType, "Indirect");
    assert.equal(feed.rows.find((row) => row.purchaserName === "Other Buyer")?.filingUrl, null);
  });
});

test("sector filtering uses company profiles and reports matched counts before limiting", async () => {
  await withProvider((url) => Response.json(url.pathname.endsWith("/profile")
    ? [{ ...profile(url.searchParams.get("symbol") ?? ""), sector: url.searchParams.get("symbol") === "AAA" ? "Technology" : "Healthcare" }]
    : [purchase(), purchase({ symbol: "BBB" })]), async () => {
    const feed = await loadFmpInsiderTradesFeed("Semiconductors");
    assert.equal(feed.matchedPurchases, 1);
    assert.equal(feed.rows[0].symbol, "AAA");
  });
});

test("profile failures remain visible instead of silently inventing company information", async () => {
  const originalWarn = console.warn;
  const logged: unknown[][] = [];
  console.warn = (...args: unknown[]) => logged.push(args);
  try {
    await withProvider((url) => url.pathname.endsWith("/profile")
      ? new Response("Unavailable", { status: 503 }) : Response.json([purchase()]), async () => {
      const feed = await loadFmpInsiderTradesFeed();
      assert.equal(feed.rows[0].companyName, "AAA");
      assert.equal(feed.rows[0].sector, null);
      assert.equal(feed.warnings.length, 1);
      assert.equal(logged.length, 1);
      assert.doesNotMatch(JSON.stringify(logged), /private-test-key/);
    });
  } finally {
    console.warn = originalWarn;
  }
});

test("subscription errors and malformed responses fail explicitly without leaking the key", async () => {
  for (const status of [401, 402, 403, 429, 500]) {
    await withProvider(() => new Response("Provider error", { status }), async () => {
      await assert.rejects(loadFmpInsiderTradesFeed(), (error: unknown) =>
        error instanceof InsiderDataError && !error.message.includes("private-test-key") &&
        (status === 402 ? error.message.includes("subscription") : true));
    });
  }
  for (const payload of [{ error: "Restricted" }, [null], ["not a filing"]]) {
    await withProvider(() => Response.json(payload), async () => {
      await assert.rejects(loadFmpInsiderTradesFeed(), /unexpected insider data format/);
    });
  }
});

test("empty FMP filing samples remain empty, without synthetic insider rows", async () => {
  await withProvider(() => Response.json([]), async () => {
    const feed = await loadFmpInsiderTradesFeed();
    assert.deepEqual(feed.rows, []);
    assert.equal(feed.scannedFilings, 0);
    assert.equal(feed.matchedPurchases, 0);
  });
});

test("desktop/mobile insider panel identifies FMP, purchase scope, and refresh availability", () => {
  const html = renderToStaticMarkup(createElement(InsiderTradesPanel, { selectedSector: "Technology" }));
  assert.match(html, /FMP · Form 4/);
  assert.match(html, /Up to 20 recent reported insider purchases aligned to Technology/);
  assert.match(html, /not sales, grants, gifts, or option exercises/);
  assert.match(html, /Refresh/);
  assert.match(html, /Loading latest insider purchases/);
});
