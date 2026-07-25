import { MINIMUM_BARS } from "./config";
import {
  average,
  averageTrueRange,
  clamp,
  highest,
  lowest,
  round,
  sanitizeBars,
} from "./math";
import type {
  AMSAComponentResult,
  HistoricalBar,
} from "./types";

/* =========================================================
   High / Low Range State Engine
========================================================= */

export function calculateRangeState(
  inputBars: HistoricalBar[],
): AMSAComponentResult {
  const bars = sanitizeBars(inputBars);

  if (bars.length < MINIMUM_BARS.range) {
    return {
      component: "range",
      label: "Range Strength",
      score: null,
      status: "insufficient-data",
      direction: "unavailable",
      confidence: 0,
      reasons: [],
      warnings: [
        `At least ${MINIMUM_BARS.range} daily bars are required.`,
      ],
      metrics: {
        availableBars: bars.length,
      },
    };
  }

  const latest = bars.at(-1);

  if (!latest) {
    return {
      component: "range",
      label: "Range Strength",
      score: null,
      status: "invalid-data",
      direction: "unavailable",
      confidence: 0,
      reasons: [],
      warnings: ["Latest daily bar is unavailable."],
      metrics: {},
    };
  }

  const ranges = bars.map((bar) => Math.max(0, bar.high - bar.low));
  const averageRange5 = average(ranges.slice(-5));
  const averageRange10 = average(ranges.slice(-10));
  const averageRange20 = average(ranges.slice(-20));
  const averageRange50 = average(ranges.slice(-50));
  const averageRange100 = average(ranges.slice(-100));

  const currentRange = latest.high - latest.low;

  const closeLocation =
    currentRange <= 0
      ? 0.5
      : (latest.close - latest.low) / currentRange;

  const averageCloseLocation = calculateAverageCloseLocation(
    bars.slice(-20),
  );

  const atr14 = averageTrueRange(bars, 14);
  const rangeExpansion =
    averageRange20 && averageRange20 > 0
      ? currentRange / averageRange20
      : null;

  const closes = bars.map((bar) => bar.close);
  const high20 = highest(
    bars.map((bar) => bar.high),
    20,
  );
  const low20 = lowest(
    bars.map((bar) => bar.low),
    20,
  );

  const positionIn20DayRange =
    high20 !== null && low20 !== null && high20 !== low20
      ? (latest.close - low20) / (high20 - low20)
      : 0.5;

  const closesNearHigh = calculateCloseNearHighFrequency(
    bars.slice(-20),
  );

  const rangeControlScore = clamp(
    closeLocation * 50 +
      averageCloseLocation * 25 +
      positionIn20DayRange * 25,
  );

  const persistenceScore = clamp(closesNearHigh * 100);

  const expansionScore =
    rangeExpansion === null
      ? 50
      : calculateExpansionScore(
          rangeExpansion,
          closeLocation,
          latest.close >= latest.open,
        );

  const score = clamp(
    rangeControlScore * 0.5 +
      persistenceScore * 0.3 +
      expansionScore * 0.2,
  );

  const reasons = [
    closeLocation >= 0.8
      ? "Price finished near the top of today's range."
      : closeLocation <= 0.2
        ? "Price finished near the bottom of today's range."
        : "Price finished near the middle of today's range.",

    averageCloseLocation >= 0.65
      ? "Recent sessions have consistently closed in their upper ranges."
      : averageCloseLocation <= 0.35
        ? "Recent sessions have consistently closed in their lower ranges."
        : "Recent closing-range control is mixed.",

    positionIn20DayRange >= 0.8
      ? "Price is trading near the top of its 20-day high-low range."
      : positionIn20DayRange <= 0.2
        ? "Price is trading near the bottom of its 20-day high-low range."
        : "Price remains inside the middle of its 20-day range.",
  ];

  return {
    component: "range",
    label: "Range Strength",
    score: round(score),
    status: bars.length >= 20 ? "ready" : "partial",
    direction:
      score >= 80
        ? "strongly-rising"
        : score >= 60
          ? "rising"
          : score >= 42
            ? "stable"
            : score >= 25
              ? "falling"
              : "strongly-falling",
    confidence: round(
      clamp(70 + Math.min(bars.length / 100, 1) * 30),
    ),
    reasons,
    warnings: [],
    metrics: {
      currentRange: round(currentRange),
      averageRange5: roundNullable(averageRange5),
      averageRange10: roundNullable(averageRange10),
      averageRange20: roundNullable(averageRange20),
      averageRange50: roundNullable(averageRange50),
      averageRange100: roundNullable(averageRange100),
      closeLocation: round(closeLocation * 100),
      averageCloseLocation20: round(averageCloseLocation * 100),
      positionIn20DayRange: round(positionIn20DayRange * 100),
      closesNearHighFrequency20: round(closesNearHigh * 100),
      rangeExpansion: roundNullable(rangeExpansion),
      atr14: roundNullable(atr14),
      currentClose: round(closes.at(-1) ?? latest.close),
    },
  };
}

function calculateAverageCloseLocation(
  bars: HistoricalBar[],
): number {
  const locations = bars.map((bar) => {
    const range = bar.high - bar.low;

    if (range <= 0) {
      return 0.5;
    }

    return clamp(
      ((bar.close - bar.low) / range) * 100,
      0,
      100,
    ) / 100;
  });

  return average(locations) ?? 0.5;
}

function calculateCloseNearHighFrequency(
  bars: HistoricalBar[],
): number {
  if (!bars.length) {
    return 0.5;
  }

  const qualifyingBars = bars.filter((bar) => {
    const range = bar.high - bar.low;

    if (range <= 0) {
      return false;
    }

    const location = (bar.close - bar.low) / range;

    return location >= 0.7;
  }).length;

  return qualifyingBars / bars.length;
}

function calculateExpansionScore(
  expansionRatio: number,
  closeLocation: number,
  positiveSession: boolean,
): number {
  if (expansionRatio < 0.6) {
    return 40;
  }

  if (expansionRatio <= 1.25) {
    return 50 + (expansionRatio - 0.6) * 40;
  }

  if (positiveSession && closeLocation >= 0.65) {
    return clamp(75 + (expansionRatio - 1.25) * 12);
  }

  if (!positiveSession && closeLocation <= 0.35) {
    return clamp(35 - (expansionRatio - 1.25) * 12);
  }

  return 55;
}

function roundNullable(
  value: number | null | undefined,
): number | null {
  return value === null || value === undefined
    ? null
    : round(value);
}
