import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("@/lib/intelligence/contextStore", () => ({
  getStoredMarketContext: vi.fn(),
}));

vi.mock("@/lib/market/historyBars", () => ({
  getHistoryBars: vi.fn(),
}));

vi.mock("@/lib/market/sectorComparison", () => ({
  buildSectorComparisonData: vi.fn(),
}));

vi.mock("@/lib/market/serverQuote", () => ({
  fetchServerQuoteMap: vi.fn(),
}));

vi.mock("@/lib/today/setupDiscoveryData", () => ({
  getSetupDiscoveryData: vi.fn(),
}));

vi.mock("@/lib/intelligence/visionPortfolio", () => ({
  buildVisionPortfolioIntelligence: vi.fn(),
}));

vi.mock("@/lib/vision/personal/buildPersonalIntelligence", () => ({
  buildPersonalIntelligence: vi.fn(),
}));

vi.mock("@/lib/vision/select-featured-pulse", async () =>
  import("../../../../lib/vision/select-featured-pulse"),
);

vi.mock("@/lib/vision/market-volume-score", async () =>
  import("../../../../lib/vision/market-volume-score"),
);

vi.mock("@/lib/vision/personal/classifyPortfolioHoldings", () => ({
  classifyPortfolioHoldings: vi.fn(async (holdings: Array<Record<string, unknown>>) => holdings),
}));

vi.mock("@/lib/vision/personal/classificationFallbacks", () => ({
  getClassificationFallback: vi.fn(() => null),
}));

vi.mock("@/lib/vision/personal/resolvePortfolioClassification", () => ({
  resolvePortfolioClassification: vi.fn(async (symbol: string) => ({
    symbol,
    companyName: null,
    sector: null,
    industry: null,
    source: "unresolved",
  })),
}));

vi.mock("@/lib/intelligence/market-health", () => ({
  calculateMarketHealth: vi.fn(() => 0),
  getMarketRegime: vi.fn(() => "Balanced"),
}));

vi.mock("@/lib/intelligence/opportunity-filter", () => ({
  qualifiesForVision: vi.fn(() => false),
}));

vi.mock("@/lib/intelligence/scores", () => ({
  calculateSigiScores: vi.fn(),
}));

vi.mock("@/lib/intelligence/vision-summary", () => ({
  buildVisionSummary: vi.fn(() => ""),
}));

vi.mock("@/lib/intelligence/visionHorizons", () => ({
  buildVisionHorizonViews: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

import { getStoredMarketContext } from "@/lib/intelligence/contextStore";
import { buildSectorComparisonData } from "@/lib/market/sectorComparison";
import { fetchServerQuoteMap } from "@/lib/market/serverQuote";
import { getSetupDiscoveryData } from "@/lib/today/setupDiscoveryData";
import { buildVisionPortfolioIntelligence } from "@/lib/intelligence/visionPortfolio";
import { buildPersonalIntelligence } from "@/lib/vision/personal/buildPersonalIntelligence";
import { GET } from "./route";

describe("GET /api/vision/overview", () => {
  beforeEach(() => {
    vi.mocked(getStoredMarketContext).mockResolvedValue({
      portfolio: [
        { symbol: "XOM", marketValue: 100 },
        { symbol: "PEP", marketValue: 200 },
        { symbol: "MO", marketValue: 300 },
        { symbol: "NVDA", marketValue: 400 },
        { symbol: "MSFT", marketValue: 680 },
        { symbol: "ABBV", marketValue: 120, sector: "Healthcare" },
        { symbol: "TSLA", marketValue: 100 },
        { symbol: "AMZN", marketValue: 100 },
        { symbol: "GOOGL", marketValue: 100 },
        { symbol: "META", marketValue: 100 },
        { symbol: "AAPL", marketValue: 100 },
        { symbol: "TSLA", marketValue: 100 },
        { symbol: "NFLX", marketValue: 100 },
      ],
      watchlist: [],
      updatedAt: null,
    });

    vi.mocked(buildSectorComparisonData).mockResolvedValue({
      rows: [],
      freshness: "close",
      generatedAt: "2026-07-25T15:00:00.000Z",
    });

    vi.mocked(fetchServerQuoteMap).mockResolvedValue({});

    vi.mocked(getSetupDiscoveryData).mockResolvedValue({
      top: [],
      emerging: [],
      candidates: [],
    });

    vi.mocked(buildVisionPortfolioIntelligence).mockResolvedValue({
      hasPortfolio: true,
      holdingsCount: 13,
      classifiedHoldingsCount: 5,
      classificationCoverage: 0.385,
      sectorAnalysisAvailable: false,
      totalValue: 2500,
      topSector: null,
      topSectorWeight: 0,
      concentrationLevel: "Low",
      correlationLevel: "Low",
      sensitivityLevel: "Low",
      alignedHoldings: 0,
      weakeningHoldings: 0,
      nearbyEarningsCount: 0,
      exposureSummary: "",
      concentrationSummary: "",
      sectorAlignmentSummary: "",
      riskConflictSummary: "",
      earningsSummary: "",
      correlationSummary: "",
      sensitivitySummary: "",
      sectorExposure: [],
      topSectors: [],
      riskConflicts: [],
      holdings: [],
    });

    vi.mocked(buildPersonalIntelligence).mockReturnValue({
      holdings: Array.from({ length: 13 }, (_, index) => ({
        symbol: `H${index + 1}`,
        marketValue: 100,
        classificationStatus: "pending",
        weight: 100 / 13,
      })),
      coverage: {
        totalHoldings: 13,
        classifiedHoldings: 5,
        partialHoldings: 1,
        pendingHoldings: 7,
        holdingCoveragePercent: 38.5,
        valueCoveragePercent: 67.2,
        isReliable: false,
        requiredCoveragePercent: 80,
      },
      trackedValue: 2500,
      dayChangePercent: null,
      portfolioPulse: null,
      alignmentPercent: null,
      concentrationLevel: null,
      largestExposure: null,
      message: "Sigi is building a complete understanding of your holdings. Portfolio-level conclusions remain paused until classification coverage is reliable.",
    });
  });

  it("returns unsliced personal intelligence holdings with both coverage percentages", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(buildPersonalIntelligence).toHaveBeenCalledTimes(1);
    expect(vi.mocked(buildPersonalIntelligence).mock.calls[0]?.[0]).toHaveLength(13);
    expect(payload.personalIntelligence).toBeTruthy();
    expect(payload.personalIntelligence.holdings).toHaveLength(13);
    expect(payload.personalIntelligence.coverage.holdingCoveragePercent).toBe(38.5);
    expect(payload.personalIntelligence.coverage.valueCoveragePercent).toBe(67.2);
    expect(payload.featuredPulse).toBeNull();
    expect(payload.featuredPulseRanking).toEqual([]);
    expect(payload.generatedAt).toEqual(expect.any(String));
    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, must-revalidate",
    );
  });
});