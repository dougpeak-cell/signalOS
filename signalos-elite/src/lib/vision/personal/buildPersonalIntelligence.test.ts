import {
  describe,
  expect,
  it,
} from "vitest";

import { buildPersonalIntelligence } from "./buildPersonalIntelligence";

type HoldingInput = Parameters<typeof buildPersonalIntelligence>[0][number];

function holding(overrides: HoldingInput): HoldingInput {
  return overrides;
}

describe("buildPersonalIntelligence", () => {
  it("returns an empty progress state when no holdings are present", () => {
    const result = buildPersonalIntelligence([]);

    expect(result.holdings).toEqual([]);
    expect(result.coverage).toEqual({
      totalHoldings: 0,
      classifiedHoldings: 0,
      partialHoldings: 0,
      pendingHoldings: 0,
      holdingCoveragePercent: 0,
      valueCoveragePercent: 0,
      isReliable: false,
      requiredCoveragePercent: 80,
    });
    expect(result.trackedValue).toBe(0);
    expect(result.message).toContain("building a complete understanding");
  });

  it("builds a reliable result for a single classified holding", () => {
    const result = buildPersonalIntelligence([
      holding({
        symbol: "msft",
        quantity: 2,
        currentPrice: 100,
      }),
    ]);

    expect(result.holdings).toHaveLength(1);
    expect(result.holdings[0]).toMatchObject({
      symbol: "MSFT",
      companyName: "Microsoft",
      sector: "Technology",
      industry: "Software",
      classificationStatus: "classified",
      marketValue: 200,
      weight: 100,
    });
    expect(result.coverage.holdingCoveragePercent).toBe(100);
    expect(result.coverage.valueCoveragePercent).toBe(100);
    expect(result.coverage.isReliable).toBe(true);
    expect(result.largestExposure).toEqual({
      sector: "Technology",
      weight: 100,
    });
    expect(result.concentrationLevel).toBe("High");
  });

  it("preserves all 13 holdings and separates holding coverage from value coverage", () => {
    const result = buildPersonalIntelligence([
      holding({ symbol: "XOM", marketValue: 100, pulseScore: null }),
      holding({ symbol: "PEP", marketValue: 200, pulseScore: 72, pulseDirection: "improving" }),
      holding({ symbol: "MO", marketValue: 300, pulseScore: 68, pulseDirection: "improving" }),
      holding({ symbol: "NVDA", marketValue: 400, pulseScore: 45, pulseDirection: "weakening" }),
      holding({ symbol: "MSFT", marketValue: 680 }),
      holding({ symbol: "ABBV", marketValue: 120, sector: "Healthcare" }),
      holding({ symbol: "TSLA", marketValue: 100 }),
      holding({ symbol: "AMZN", marketValue: 100 }),
      holding({ symbol: "GOOGL", marketValue: 100 }),
      holding({ symbol: "META", marketValue: 100 }),
      holding({ symbol: "AAPL", marketValue: 100 }),
      holding({ symbol: "TSLA", marketValue: 100 }),
      holding({ symbol: "NFLX", marketValue: 100 }),
    ]);

    expect(result.holdings).toHaveLength(13);
    expect(result.coverage.totalHoldings).toBe(13);
    expect(result.coverage.classifiedHoldings).toBe(5);
    expect(result.coverage.partialHoldings).toBe(1);
    expect(result.coverage.pendingHoldings).toBe(7);
    expect(result.coverage.holdingCoveragePercent).toBe(38.5);
    expect(result.coverage.valueCoveragePercent).toBe(67.2);
    expect(result.coverage.isReliable).toBe(false);
    expect(result.largestExposure).toBeNull();
    expect(result.concentrationLevel).toBeNull();
    expect(result.holdings.filter((entry) => entry.symbol === "TSLA")).toHaveLength(2);
    expect(result.holdings.find((entry) => entry.symbol === "ABBV")).toMatchObject({
      classificationStatus: "partial",
      classificationReason: "Additional industry information is still being resolved.",
    });
    expect(result.holdings.find((entry) => entry.symbol === "MSFT")?.pulseScore).toBeNull();
  });

  it("marks sector-only or industry-only rows as partial", () => {
    const result = buildPersonalIntelligence([
      holding({ symbol: "ABC", marketValue: 100, sector: "Healthcare" }),
      holding({ symbol: "XYZ", marketValue: 100, industry: "Biotech" }),
    ]);

    expect(result.coverage.classifiedHoldings).toBe(0);
    expect(result.coverage.partialHoldings).toBe(2);
    expect(result.coverage.pendingHoldings).toBe(0);
    expect(result.holdings.map((entry) => entry.classificationStatus)).toEqual([
      "partial",
      "partial",
    ]);
  });

  it("keeps value coverage at zero when holdings have no market value", () => {
    const result = buildPersonalIntelligence([
      holding({ symbol: "XOM", quantity: 0, currentPrice: 100 }),
      holding({ symbol: "MSFT", marketValue: 0 }),
    ]);

    expect(result.trackedValue).toBe(0);
    expect(result.holdings.every((entry) => entry.weight === 0)).toBe(true);
    expect(result.coverage.holdingCoveragePercent).toBe(100);
    expect(result.coverage.valueCoveragePercent).toBe(0);
    expect(result.coverage.isReliable).toBe(false);
  });

  it("preserves duplicate symbols as separate holdings", () => {
    const result = buildPersonalIntelligence([
      holding({ symbol: "MSFT", marketValue: 250 }),
      holding({ symbol: "MSFT", marketValue: 750 }),
    ]);

    expect(result.holdings).toHaveLength(2);
    expect(result.holdings.filter((entry) => entry.symbol === "MSFT")).toHaveLength(2);
    expect(result.holdings.map((entry) => entry.weight)).toEqual([75, 25]);
  });
});