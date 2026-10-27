import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ResearchAlignmentPanel from "../../src/components/experts/ResearchAlignmentPanel";
import { loadResearchAlignment } from "../../src/lib/experts/loadResearchAlignment";
import { calculateStockPulse } from "../../src/lib/amsa/engine";
import { resolveCurrentStockPulse } from "../../src/lib/amsa/get-current-stock-pulse";
import {
  summarizeResearchAlignment,
  type AnalystResearch,
  type AmsaResearch,
  type ResearchAlignmentFeed,
  type ResearchEvidence,
} from "../../src/lib/experts/researchAlignment";

const now = new Date("2026-10-24T14:00:00Z");
const analyst: AnalystResearch = {
  consensus: "Buy", buy: 5, hold: 2, sell: 1,
  targetConsensus: 123, targetHigh: 150, targetLow: 90, latestAction: null,
};
const amsa: AmsaResearch = {
  score: 75, state: "Constructive", sessionDate: "2026-10-23",
  asOf: "2026-10-23T20:00:00Z", reasons: ["Verified trend"], risks: ["Loss of support"],
};
function available<T>(data: T): ResearchEvidence<T> {
  return { status: "available", data, warnings: [] };
}
const unavailable: ResearchEvidence<never> = { status: "unavailable", error: "Source unavailable" };
const mockPulse: typeof resolveCurrentStockPulse = async (symbol) => ({
  current: {
    symbol, rawPulse: 75, displayPulse: 75, label: "Constructive", direction: "rising",
    confidence: 80, asOf: amsa.asOf, sessionDate: amsa.sessionDate, readingType: "verified_daily",
  },
  pulse: {
    ...calculateStockPulse([], { symbol }),
    status: "partial", score: 75, state: "Constructive", reasons: amsa.reasons,
    invalidationConditions: amsa.risks,
  },
});

test("alignment compares opinions with AMSA states without creating a numerical score", () => {
  for (const state of ["Elite", "Strong", "Constructive"] as const) {
    assert.equal(summarizeResearchAlignment(available(analyst), available({ ...amsa, state })).label, "Supports analyst view");
  }
  for (const state of ["Weak", "Critical"] as const) {
    assert.equal(summarizeResearchAlignment(available(analyst), available({ ...amsa, state })).label, "Contradicts analyst view");
    assert.equal(summarizeResearchAlignment(available({ ...analyst, consensus: "Sell" }), available({ ...amsa, state })).label, "Supports analyst view");
  }
  assert.equal(summarizeResearchAlignment(available({ ...analyst, consensus: "Strong Sell" }), available(amsa)).label, "Contradicts analyst view");
  assert.equal(summarizeResearchAlignment(available({ ...analyst, consensus: "Hold" }), available(amsa)).label, "Mixed / neutral");
  assert.equal(summarizeResearchAlignment(available(analyst), available({ ...amsa, state: "Balanced" })).label, "Mixed / neutral");
  for (const consensus of ["unknown", ""]) {
    assert.equal(summarizeResearchAlignment(available({ ...analyst, consensus }), available(amsa)).label, "Insufficient evidence");
  }
  assert.equal(summarizeResearchAlignment(unavailable, available(amsa)).label, "Insufficient evidence");
  assert.equal(summarizeResearchAlignment(available(analyst), unavailable).label, "Insufficient evidence");
  assert.match(summarizeResearchAlignment(available(analyst), available(amsa)).explanation, /not directional votes/);
});

async function withProvider(
  override: ((url: URL) => Response | null) | null,
  run: () => Promise<void>,
): Promise<void> {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.FMP_API_KEY;
  process.env.FMP_API_KEY = "research-test-key";
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    const response = override?.(url);
    if (response) return response;
    if (url.pathname.endsWith("/grades-consensus")) return Response.json([{
      symbol: "AMZN", consensus: "Buy", strongBuy: 1, buy: 4, hold: 2, sell: 1, strongSell: 0,
    }]);
    if (url.pathname.endsWith("/price-target-consensus")) return Response.json([{
      symbol: "AMZN", targetConsensus: 123, targetHigh: 150, targetLow: 90,
    }]);
    if (url.pathname.endsWith("/grades")) return Response.json([
      { symbol: "AMZN", date: "2025-12-01", gradingCompany: "Old Firm", newGrade: "Hold" },
      { symbol: "AMZN", date: "2026-10-22", gradingCompany: "New Firm", newGrade: "Buy", action: "upgrade" },
    ]);
    if (url.pathname.endsWith("/splits")) return Response.json([]);
    const old = url.searchParams.get("cik") === "0001079114";
    if (url.pathname.endsWith("/dates")) return Response.json([{ date: old ? "2023-12-31" : "2026-06-30" }]);
    if (url.pathname.endsWith("/extract")) return Response.json([
      { symbol: "AMZN", shares: 10, value: 1000, sharesType: "SH", date: old ? "2023-12-31" : "2026-06-30", filingDate: old ? "2024-02-14" : "2026-08-14",
        link: "https://www.sec.gov/Archives/edgar/data/123/filing.htm" },
      { symbol: "AMZN", shares: 999, value: 99999, sharesType: "SH", putCallShare: "Call" },
    ]);
    throw new Error(`Unexpected mocked path: ${url.pathname}`);
  };
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.FMP_API_KEY;
    else process.env.FMP_API_KEY = originalKey;
  }
}

test("loads three distinct sources, reports dates/values, flags old reports, and excludes options", async () => {
  await withProvider(null, async () => {
    const feed = await loadResearchAlignment(" amzn ", { now, loadPulse: mockPulse });
    assert.equal(feed.symbol, "AMZN");
    assert.equal(feed.alignment.label, "Supports analyst view");
    assert.equal(feed.analysts.status, "available");
    assert.equal(feed.institutions.status, "available");
    assert.equal(feed.amsa.status, "available");
    if (feed.analysts.status === "available") {
      assert.equal(feed.analysts.data.buy, 5);
      assert.equal(feed.analysts.data.latestAction?.firm, "New Firm");
      assert.equal(feed.analysts.data.targetConsensus, 123);
    }
    if (feed.institutions.status === "available") {
      assert.equal(feed.institutions.data.positions.length, 3);
      assert.equal(feed.institutions.data.positions[0].reportedValue, 1000);
      assert.equal(feed.institutions.data.positions[0].shares, 10);
      assert.equal(feed.institutions.data.funds.filter((fund) => fund.olderReport).length, 1);
      assert.match(feed.institutions.warnings.join(" "), /2023-12-31/);
      assert.ok(feed.institutions.data.positions.every((position) => position.filingUrl?.startsWith("https://www.sec.gov/")));
    }
  });
});

test("a holdings entitlement failure does not erase analyst or AMSA evidence", async () => {
  await withProvider((url) => url.pathname.includes("institutional-ownership") ? new Response("Restricted", { status: 402 }) : null, async () => {
    const feed = await loadResearchAlignment("AMZN", { now, loadPulse: mockPulse });
    assert.equal(feed.institutions.status, "unavailable");
    assert.equal(feed.analysts.status, "available");
    assert.equal(feed.amsa.status, "available");
    assert.equal(feed.alignment.label, "Supports analyst view");
    if (feed.institutions.status === "unavailable") {
      assert.match(feed.institutions.error, /subscription/);
      assert.doesNotMatch(feed.institutions.error, /research-test-key/);
    }
  });
});

test("manager history compares consecutive quarters and adjusts stock splits", async () => {
  await withProvider((url) => {
    if (url.pathname.endsWith("/dates")) return Response.json([{ date: "2026-03-31" }, { date: "2026-06-30" }]);
    if (url.pathname.endsWith("/splits")) return Response.json([{ date: "2026-05-01", numerator: 2, denominator: 1 }]);
    if (url.pathname.endsWith("/extract")) {
      const prior = url.searchParams.get("quarter") === "1";
      const cik = url.searchParams.get("cik");
      const shares = prior ? 10 : cik === "0001336528" ? 20 : cik === "0001040273" ? 25 : 15;
      return Response.json([{ symbol: "AMZN", shares, sharesType: "SH", date: prior ? "2026-03-31" : "2026-06-30" }]);
    }
    return null;
  }, async () => {
    const feed = await loadResearchAlignment("AMZN", { now, loadPulse: mockPulse });
    assert.equal(feed.institutions.status, "available");
    if (feed.institutions.status === "available") {
      assert.deepEqual(feed.institutions.data.changes?.map((change) => change.change), ["Unchanged", "Increased", "Reduced"]);
      assert.ok(feed.institutions.data.changes?.every((change) => change.previousReportDate === "2026-03-31" && change.splitFactor === 2));
    }
    assert.equal(feed.amsa.status, "available");
    if (feed.amsa.status === "available") assert.equal(feed.amsa.data.score, 75);
  });
});

test("new and closed positions require verified reports, not missing holdings history", async () => {
  for (const mode of ["new", "closed", "missing", "invalid-current", "no-splits"] as const) {
    await withProvider((url) => {
      if (url.pathname.endsWith("/dates")) return Response.json(mode === "missing" ? [{ date: "2026-06-30" }] : [{ date: "2026-03-31" }, { date: "2026-06-30" }]);
      if (url.pathname.endsWith("/splits")) return mode === "no-splits" ? new Response("Restricted", { status: 402 }) : Response.json([]);
      if (url.pathname.endsWith("/extract")) {
        const prior = url.searchParams.get("quarter") === "1";
        const absent = mode === "new" ? prior : mode === "closed" ? !prior : false;
        return Response.json([
          { symbol: "OTHER", shares: 1, sharesType: "SH" },
          ...absent ? [] : [{ symbol: "AMZN", shares: mode === "invalid-current" && !prior ? "bad" : 10, sharesType: "SH" }],
        ]);
      }
      return null;
    }, async () => {
      const feed = await loadResearchAlignment("AMZN", { now, loadPulse: mockPulse });
      assert.equal(feed.institutions.status, "available", mode);
      if (feed.institutions.status === "available") {
        const expected = mode === "new" ? "New position" : mode === "closed" ? "Closed position" : "Unavailable";
        assert.ok(feed.institutions.data.changes?.every((change) => change.change === expected), mode);
      }
    });
  }
});

test("recent analyst activity excludes stale, future, unrelated and duplicated ratings", async () => {
  await withProvider((url) => url.pathname.endsWith("/grades") ? Response.json([
    { symbol: "AMZN", date: "2026-10-22", gradingCompany: "Firm", action: "up", newGrade: "Buy" },
    { symbol: "AMZN", date: "2026-10-22", gradingCompany: "Firm", action: "up", newGrade: "Buy" },
    { symbol: "AMZN", date: "2026-10-21", gradingCompany: "Other", action: "down", newGrade: "Hold" },
    { symbol: "AMZN", date: "2025-01-01", action: "up" },
    { symbol: "AMZN", date: "2026-12-01", action: "up" },
    { symbol: "OTHER", date: "2026-10-23", action: "up" },
  ]) : null, async () => {
    const feed = await loadResearchAlignment("AMZN", { now, loadPulse: mockPulse });
    assert.equal(feed.analysts.status, "available");
    if (feed.analysts.status === "available") {
      assert.equal(feed.analysts.data.ratingActivity?.upgrades, 1);
      assert.equal(feed.analysts.data.ratingActivity?.downgrades, 1);
      assert.equal(feed.analysts.data.latestAction?.date, "2026-10-22");
    }
    const html = renderToStaticMarkup(createElement(ResearchAlignmentPanel, {
      symbol: "AMZN", feed, compact: true, title: "Expert Snapshot", hasAccess: true,
      loading: false, error: null, searchable: false, input: "AMZN", inputError: null,
      onInput: () => {}, onSubmit: () => {}, onRetry: () => {},
    }));
    assert.match(html, /Expert Snapshot/);
    assert.match(html, /<details/);
    assert.match(html, /Report dates:/);
    assert.match(html, /Estimate and price-target revisions: unavailable/);
  });
});

test("missing targets remain unavailable without discarding verified analyst consensus", async () => {
  await withProvider((url) => url.pathname.endsWith("/price-target-consensus") ? new Response("Unavailable", { status: 503 }) : null, async () => {
    const feed = await loadResearchAlignment("AMZN", { now, loadPulse: mockPulse });
    assert.equal(feed.analysts.status, "available");
    if (feed.analysts.status === "available") {
      assert.equal(feed.analysts.data.targetConsensus, null);
      assert.match(feed.analysts.warnings.join(" "), /targets unavailable/);
    }
  });
});

test("no matching fund position is historical sample absence, not bearish evidence", async () => {
  await withProvider((url) => url.pathname.endsWith("/extract")
    ? Response.json([{ symbol: "OTHER", shares: 10, value: 1000, sharesType: "SH" }]) : null, async () => {
    const feed = await loadResearchAlignment("AMZN", { now, loadPulse: mockPulse });
    assert.equal(feed.institutions.status, "available");
    if (feed.institutions.status === "available") assert.deepEqual(feed.institutions.data.positions, []);
    assert.equal(feed.alignment.label, "Supports analyst view");
  });
});

test("stale and insufficient AMSA cannot produce directional research alignment", async () => {
  await withProvider(null, async () => {
    for (const invalid of ["old", "insufficient", "future", "wrong-symbol"] as const) {
      const loadPulse: typeof resolveCurrentStockPulse = async (symbol) => {
        const pulse = await mockPulse(symbol);
        if (invalid === "old") pulse.current.asOf = "2026-10-01T20:00:00Z";
        if (invalid === "future") pulse.current.asOf = "2026-10-25T20:00:00Z";
        if (invalid === "insufficient") pulse.pulse.status = "insufficient-data";
        if (invalid === "wrong-symbol") pulse.current.symbol = "WRONG";
        return pulse;
      };
      const feed = await loadResearchAlignment("AMZN", { now, loadPulse });
      assert.equal(feed.amsa.status, "unavailable", invalid);
      assert.equal(feed.alignment.label, "Insufficient evidence");
    }
  });
});

test("AMSA freshness accepts exactly seven days and rejects one millisecond older", async () => {
  await withProvider(null, async () => {
    for (const extra of [0, 1]) {
      const loadPulse: typeof resolveCurrentStockPulse = async (symbol) => {
        const result = await mockPulse(symbol);
        result.current.asOf = new Date(now.getTime() - 7 * 86_400_000 - extra).toISOString();
        return result;
      };
      const feed = await loadResearchAlignment("AMZN", { now, loadPulse });
      assert.equal(feed.amsa.status, extra === 0 ? "available" : "unavailable");
    }
  });
});

test("report age flags begin strictly after 135 calendar days", async () => {
  await withProvider(null, async () => {
    for (const extra of [0, 1]) {
      const boundary = new Date(Date.parse("2026-06-30") + 135 * 86_400_000 + extra);
      const loadPulse: typeof resolveCurrentStockPulse = async (symbol) => {
        const result = await mockPulse(symbol);
        result.current.asOf = new Date(boundary.getTime() - 86_400_000).toISOString();
        return result;
      };
      const feed = await loadResearchAlignment("AMZN", { now: boundary, loadPulse });
      assert.equal(feed.institutions.status, "available");
      if (feed.institutions.status === "available") {
        assert.equal(feed.institutions.data.funds[0].olderReport, extra === 1);
      }
    }
  });
});

test("unrecognized consensus counts or provider error objects never turn into invented evidence", async () => {
  await withProvider((url) => url.pathname.endsWith("/grades-consensus")
    ? Response.json({ error: "Not authorized" }) : null, async () => {
    const feed = await loadResearchAlignment("AMZN", { now, loadPulse: mockPulse });
    assert.equal(feed.analysts.status, "unavailable");
    assert.equal(feed.alignment.label, "Insufficient evidence");
  });
  await assert.rejects(loadResearchAlignment("../bad"), /Invalid research stock symbol/);
});

function render(feed: ResearchAlignmentFeed | null, hasAccess = true): string {
  return renderToStaticMarkup(createElement(ResearchAlignmentPanel, {
    symbol: "AMZN", feed, hasAccess, loading: false, error: null, searchable: true,
    input: "AMZN", inputError: null, onInput: () => {}, onSubmit: () => {}, onRetry: () => {},
  }));
}

test("responsive cards disclose old reports, missing data, and the absence of a new score", async () => {
  await withProvider(null, async () => {
    const feed = await loadResearchAlignment("AMZN", { now, loadPulse: mockPulse });
    const html = render(feed);
    assert.match(html, /xl:grid-cols-3/);
    assert.match(html, /Older report/);
    assert.match(html, /2023-12-31/);
    assert.match(html, /not a combined score/);
    assert.match(html, /Quarterly fund disclosures are historical context/);
    assert.match(html, /Reported value/);
    assert.match(html, /SEC source filing/);
    assert.doesNotMatch(render(feed, false), /Reported value/);
    assert.match(render(null, false), /Explore Pro/);
  });
});
