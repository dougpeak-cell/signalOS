import { describe, expect, it, vi } from "vitest";
import {
  buildFeaturedPulseMeta,
  getFeaturedPulseFingerprint,
  getFeaturedPulseRefreshMessage,
  getFeaturedPulseDataState,
  getLatestEligibleMarketSessionDate,
  isUsMarketOpen,
} from "./featured-pulse-meta";

describe("Featured Pulse metadata", () => {
  it("never labels a stale snapshot as live", () => {
    vi.setSystemTime(new Date("2026-07-27T20:00:00.000Z"));

    expect(getFeaturedPulseDataState({
      marketDataAsOf: "2026-07-24T20:00:00.000Z",
      marketDataSource: "intraday",
      marketOpen: true,
    })).toBe("delayed");

    vi.useRealTimers();
  });

  it("reports a one-candidate universe explicitly", () => {
    vi.setSystemTime(new Date("2026-07-27T20:00:00.000Z"));

    const meta = buildFeaturedPulseMeta({
      generatedAt: "2026-07-27T20:00:00.000Z",
      marketDataAsOf: "2026-07-27T19:55:00.000Z",
      amsaCalculatedAt: "2026-07-27T20:00:00.000Z",
      persistedSnapshotAt: null,
      candidateUniverseCount: 120,
      rankedUniverseCount: 8,
      qualifiedCandidateCount: 1,
      rankedCandidateSymbols: ["DLR"],
      newCalculationOccurred: true,
      marketDataSource: "intraday",
      marketOpen: true,
    });

    expect(meta).toMatchObject({
      dataState: "live",
      singleCandidateUniverse: true,
      candidateUniverseCount: 120,
      rankedCandidateSymbols: ["DLR"],
    });

    vi.useRealTimers();
  });

  it("distinguishes open sessions from closed weekends", () => {
    expect(isUsMarketOpen(new Date("2026-07-27T15:00:00.000Z"))).toBe(true);
    expect(isUsMarketOpen(new Date("2026-07-26T15:00:00.000Z"))).toBe(false);
  });

  it("keeps Friday eligible through the weekend and Monday premarket", () => {
    expect(
      getLatestEligibleMarketSessionDate(new Date("2026-07-25T17:00:00.000Z")),
    ).toBe("2026-07-24");
    expect(
      getLatestEligibleMarketSessionDate(new Date("2026-07-27T12:00:00.000Z")),
    ).toBe("2026-07-24");
    expect(
      getLatestEligibleMarketSessionDate(new Date("2026-07-27T15:00:00.000Z")),
    ).toBe("2026-07-27");
  });

  it("reports unchanged refreshes without requiring a visual reset", () => {
    const fingerprint = getFeaturedPulseFingerprint({
      symbol: "DLR",
      pulseScore: 71,
      featuredScore: 73,
    });

    expect(getFeaturedPulseRefreshMessage(fingerprint, fingerprint)).toBe(
      "Checked just now · No verified Pulse change",
    );
  });
});