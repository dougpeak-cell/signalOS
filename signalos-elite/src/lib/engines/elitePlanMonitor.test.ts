import { describe, expect, it } from "vitest";
import {
  advanceElitePlanTracker,
  createElitePlanTracker,
} from "./elitePlanMonitor";
import type { EliteTradePlan } from "./eliteTradePlan";

const longPlan: EliteTradePlan = {
  direction: "long",
  status: "ready",
  statusLabel: "Long condition active",
  confirmation: "Require confirmation.",
  entryLow: 99,
  entryHigh: 101,
  invalidation: 97,
  target: 106,
  rewardRisk: 2,
};

const shortPlan: EliteTradePlan = {
  ...longPlan,
  direction: "short",
  entryLow: 100,
  entryHigh: 102,
  invalidation: 104,
  target: 95,
};

describe("Elite plan monitor", () => {
  it("waits for a long entry before tracking its target", () => {
    const tracker = createElitePlanTracker("nvda", longPlan, 103, "2026-09-14T09:30:00.000Z");
    expect(tracker).toMatchObject({ status: "watching_entry", ticker: "NVDA" });

    const entered = advanceElitePlanTracker(tracker!, 100, "2026-09-14T09:35:00.000Z");
    expect(entered).toMatchObject({ event: "entry_reached", tracker: { status: "tracking" } });

    const resolved = advanceElitePlanTracker(entered.tracker, 106, "2026-09-14T10:00:00.000Z");
    expect(resolved).toMatchObject({
      event: "target_reached",
      tracker: { status: "target_reached", resolvedPrice: 106 },
    });
  });

  it("records an invalidation only after the entry zone has been reached", () => {
    const tracker = createElitePlanTracker("nvda", longPlan, 100, "2026-09-14T09:30:00.000Z");
    expect(tracker?.status).toBe("tracking");

    const resolved = advanceElitePlanTracker(tracker!, 96.5, "2026-09-14T10:00:00.000Z");
    expect(resolved).toMatchObject({
      event: "invalidated",
      tracker: { status: "invalidated", resolvedPrice: 96.5 },
    });
  });

  it("handles short targets using downward price movement", () => {
    const tracker = createElitePlanTracker("nvda", shortPlan, 101, "2026-09-14T09:30:00.000Z");
    const resolved = advanceElitePlanTracker(tracker!, 95, "2026-09-14T10:00:00.000Z");

    expect(resolved).toMatchObject({
      event: "target_reached",
      tracker: { status: "target_reached", resolvedPrice: 95 },
    });
  });

  it("does not create a tracker for a wait plan", () => {
    expect(
      createElitePlanTracker("nvda", { ...longPlan, direction: "wait", entryLow: null }, 100)
    ).toBeNull();
  });

  it("does not track a candidate below the Elite reward-to-risk threshold", () => {
    expect(
      createElitePlanTracker("nvda", { ...longPlan, status: "waiting" }, 100)
    ).toBeNull();
  });
});