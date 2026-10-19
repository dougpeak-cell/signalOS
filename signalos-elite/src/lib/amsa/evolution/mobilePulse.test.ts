import { describe, expect, it } from "vitest";
import type { AMSAPulseSnapshot } from "../types";
import { distinctVerifiedStockReadings, isMeaningfulPulseChange, PULSE_ALERT_COOLDOWN_MS } from "./mobilePulse";

function snapshot(overrides: Partial<AMSAPulseSnapshot> = {}): AMSAPulseSnapshot {
  return {
    entityType: "stock", entityKey: "NVDA", frequency: "daily", score: 72, confidence: 90,
    components: [], reasons: [], warnings: [], metadata: { verified: true },
    sourceUpdatedAt: "2026-10-15T20:00:00Z", calculatedAt: "2026-10-15T20:01:00Z", ...overrides,
  };
}

describe("mobile verified Pulse readings", () => {
  it("rejects unverified, non-daily, malformed and missing-source readings", () => {
    expect(distinctVerifiedStockReadings([
      snapshot({ metadata: {} }), snapshot({ frequency: "five_minute" }),
      snapshot({ score: null }), snapshot({ score: 101 }), snapshot({ sourceUpdatedAt: null }),
      snapshot({ sourceUpdatedAt: "invalid" }), snapshot({ calculatedAt: "invalid" }),
    ])).toEqual([]);
  });

  it("does not turn replayed source data into a second reading", () => {
    expect(distinctVerifiedStockReadings([
      snapshot(), snapshot({ calculatedAt: "2026-10-16T20:01:00Z" }),
    ])).toHaveLength(1);
  });

  it("sorts genuine readings by market source time", () => {
    const first = snapshot();
    const second = snapshot({ sourceUpdatedAt: "2026-10-16T20:00:00Z" });
    expect(distinctVerifiedStockReadings([second, first])).toEqual([first, second]);
  });
});

describe("mobile Pulse change alerts", () => {
  const now = Date.parse("2026-10-19T12:00:00Z");
  const previous = snapshot();
  const current = snapshot({ score: 81, sourceUpdatedAt: "2026-10-16T20:00:00Z" });

  it("allows a meaningful change between distinct verified readings", () => {
    expect(isMeaningfulPulseChange(previous, current, null, now)).toBe(true);
  });
  it("allows meaningful declines", () => {
    expect(isMeaningfulPulseChange(previous, { ...current, score: 61 }, null, now)).toBe(true);
  });
  it("rejects noise, replayed data, unverified data, reversed history, and another stock", () => {
    expect(isMeaningfulPulseChange(previous, { ...current, score: 74 }, null, now)).toBe(false);
    expect(isMeaningfulPulseChange(previous, { ...current, sourceUpdatedAt: previous.sourceUpdatedAt }, null, now)).toBe(false);
    expect(isMeaningfulPulseChange(previous, { ...current, metadata: {} }, null, now)).toBe(false);
    expect(isMeaningfulPulseChange(current, previous, null, now)).toBe(false);
    expect(isMeaningfulPulseChange(previous, { ...current, entityKey: "AAPL" }, null, now)).toBe(false);
  });
  it("rate limits alerts to once per stock per 24 hours", () => {
    expect(isMeaningfulPulseChange(previous, current, now - 1000, now)).toBe(false);
    expect(isMeaningfulPulseChange(previous, current, now - PULSE_ALERT_COOLDOWN_MS, now)).toBe(true);
  });
  it("rejects future source data", () => {
    expect(isMeaningfulPulseChange(previous, current, null, Date.parse("2026-10-15T21:00:00Z"))).toBe(false);
  });
});