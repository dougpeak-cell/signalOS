import { MINIMUM_BARS } from "./config";
import {
  clamp,
  normalizedSlope,
  percentChange,
  round,
  sanitizeBars,
  weightedScore,
} from "./math";
import type {
  AMSAComponentResult,
  HistoricalBar,
} from "./types";

/* =========================================================
   Trend Persistence Engine
========================================================= */

export function calculateTrendState(
  inputBars: HistoricalBar[],
): AMSAComponentResult {
  const bars = sanitizeBars(inputBars);

  if (bars.length < MINIMUM_BARS.trend) {
    return {
      component: "trend",
      label: "Trend Persistence",
      score: null,
      status: "insufficient-data",
      direction: "unavailable",
      confidence: 0,
      reasons: [],
      warnings: [
        `At least ${MINIMUM_BARS.trend} daily bars are required.`,
      ],
      metrics: {
        availableBars: bars.length,
      },
    };
  }

  const closes = bars.map((bar) => bar.close);
  const latestClose = closes.at(-1);

  if (latestClose === undefined) {
    return {
      component: "trend",
      label: "Trend Persistence",
      score: null,
      status: "invalid-data",
      direction: "unavailable",
      confidence: 0,
      reasons: [],
      warnings: ["Latest closing price is unavailable."],
      metrics: {},
    };
  }

  const return5 = calculateReturn(closes, 5);
  const return10 = calculateReturn(closes, 10);
  const return20 = calculateReturn(closes, 20);
  const return50 = calculateReturn(closes, 50);
  const return100 = calculateReturn(closes, 100);

  const returnScore = weightedScore([
    { score: returnToScore(return5, 5), weight: 0.12 },
    { score: returnToScore(return10, 10), weight: 0.16 },
    { score: returnToScore(return20, 20), weight: 0.24 },
    { score: returnToScore(return50, 50), weight: 0.25 },
    { score: returnToScore(return100, 100), weight: 0.23 },
  ]);

  const slope20 = normalizedSlope(closes.slice(-20));
  const slope50 = normalizedSlope(closes.slice(-50));
  const slope100 =
    closes.length >= 100
      ? normalizedSlope(closes.slice(-100))
      : null;

  const slopeScore = weightedScore([
    { score: slopeToScore(slope20), weight: 0.4 },
    { score: slopeToScore(slope50), weight: 0.38 },
    { score: slopeToScore(slope100), weight: 0.22 },
  ]);

  const persistence = calculatePersistence(bars, 20);
  const structure = calculateHigherHighLowerLowStructure(bars, 20);

  const score = weightedScore([
    { score: returnScore, weight: 0.35 },
    { score: slopeScore, weight: 0.3 },
    { score: persistence, weight: 0.2 },
    { score: structure, weight: 0.15 },
  ]);

  const confidence = clamp(
    65 + Math.min(bars.length / 100, 1) * 35,
  );

  const reasons = [
    formatReturnReason("5-day", return5),
    formatReturnReason("20-day", return20),
    formatReturnReason("50-day", return50),
    persistence >= 65
      ? "Advancing sessions are persistent across the recent trend."
      : persistence <= 40
        ? "Declining sessions dominate the recent trend."
        : "Recent trend persistence is mixed.",
    structure >= 65
      ? "Recent highs and lows show constructive structure."
      : structure <= 40
        ? "Recent highs and lows show deteriorating structure."
        : "Recent high-low structure is mixed.",
  ].filter(Boolean) as string[];

  return {
    component: "trend",
    label: "Trend Persistence",
    score: score === null ? null : round(score),
    status: bars.length >= 100 ? "ready" : "partial",
    direction:
      score === null
        ? "unavailable"
        : score >= 80
          ? "strongly-rising"
          : score >= 60
            ? "rising"
            : score >= 42
              ? "stable"
              : score >= 25
                ? "falling"
                : "strongly-falling",
    confidence: round(confidence),
    reasons,
    warnings:
      bars.length < 100
        ? ["Long-term trend history is incomplete."]
        : [],
    metrics: {
      currentPrice: round(latestClose),
      return5: roundNullable(return5),
      return10: roundNullable(return10),
      return20: roundNullable(return20),
      return50: roundNullable(return50),
      return100: roundNullable(return100),
      slope20: roundNullable(slope20),
      slope50: roundNullable(slope50),
      slope100: roundNullable(slope100),
      persistence20: round(persistence),
      structure20: round(structure),
    },
  };
}

function calculateReturn(
  closes: number[],
  period: number,
): number | null {
  if (closes.length <= period) {
    return null;
  }

  const current = closes.at(-1);
  const previous = closes.at(-(period + 1));

  if (current === undefined || previous === undefined) {
    return null;
  }

  return percentChange(current, previous);
}

function returnToScore(
  value: number | null,
  period: number,
): number | null {
  if (value === null) {
    return null;
  }

  /*
   * Normalize expected movement by the square root of time,
   * preventing long-term returns from dominating automatically.
   */
  const scaling = Math.sqrt(period);
  const normalizedReturn = value / scaling;

  return clamp(50 + normalizedReturn * 9);
}

function slopeToScore(value: number | null): number | null {
  if (value === null) {
    return null;
  }

  return clamp(50 + value * 55);
}

function calculatePersistence(
  bars: HistoricalBar[],
  period: number,
): number {
  const window = bars.slice(-period);

  if (window.length < 2) {
    return 50;
  }

  let positive = 0;
  let negative = 0;

  for (let index = 1; index < window.length; index += 1) {
    if (window[index].close > window[index - 1].close) {
      positive += 1;
    } else if (window[index].close < window[index - 1].close) {
      negative += 1;
    }
  }

  const total = positive + negative;

  if (!total) {
    return 50;
  }

  return clamp((positive / total) * 100);
}

function calculateHigherHighLowerLowStructure(
  bars: HistoricalBar[],
  period: number,
): number {
  const window = bars.slice(-period);

  if (window.length < 3) {
    return 50;
  }

  let bullishPoints = 0;
  let bearishPoints = 0;

  for (let index = 1; index < window.length; index += 1) {
    const current = window[index];
    const previous = window[index - 1];

    if (current.high > previous.high) bullishPoints += 1;
    if (current.low > previous.low) bullishPoints += 1;

    if (current.high < previous.high) bearishPoints += 1;
    if (current.low < previous.low) bearishPoints += 1;
  }

  const total = bullishPoints + bearishPoints;

  if (!total) {
    return 50;
  }

  return clamp((bullishPoints / total) * 100);
}

function formatReturnReason(
  label: string,
  value: number | null,
): string | null {
  if (value === null) {
    return null;
  }

  return value >= 0
    ? `${label} price performance is +${round(value)}%.`
    : `${label} price performance is ${round(value)}%.`;
}

function roundNullable(
  value: number | null | undefined,
): number | null {
  return value === null || value === undefined
    ? null
    : round(value);
}
