import assert from "node:assert/strict";
import test from "node:test";

type MockProfile = {
  companyName: string;
  sector: string;
  price: number;
};

type MockTarget = {
  targetConsensus: number;
  targetHigh: number;
  targetLow: number;
};

type MockGrade = {
  newGrade: string;
  gradingCompany: string;
  publishedDate: string;
};

const broadSymbols = [
  ["MSFT", "Technology"],
  ["LLY", "Healthcare"],
  ["CAT", "Industrials"],
  ["AMZN", "Consumer Cyclical"],
  ["PG", "Consumer Defensive"],
  ["XOM", "Energy"],
  ["GOOG", "Communication Services"],
  ["NEE", "Utilities"],
  ["LIN", "Basic Materials"],
] as const;

const profileBySymbol = new Map<string, MockProfile>([
  ...broadSymbols.map(([symbol, sector], index) => [
    symbol,
    {
      companyName: `${symbol} Holdings`,
      sector,
      price: 100 + index * 10,
    },
  ]),
  ["GS", { companyName: "Goldman Sachs", sector: "Financial Services", price: 610 }],
  ["C", { companyName: "Citigroup", sector: "Financial Services", price: 84 }],
  ["AXP", { companyName: "American Express", sector: "Financial Services", price: 282 }],
  ["PLD", { companyName: "Prologis", sector: "Real Estate", price: 109 }],
  ["SPG", { companyName: "Simon Property Group", sector: "Real Estate", price: 167 }],
  ["PSA", { companyName: "Public Storage", sector: "Real Estate", price: 298 }],
  ["WELL", { companyName: "Welltower", sector: "Real Estate", price: 151 }],
  ["EQIX", { companyName: "Equinix", sector: "Real Estate", price: 772 }],
  ["AMT", { companyName: "American Tower", sector: "Real Estate", price: 198 }],
  ["O", { companyName: "Realty Income", sector: "Real Estate", price: 57 }],
  ["DLR", { companyName: "Digital Realty", sector: "Real Estate", price: 163 }],
  ["CBRE", { companyName: "CBRE Group", sector: "Real Estate", price: 136 }],
]);

const targetBySymbol = new Map<string, MockTarget>([
  ...Array.from(profileBySymbol.entries()).map(([symbol, profile], index) => [
    symbol,
    {
      targetConsensus: profile.price + 20 + index,
      targetHigh: profile.price + 30 + index,
      targetLow: profile.price + 10 + index,
    },
  ]),
]);

const recentGradeDate = "2026-06-18";
const staleGradeDate = "2026-05-20";

const gradesBySymbol = new Map<string, MockGrade[]>([
  ...broadSymbols.map(([symbol]) => [
    symbol,
    [
      {
        newGrade: "Buy",
        gradingCompany: "Mock Research",
        publishedDate: recentGradeDate,
      },
    ],
  ]),
  [
    "GS",
    [{ newGrade: "Buy", gradingCompany: "Mock Research", publishedDate: recentGradeDate }],
  ],
  [
    "C",
    [{ newGrade: "Strong Buy", gradingCompany: "Mock Research", publishedDate: recentGradeDate }],
  ],
  [
    "AXP",
    [{ newGrade: "Buy", gradingCompany: "Mock Research", publishedDate: recentGradeDate }],
  ],
  [
    "WELL",
    [{ newGrade: "Buy", gradingCompany: "Mock Research", publishedDate: staleGradeDate }],
  ],
  [
    "EQIX",
    [{ newGrade: "Buy", gradingCompany: "Mock Research", publishedDate: staleGradeDate }],
  ],
  [
    "AMT",
    [{ newGrade: "Buy", gradingCompany: "Mock Research", publishedDate: staleGradeDate }],
  ],
  [
    "O",
    [{ newGrade: "Buy", gradingCompany: "Mock Research", publishedDate: staleGradeDate }],
  ],
  [
    "DLR",
    [{ newGrade: "Buy", gradingCompany: "Mock Research", publishedDate: staleGradeDate }],
  ],
  [
    "CBRE",
    [{ newGrade: "Buy", gradingCompany: "Mock Research", publishedDate: staleGradeDate }],
  ],
  [
    "PLD",
    [{ newGrade: "Buy", gradingCompany: "Mock Research", publishedDate: recentGradeDate }],
  ],
  [
    "SPG",
    [{ newGrade: "Strong Buy", gradingCompany: "Mock Research", publishedDate: recentGradeDate }],
  ],
  [
    "PSA",
    [{ newGrade: "Buy", gradingCompany: "Mock Research", publishedDate: recentGradeDate }],
  ],
]);

const financialBackfillRows = [
  { symbol: "VOO", companyName: "Vanguard S&P 500 ETF", price: 688, isEtf: true, isFund: false },
  { symbol: "SPY", companyName: "SPDR S&P 500 ETF Trust", price: 621, isEtf: true, isFund: false },
  { symbol: "IVV", companyName: "iShares Core S&P 500 ETF", price: 604, isEtf: true, isFund: false },
  { symbol: "VTI", companyName: "Vanguard Total Stock Market ETF", price: 319, isEtf: true, isFund: false },
  { symbol: "QQQ", companyName: "Invesco QQQ Trust", price: 546, isEtf: true, isFund: false },
  { symbol: "VXUS", companyName: "Vanguard Total International Stock ETF", price: 71, isEtf: true, isFund: false },
  { symbol: "VUG", companyName: "Vanguard Growth ETF", price: 438, isEtf: true, isFund: false },
  { symbol: "SCHD", companyName: "Schwab U.S. Dividend Equity ETF", price: 82, isEtf: true, isFund: false },
  { symbol: "GS", companyName: "Goldman Sachs", price: 610, isEtf: false, isFund: false },
  { symbol: "C", companyName: "Citigroup", price: 84, isEtf: false, isFund: false },
  { symbol: "AXP", companyName: "American Express", price: 282, isEtf: false, isFund: false },
];

const realEstateBackfillRows = [
  { symbol: "WELL", companyName: "Welltower", price: 151, isEtf: false, isFund: false },
  { symbol: "EQIX", companyName: "Equinix", price: 772, isEtf: false, isFund: false },
  { symbol: "AMT", companyName: "American Tower", price: 198, isEtf: false, isFund: false },
  { symbol: "O", companyName: "Realty Income", price: 57, isEtf: false, isFund: false },
  { symbol: "DLR", companyName: "Digital Realty", price: 163, isEtf: false, isFund: false },
  { symbol: "CBRE", companyName: "CBRE Group", price: 136, isEtf: false, isFund: false },
  { symbol: "PLD", companyName: "Prologis", price: 109, isEtf: false, isFund: false },
  { symbol: "SPG", companyName: "Simon Property Group", price: 167, isEtf: false, isFund: false },
  { symbol: "PSA", companyName: "Public Storage", price: 298, isEtf: false, isFund: false },
];

test("experts feed keeps exact sector buckets and backfills financial services and real estate", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.FMP_API_KEY;

  process.env.FMP_API_KEY = "test-key";

  globalThis.fetch = async (input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());

    if (url.pathname.endsWith("/upgrades-downgrades-consensus-bulk")) {
      const csv = [
        "symbol,strongBuy,buy,hold,sell,strongSell,consensus",
        ...broadSymbols.map(([symbol], index) => `${symbol},4,6,1,0,0,${index % 2 === 0 ? "Strong Buy" : "Buy"}`),
      ].join("\n");

      return new Response(csv, { status: 200 });
    }

    if (url.pathname.endsWith("/company-screener")) {
      const sector = url.searchParams.get("sector");

      if (sector === "Financial Services") {
        return Response.json(financialBackfillRows);
      }

      if (sector === "Real Estate") {
        return Response.json(realEstateBackfillRows);
      }

      return Response.json([]);
    }

    if (url.pathname.endsWith("/profile")) {
      const symbol = url.searchParams.get("symbol") ?? "";
      const profile = profileBySymbol.get(symbol);
      assert.ok(profile, `missing mock profile for ${symbol}`);
      return Response.json([profile]);
    }

    if (url.pathname.endsWith("/price-target-consensus")) {
      const symbol = url.searchParams.get("symbol") ?? "";
      const target = targetBySymbol.get(symbol);
      assert.ok(target, `missing mock target for ${symbol}`);
      return Response.json([target]);
    }

    if (url.pathname.endsWith("/grades")) {
      const symbol = url.searchParams.get("symbol") ?? "";
      return Response.json(gradesBySymbol.get(symbol) ?? []);
    }

    throw new Error(`Unhandled fetch URL: ${url.toString()}`);
  };

  try {
    const module = await import("@/lib/experts/fmpLeaders");
    const feed = await module.loadFmpExpertsFeed();

    assert.deepEqual(Object.keys(feed.sectorRows), module.EXPERT_SECTOR_BUCKETS);
    assert.equal(feed.sectorRows["Financial Services"]?.length, 3);
    assert.equal(feed.sectorRows["Real Estate"]?.length, 3);
    assert.deepEqual(
      [...(feed.sectorRows["Financial Services"]?.map((row) => row.symbol) ?? [])].sort(),
      ["AXP", "C", "GS"]
    );
    assert.deepEqual(
      [...(feed.sectorRows["Real Estate"]?.map((row) => row.symbol) ?? [])].sort(),
      ["PLD", "PSA", "SPG"]
    );
  } finally {
    globalThis.fetch = originalFetch;

    if (originalApiKey == null) {
      delete process.env.FMP_API_KEY;
    } else {
      process.env.FMP_API_KEY = originalApiKey;
    }
  }
});