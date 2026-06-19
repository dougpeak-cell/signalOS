import assert from "node:assert/strict";
import test from "node:test";

const recentGradeDate = "2026-06-18";

test("experts feed preserves explicit rating transitions for upgrades and downgrades", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.FMP_API_KEY;

  process.env.FMP_API_KEY = "test-key";

  globalThis.fetch = async (input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());

    if (url.pathname.endsWith("/upgrades-downgrades-consensus-bulk")) {
      const csv = [
        "symbol,strongBuy,buy,hold,sell,strongSell,consensus",
        "NVDA,6,8,1,0,0,Strong Buy",
        "TSLA,4,5,2,1,0,Buy",
      ].join("\n");

      return new Response(csv, { status: 200 });
    }

    if (url.pathname.endsWith("/company-screener")) {
      return Response.json([]);
    }

    if (url.pathname.endsWith("/profile")) {
      const symbol = url.searchParams.get("symbol");

      if (symbol === "NVDA") {
        return Response.json([{ companyName: "NVIDIA", sector: "Technology", price: 182.4 }]);
      }

      if (symbol === "TSLA") {
        return Response.json([{ companyName: "Tesla", sector: "Consumer Cyclical", price: 177.2 }]);
      }

      throw new Error(`Unhandled profile symbol: ${symbol}`);
    }

    if (url.pathname.endsWith("/price-target-consensus")) {
      const symbol = url.searchParams.get("symbol");

      if (symbol === "NVDA") {
        return Response.json([{ targetConsensus: 225, targetHigh: 240, targetLow: 190 }]);
      }

      if (symbol === "TSLA") {
        return Response.json([{ targetConsensus: 155, targetHigh: 175, targetLow: 120 }]);
      }

      throw new Error(`Unhandled target symbol: ${symbol}`);
    }

    if (url.pathname.endsWith("/grades")) {
      const symbol = url.searchParams.get("symbol");

      if (symbol === "NVDA") {
        return Response.json([
          {
            previousGrade: "Hold",
            newGrade: "Buy",
            action: "Upgrade",
            gradingCompany: "Mock Research",
            publishedDate: recentGradeDate,
          },
        ]);
      }

      if (symbol === "TSLA") {
        return Response.json([
          {
            previousGrade: "Buy",
            newGrade: "Hold",
            gradingCompany: "Mock Research",
            publishedDate: recentGradeDate,
          },
        ]);
      }

      return Response.json([]);
    }

    throw new Error(`Unhandled fetch URL: ${url.toString()}`);
  };

  try {
    const module = await import("@/lib/experts/fmpLeaders");
    const feed = await module.loadFmpExpertsFeed();

    const nvda = feed.rows.find((row) => row.symbol === "NVDA");
    const tsla = feed.rows.find((row) => row.symbol === "TSLA");

    assert.ok(nvda, "expected NVDA in diversified experts feed");
    assert.equal(nvda.previousGrade, "Hold");
    assert.equal(nvda.currentGrade, "Buy");
    assert.equal(nvda.ratingTransition, "upgrade");

    assert.ok(tsla, "expected TSLA in diversified experts feed");
    assert.equal(tsla.previousGrade, "Buy");
    assert.equal(tsla.currentGrade, "Hold");
    assert.equal(tsla.ratingTransition, "downgrade");
  } finally {
    globalThis.fetch = originalFetch;

    if (originalApiKey == null) {
      delete process.env.FMP_API_KEY;
    } else {
      process.env.FMP_API_KEY = originalApiKey;
    }
  }
});