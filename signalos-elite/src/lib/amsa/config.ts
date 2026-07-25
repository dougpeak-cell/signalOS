import type { AMSAComponentName } from "./types";

/* =========================================================
   AMSA configuration
========================================================= */

export const AMSA_PERIODS = [5, 10, 20, 30, 50, 100] as const;

export type AMSAPeriod = (typeof AMSA_PERIODS)[number];

/**
 * Longer moving averages receive greater structural weight,
 * while shorter averages make the engine responsive.
 */
export const MOVING_AVERAGE_PERIOD_WEIGHTS: Record<AMSAPeriod, number> = {
  5: 0.08,
  10: 0.12,
  20: 0.18,
  30: 0.18,
  50: 0.22,
  100: 0.22,
};

/**
 * Phase 1 default component weights.
 *
 * Risk uses a "risk control" score where a higher score means
 * lower or better-controlled risk.
 */
export const DEFAULT_AMSA_WEIGHTS: Record<AMSAComponentName, number> = {
  movingAverage: 0.28,
  trend: 0.22,
  volume: 0.2,
  range: 0.14,
  risk: 0.1,
  industry: 0,
  alignment: 0,
  portfolio: 0,
  sector: 0.035,
  market: 0.035,
};

export const MINIMUM_BARS = {
  movingAverage: 20,
  trend: 20,
  volume: 20,
  range: 14,
  risk: 20,
  completeReading: 100,
} as const;
