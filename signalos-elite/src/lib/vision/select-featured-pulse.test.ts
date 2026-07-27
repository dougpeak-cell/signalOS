import { describe, expect, it } from "vitest";
import {
  rankFeaturedPulseCandidates,
  selectFeaturedPulse,
  type FeaturedPulseCandidate,
} from "./select-featured-pulse";

const NOW = new Date("2026-07-27T20:00:00.000Z");

function candidate(
  symbol: string,
  overrides: Partial<FeaturedPulseCandidate> = {},
): FeaturedPulseCandidate {
  return {
    symbol,
    pulseScore: 72,
    opportunityScore: 72,
    confidence: 75,
    dnaAlignment: 75,
    rvol: 2,
    riskScore: 40,
    qualified: true,
    asOf: "2026-07-27T19:55:00.000Z",
    ...overrides,
  };
}

describe("Featured Pulse ranking", () => {
  it("ranks multiple current candidates", () => {
    const ranked = rankFeaturedPulseCandidates([
      candidate("DLR"),
      candidate("NVDA", { opportunityScore: 78 }),
      candidate("MSFT", { pulseScore: 80 }),
    ], NOW);

    expect(ranked).toHaveLength(3);
    expect(ranked.map((entry) => entry.symbol)).toEqual(
      expect.arrayContaining(["DLR", "NVDA", "MSFT"]),
    );
  });

  it("allows a stronger stock to replace DLR", () => {
    const selected = selectFeaturedPulse([
      candidate("DLR"),
      candidate("NVDA", {
        pulseScore: 88,
        opportunityScore: 90,
        confidence: 90,
        dnaAlignment: 85,
        rvol: 3.2,
      }),
    ], NOW);

    expect(selected?.symbol).toBe("NVDA");
  });

  it("rejects stale snapshots instead of presenting them as live", () => {
    const selected = selectFeaturedPulse([
      candidate("DLR", { asOf: "2026-07-20T19:55:00.000Z" }),
    ], NOW);

    expect(selected).toBeNull();
  });
});