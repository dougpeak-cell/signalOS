import { describe, expect, it } from "vitest";
import { buildEliteTradePlan } from "./eliteTradePlan";

describe("buildEliteTradePlan", () => {
  it("builds a confirmed long plan from bullish live structure", () => {
    const plan = buildEliteTradePlan({
      price: 102,
      tone: "bullish",
      vwap: 100,
      support: 99,
      resistance: 106,
    });

    expect(plan).toMatchObject({
      direction: "long",
      status: "ready",
      entryLow: 98.8,
      entryHigh: 99.4,
      invalidation: 97.81,
      target: 106,
    });
    expect(plan.rewardRisk).toBeGreaterThan(0);
  });

  it("builds a confirmed short plan from bearish live structure", () => {
    const plan = buildEliteTradePlan({
      price: 98,
      tone: "bearish",
      vwap: 100,
      support: 94,
      resistance: 101,
    });

    expect(plan).toMatchObject({
      direction: "short",
      status: "ready",
      entryLow: 100.6,
      entryHigh: 101.2,
      invalidation: 102.21,
      target: 94,
    });
    expect(plan.rewardRisk).toBeGreaterThan(0);
  });

  it("does not produce trade levels for neutral structure", () => {
    const plan = buildEliteTradePlan({ price: 100, tone: "neutral", vwap: 99.5 });

    expect(plan).toMatchObject({
      direction: "wait",
      status: "waiting",
      entryLow: null,
      target: null,
    });
  });

  it("keeps a confirmed setup in wait mode when reward to risk is below Elite quality", () => {
    const plan = buildEliteTradePlan({
      price: 100,
      tone: "bullish",
      vwap: 99,
      support: 99,
      resistance: 100,
    });

    expect(plan).toMatchObject({
      direction: "long",
      status: "waiting",
      statusLabel: "Risk / reward below Elite threshold",
    });
    expect(plan.rewardRisk).toBeLessThan(1.5);
  });

  it("does not produce a plan without a valid live price", () => {
    const plan = buildEliteTradePlan({ price: null, tone: "bullish" });

    expect(plan).toMatchObject({
      direction: "wait",
      status: "unavailable",
      invalidation: null,
    });
  });
});