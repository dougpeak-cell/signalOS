import type { EliteTradePlan } from "@/lib/engines/eliteTradePlan";

export const ELITE_PLAN_TRACKING_STORAGE_KEY = "signalos.elite-plan-tracking.v1";
export const ELITE_PLAN_TRACKING_UPDATED_EVENT = "signalos:elite-plan-tracking-updated";

export type ElitePlanTrackerStatus =
  | "watching_entry"
  | "tracking"
  | "target_reached"
  | "invalidated";

export type ElitePlanTracker = {
  id: string;
  ticker: string;
  direction: "long" | "short";
  entryLow: number;
  entryHigh: number;
  invalidation: number;
  target: number;
  status: ElitePlanTrackerStatus;
  armedAt: string;
  enteredAt: string | null;
  resolvedAt: string | null;
  resolvedPrice: number | null;
  lastPrice: number;
};

export type ElitePlanTrackerEvent =
  | "entry_reached"
  | "target_reached"
  | "invalidated"
  | null;

export type ElitePlanTrackerAdvance = {
  tracker: ElitePlanTracker;
  event: ElitePlanTrackerEvent;
};

function finitePrice(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isInsideEntryZone(tracker: ElitePlanTracker, price: number): boolean {
  return price >= tracker.entryLow && price <= tracker.entryHigh;
}

export function createElitePlanTracker(
  ticker: string,
  plan: EliteTradePlan,
  price: number | null,
  now = new Date().toISOString()
): ElitePlanTracker | null {
  const entryLow = plan.entryLow;
  const entryHigh = plan.entryHigh;
  const invalidation = plan.invalidation;
  const target = plan.target;

  if (
    plan.direction === "wait" ||
    plan.status !== "ready" ||
    !finitePrice(entryLow) ||
    !finitePrice(entryHigh) ||
    !finitePrice(invalidation) ||
    !finitePrice(target) ||
    !finitePrice(price)
  ) {
    return null;
  }

  const normalizedTicker = ticker.trim().toUpperCase();
  if (!normalizedTicker) return null;

  const tracker: ElitePlanTracker = {
    id: `${normalizedTicker}-${now}`,
    ticker: normalizedTicker,
    direction: plan.direction,
    entryLow,
    entryHigh,
    invalidation,
    target,
    status: "watching_entry",
    armedAt: now,
    enteredAt: null,
    resolvedAt: null,
    resolvedPrice: null,
    lastPrice: price,
  };

  if (!isInsideEntryZone(tracker, price)) return tracker;

  return {
    ...tracker,
    status: "tracking",
    enteredAt: now,
  };
}

export function advanceElitePlanTracker(
  tracker: ElitePlanTracker,
  price: number | null,
  now = new Date().toISOString()
): ElitePlanTrackerAdvance {
  if (
    !finitePrice(price) ||
    tracker.lastPrice === price ||
    tracker.status === "target_reached" ||
    tracker.status === "invalidated"
  ) {
    return { tracker, event: null };
  }

  const nextTracker = { ...tracker, lastPrice: price };

  if (tracker.status === "watching_entry") {
    if (!isInsideEntryZone(nextTracker, price)) {
      return { tracker: nextTracker, event: null };
    }

    return {
      tracker: { ...nextTracker, status: "tracking", enteredAt: now },
      event: "entry_reached",
    };
  }

  const targetReached =
    tracker.direction === "long" ? price >= tracker.target : price <= tracker.target;
  if (targetReached) {
    return {
      tracker: {
        ...nextTracker,
        status: "target_reached",
        resolvedAt: now,
        resolvedPrice: price,
      },
      event: "target_reached",
    };
  }

  const invalidated =
    tracker.direction === "long"
      ? price <= tracker.invalidation
      : price >= tracker.invalidation;
  if (invalidated) {
    return {
      tracker: {
        ...nextTracker,
        status: "invalidated",
        resolvedAt: now,
        resolvedPrice: price,
      },
      event: "invalidated",
    };
  }

  return { tracker: nextTracker, event: null };
}

export function isElitePlanTracker(value: unknown): value is ElitePlanTracker {
  if (value == null || typeof value !== "object") return false;

  const tracker = value as Partial<ElitePlanTracker>;
  return (
    typeof tracker.id === "string" &&
    typeof tracker.ticker === "string" &&
    (tracker.direction === "long" || tracker.direction === "short") &&
    finitePrice(tracker.entryLow) &&
    finitePrice(tracker.entryHigh) &&
    finitePrice(tracker.invalidation) &&
    finitePrice(tracker.target) &&
    (tracker.status === "watching_entry" ||
      tracker.status === "tracking" ||
      tracker.status === "target_reached" ||
      tracker.status === "invalidated") &&
    typeof tracker.armedAt === "string" &&
    (tracker.enteredAt === null || typeof tracker.enteredAt === "string") &&
    (tracker.resolvedAt === null || typeof tracker.resolvedAt === "string") &&
    (tracker.resolvedPrice === null || finitePrice(tracker.resolvedPrice)) &&
    finitePrice(tracker.lastPrice)
  );
}