import {
  clamp,
  isFiniteNumber,
  round,
  scoreToDirection,
  weightedScore,
} from "../math";

import type {
  AMSABreadthInput,
  AMSABreadthResult,
} from "../types";

/* =========================================================
   AMSA MARKET BREADTH ENGINE

   Measures how broadly the market is participating.

   Higher score:
   - More advancing stocks
   - More advancing volume
   - More new highs
   - More stocks above key averages

   Lower score:
   - Narrow leadership
   - Heavy declining volume
   - Expanding new lows
========================================================= */

export function calculateMarketBreadth(
  input: AMSABreadthInput | null | undefined,
): AMSABreadthResult {
  if (!input) {
    return unavailableBreadth(
      "Market breadth inputs were not supplied.",
    );
  }

  const advanceDeclineRatio = ratio(
    input.advancingIssues,
    input.decliningIssues,
  );

  const upDownVolumeRatio = ratio(
    input.advancingVolume,
    input.decliningVolume,
  );

  const highLowRatio = ratio(
    input.newHighs,
    input.newLows,
  );

  const advanceDeclineScore =
    advanceDeclineRatio === null
      ? null
      : ratioToScore(advanceDeclineRatio, 1);

  const volumeBreadthScore =
    upDownVolumeRatio === null
      ? null
      : ratioToScore(upDownVolumeRatio, 1);

  const highLowScore =
    highLowRatio === null
      ? null
      : ratioToScore(highLowRatio, 1);

  const above20Score = normalizePercentage(
    input.percentAbove20Day,
  );

  const above50Score = normalizePercentage(
    input.percentAbove50Day,
  );

  const above200Score = normalizePercentage(
    input.percentAbove200Day,
  );

  const thrustScore = calculateThrustScore(
    input.upFourPercent,
    input.downFourPercent,
  );

  const score = weightedScore([
    {
      score: advanceDeclineScore,
      weight: 0.2,
    },
    {
      score: volumeBreadthScore,
      weight: 0.2,
    },
    {
      score: highLowScore,
      weight: 0.14,
    },
    {
      score: above20Score,
      weight: 0.14,
    },
    {
      score: above50Score,
      weight: 0.14,
    },
    {
      score: above200Score,
      weight: 0.1,
    },
    {
      score: thrustScore,
      weight: 0.08,
    },
  ]);

  const availableInputs = [
    advanceDeclineScore,
    volumeBreadthScore,
    highLowScore,
    above20Score,
    above50Score,
    above200Score,
    thrustScore,
  ].filter(isFiniteNumber).length;

  if (score === null) {
    return unavailableBreadth(
      "No valid market breadth measurements were available.",
    );
  }

  const confidence = clamp(
    (availableInputs / 7) * 100,
  );

  const reasons: string[] = [];

  if (advanceDeclineRatio !== null) {
    reasons.push(
      advanceDeclineRatio >= 1.5
        ? "Advancing issues significantly outnumber declining issues."
        : advanceDeclineRatio <= 0.67
          ? "Declining issues significantly outnumber advancing issues."
          : "Advancing and declining issues are relatively balanced.",
    );
  }

  if (upDownVolumeRatio !== null) {
    reasons.push(
      upDownVolumeRatio >= 1.5
        ? "Advancing volume shows strong market participation."
        : upDownVolumeRatio <= 0.67
          ? "Declining volume is controlling market participation."
          : "Up-volume and down-volume participation are mixed.",
    );
  }

  if (highLowRatio !== null) {
    reasons.push(
      highLowRatio >= 2
        ? "New market highs substantially exceed new lows."
        : highLowRatio <= 0.5
          ? "New market lows substantially exceed new highs."
          : "New highs and new lows are relatively balanced.",
    );
  }

  if (isFiniteNumber(input.percentAbove50Day)) {
    reasons.push(
      input.percentAbove50Day >= 65
        ? `${round(input.percentAbove50Day)}% of measured stocks are above their 50-day averages.`
        : input.percentAbove50Day <= 35
          ? `Only ${round(input.percentAbove50Day)}% of measured stocks are above their 50-day averages.`
          : `${round(input.percentAbove50Day)}% of measured stocks are above their 50-day averages.`,
    );
  }

  const warnings: string[] = [];

  if (availableInputs < 4) {
    warnings.push(
      "Breadth confidence is limited because fewer than four breadth measurements were available.",
    );
  }

  return {
    score: round(score),
    confidence: round(confidence),
    direction: scoreToDirection(score),
    status: availableInputs >= 5 ? "ready" : "partial",

    advanceDeclineRatio:
      advanceDeclineRatio === null
        ? null
        : round(advanceDeclineRatio),

    upDownVolumeRatio:
      upDownVolumeRatio === null
        ? null
        : round(upDownVolumeRatio),

    highLowRatio:
      highLowRatio === null
        ? null
        : round(highLowRatio),

    reasons,
    warnings,

    metrics: {
      advancingIssues:
        input.advancingIssues ?? null,

      decliningIssues:
        input.decliningIssues ?? null,

      advancingVolume:
        input.advancingVolume ?? null,

      decliningVolume:
        input.decliningVolume ?? null,

      newHighs:
        input.newHighs ?? null,

      newLows:
        input.newLows ?? null,

      percentAbove20Day:
        input.percentAbove20Day ?? null,

      percentAbove50Day:
        input.percentAbove50Day ?? null,

      percentAbove200Day:
        input.percentAbove200Day ?? null,

      thrustScore:
        thrustScore === null
          ? null
          : round(thrustScore),
    },
  };
}

function ratio(
  positive: number | null | undefined,
  negative: number | null | undefined,
): number | null {
  if (
    !isFiniteNumber(positive) ||
    !isFiniteNumber(negative)
  ) {
    return null;
  }

  if (negative === 0) {
    return positive > 0 ? 5 : null;
  }

  return positive / negative;
}

function ratioToScore(
  value: number,
  neutralRatio: number,
): number {
  if (value <= 0) {
    return 0;
  }

  const relative = value / neutralRatio;

  if (relative >= 1) {
    return clamp(
      50 + Math.log2(relative) * 28,
    );
  }

  return clamp(
    50 - Math.log2(1 / relative) * 28,
  );
}

function normalizePercentage(
  value: number | null | undefined,
): number | null {
  if (!isFiniteNumber(value)) {
    return null;
  }

  return clamp(value);
}

function calculateThrustScore(
  upFourPercent: number | null | undefined,
  downFourPercent: number | null | undefined,
): number | null {
  const thrustRatio = ratio(
    upFourPercent,
    downFourPercent,
  );

  if (thrustRatio === null) {
    return null;
  }

  return ratioToScore(thrustRatio, 1);
}

function unavailableBreadth(
  warning: string,
): AMSABreadthResult {
  return {
    score: null,
    confidence: 0,
    direction: "unavailable",
    status: "insufficient-data",

    advanceDeclineRatio: null,
    upDownVolumeRatio: null,
    highLowRatio: null,

    reasons: [],
    warnings: [warning],
    metrics: {},
  };
}
