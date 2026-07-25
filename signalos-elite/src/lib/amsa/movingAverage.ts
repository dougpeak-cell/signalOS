import {
  AMSA_PERIODS,
  MINIMUM_BARS,
  MOVING_AVERAGE_PERIOD_WEIGHTS,
  type AMSAPeriod,
} from "./config";
import {
  clamp,
  normalizedSlope,
  percentChange,
  round,
  sanitizeBars,
  simpleMovingAverage,
  weightedScore,
} from "./math";
import type {
  AMSAComponentResult,
  HistoricalBar,
} from "./types";

/* =========================================================
   Moving Average State Engine
========================================================= */

type PeriodAnalysis = {
  period: AMSAPeriod;
  average: number | null;
  distancePercent: number | null;
  slopePercent: number | null;
  score: number | null;
};

export function calculateMovingAverageState(
  inputBars: HistoricalBar[],
): AMSAComponentResult {
  const bars = sanitizeBars(inputBars);

  if (bars.length < MINIMUM_BARS.movingAverage) {
    return {
      component: "movingAverage",
      label: "Moving Average Structure",
      score: null,
      status: "insufficient-data",
      direction: "unavailable",
      confidence: 0,
      reasons: [],
      warnings: [
        `At least ${MINIMUM_BARS.movingAverage} daily bars are required.`,
      ],
      metrics: {
        availableBars: bars.length,
      },
    };
  }

  const closes = bars.map((bar) => bar.close);
  const currentPrice = closes.at(-1) ?? null;

  if (currentPrice === null) {
    return {
      component: "movingAverage",
      label: "Moving Average Structure",
      score: null,
      status: "invalid-data",
      direction: "unavailable",
      confidence: 0,
      reasons: [],
      warnings: ["Current closing price is unavailable."],
      metrics: {},
    };
  }

  const analyses: PeriodAnalysis[] = AMSA_PERIODS.map((period) => {
    const movingAverage = simpleMovingAverage(closes, period);
    const previousAverage = simpleMovingAverage(
      closes,
      period,
      Math.min(5, Math.max(1, Math.floor(period / 5))),
    );

    const distancePercent =
      movingAverage === null
        ? null
        : percentChange(currentPrice, movingAverage);

    const slopeWindow = closes.slice(
      -Math.min(period, closes.length),
    );

    const regressionSlope = normalizedSlope(slopeWindow);

    const averageSlope =
      movingAverage !== null && previousAverage !== null
        ? percentChange(movingAverage, previousAverage)
        : regressionSlope;

    const score =
      movingAverage === null || distancePercent === null
        ? null
        : calculatePeriodScore(distancePercent, averageSlope);

    return {
      period,
      average: movingAverage,
      distancePercent,
      slopePercent: averageSlope,
      score,
    };
  });

  const score = weightedScore(
    analyses.map((analysis) => ({
      score: analysis.score,
      weight: MOVING_AVERAGE_PERIOD_WEIGHTS[analysis.period],
    })),
  );

  const alignmentScore = calculateAlignmentScore(analyses);
  const finalScore =
    score === null
      ? null
      : clamp(score * 0.8 + alignmentScore * 0.2);

  const validPeriods = analyses.filter(
    (analysis) => analysis.score !== null,
  ).length;

  const confidence = clamp(
    (validPeriods / AMSA_PERIODS.length) * 85 +
      Math.min(bars.length / 100, 1) * 15,
  );

  const reasons = buildReasons(analyses, alignmentScore);

  return {
    component: "movingAverage",
    label: "Moving Average Structure",
    score: finalScore === null ? null : round(finalScore),
    status:
      validPeriods === AMSA_PERIODS.length ? "ready" : "partial",
    direction:
      finalScore === null
        ? "unavailable"
        : finalScore >= 80
          ? "strongly-rising"
          : finalScore >= 60
            ? "rising"
            : finalScore >= 42
              ? "stable"
              : finalScore >= 25
                ? "falling"
                : "strongly-falling",
    confidence: round(confidence),
    reasons,
    warnings:
      bars.length < 100
        ? [
            "The 100-day moving-average reading is unavailable or less mature.",
          ]
        : [],
    metrics: {
      currentPrice: round(currentPrice),
      alignmentScore: round(alignmentScore),
      ma5: roundNullable(findAnalysis(analyses, 5)?.average),
      ma10: roundNullable(findAnalysis(analyses, 10)?.average),
      ma20: roundNullable(findAnalysis(analyses, 20)?.average),
      ma30: roundNullable(findAnalysis(analyses, 30)?.average),
      ma50: roundNullable(findAnalysis(analyses, 50)?.average),
      ma100: roundNullable(findAnalysis(analyses, 100)?.average),
      distance5: roundNullable(
        findAnalysis(analyses, 5)?.distancePercent,
      ),
      distance10: roundNullable(
        findAnalysis(analyses, 10)?.distancePercent,
      ),
      distance20: roundNullable(
        findAnalysis(analyses, 20)?.distancePercent,
      ),
      distance30: roundNullable(
        findAnalysis(analyses, 30)?.distancePercent,
      ),
      distance50: roundNullable(
        findAnalysis(analyses, 50)?.distancePercent,
      ),
      distance100: roundNullable(
        findAnalysis(analyses, 100)?.distancePercent,
      ),
      slope20: roundNullable(
        findAnalysis(analyses, 20)?.slopePercent,
      ),
      slope50: roundNullable(
        findAnalysis(analyses, 50)?.slopePercent,
      ),
      slope100: roundNullable(
        findAnalysis(analyses, 100)?.slopePercent,
      ),
    },
  };
}

function calculatePeriodScore(
  distancePercent: number,
  slopePercent: number | null,
): number {
  /*
   * Price-position score:
   * - Price modestly above the average is constructive.
   * - Extreme distance is penalized as potentially extended.
   */
  let positionScore: number;

  if (distancePercent >= 0 && distancePercent <= 8) {
    positionScore = 65 + distancePercent * 4;
  } else if (distancePercent > 8 && distancePercent <= 15) {
    positionScore = 97 - (distancePercent - 8) * 3;
  } else if (distancePercent > 15) {
    positionScore = Math.max(45, 76 - (distancePercent - 15) * 2);
  } else if (distancePercent >= -5) {
    positionScore = 50 + distancePercent * 6;
  } else {
    positionScore = Math.max(5, 20 + distancePercent * 2);
  }

  const normalizedSlopeScore =
    slopePercent === null
      ? 50
      : clamp(50 + slopePercent * 40);

  return clamp(positionScore * 0.65 + normalizedSlopeScore * 0.35);
}

function calculateAlignmentScore(
  analyses: PeriodAnalysis[],
): number {
  const available = analyses.filter(
    (analysis) => analysis.average !== null,
  );

  if (available.length < 2) {
    return 50;
  }

  let correctRelationships = 0;
  let totalRelationships = 0;

  for (let index = 0; index < available.length - 1; index += 1) {
    const shorter = available[index];
    const longer = available[index + 1];

    if (shorter.average === null || longer.average === null) {
      continue;
    }

    totalRelationships += 1;

    if (shorter.average >= longer.average) {
      correctRelationships += 1;
    }
  }

  if (!totalRelationships) {
    return 50;
  }

  return (correctRelationships / totalRelationships) * 100;
}

function buildReasons(
  analyses: PeriodAnalysis[],
  alignmentScore: number,
): string[] {
  const reasons: string[] = [];

  const ma20 = findAnalysis(analyses, 20);
  const ma50 = findAnalysis(analyses, 50);
  const ma100 = findAnalysis(analyses, 100);

  if (
    ma20?.distancePercent !== null &&
    ma20?.distancePercent !== undefined
  ) {
    reasons.push(
      ma20.distancePercent >= 0
        ? `Price is ${round(ma20.distancePercent)}% above its 20-day average.`
        : `Price is ${Math.abs(round(ma20.distancePercent))}% below its 20-day average.`,
    );
  }

  if (
    ma50?.slopePercent !== null &&
    ma50?.slopePercent !== undefined
  ) {
    reasons.push(
      ma50.slopePercent > 0
        ? "The 50-day trend is rising."
        : ma50.slopePercent < 0
          ? "The 50-day trend is falling."
          : "The 50-day trend is flat.",
    );
  }

  if (
    ma100?.distancePercent !== null &&
    ma100?.distancePercent !== undefined
  ) {
    reasons.push(
      ma100.distancePercent >= 0
        ? "Price remains above its long-term 100-day structure."
        : "Price remains below its long-term 100-day structure.",
    );
  }

  reasons.push(
    alignmentScore >= 80
      ? "Short, intermediate, and long-term moving averages are strongly aligned."
      : alignmentScore >= 60
        ? "Moving-average alignment is constructive but incomplete."
        : "Moving-average alignment is mixed or bearish.",
  );

  return reasons;
}

function findAnalysis(
  analyses: PeriodAnalysis[],
  period: AMSAPeriod,
): PeriodAnalysis | undefined {
  return analyses.find((analysis) => analysis.period === period);
}

function roundNullable(
  value: number | null | undefined,
): number | null {
  return value === null || value === undefined
    ? null
    : round(value);
}
