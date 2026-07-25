import {
  AMSA_PERIODS,
  MINIMUM_BARS,
  type AMSAPeriod,
} from "./config";
import {
  average,
  clamp,
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
   Volume State Engine
========================================================= */

type VolumePeriodAnalysis = {
  period: AMSAPeriod;
  averageVolume: number | null;
  relativeVolume: number | null;
  score: number | null;
};

export function calculateVolumeState(
  inputBars: HistoricalBar[],
): AMSAComponentResult {
  const bars = sanitizeBars(inputBars);

  if (bars.length < MINIMUM_BARS.volume) {
    return {
      component: "volume",
      label: "Volume Participation",
      score: null,
      status: "insufficient-data",
      direction: "unavailable",
      confidence: 0,
      reasons: [],
      warnings: [
        `At least ${MINIMUM_BARS.volume} daily bars are required.`,
      ],
      metrics: {
        availableBars: bars.length,
      },
    };
  }

  const latest = bars.at(-1);

  if (!latest) {
    return {
      component: "volume",
      label: "Volume Participation",
      score: null,
      status: "invalid-data",
      direction: "unavailable",
      confidence: 0,
      reasons: [],
      warnings: ["Latest daily bar is unavailable."],
      metrics: {},
    };
  }

  const volumes = bars.map((bar) => bar.volume);
  const closes = bars.map((bar) => bar.close);

  const analyses: VolumePeriodAnalysis[] = AMSA_PERIODS.map(
    (period) => {
      /*
       * Exclude the current session from the comparison average.
       */
      const historicalVolumes = volumes.slice(0, -1);
      const averageVolume = simpleMovingAverage(
        historicalVolumes,
        period,
      );

      const relativeVolume =
        averageVolume && averageVolume > 0
          ? latest.volume / averageVolume
          : null;

      return {
        period,
        averageVolume,
        relativeVolume,
        score:
          relativeVolume === null
            ? null
            : relativeVolumeToScore(relativeVolume),
      };
    },
  );

  const currentPriceChange =
    closes.length >= 2
      ? percentChange(closes.at(-1) ?? 0, closes.at(-2) ?? 0)
      : null;

  const closeLocation =
    latest.high === latest.low
      ? 0.5
      : (latest.close - latest.low) / (latest.high - latest.low);

  const directionalConfirmation = calculateDirectionalConfirmation(
    currentPriceChange,
    closeLocation,
  );

  const baseScore = weightedScore(
    analyses.map((analysis) => ({
      score: analysis.score,
      weight: periodWeight(analysis.period),
    })),
  );

  const accumulationScore = calculateAccumulationScore(bars, 20);

  const finalScore =
    baseScore === null
      ? null
      : clamp(
          baseScore * 0.58 +
            directionalConfirmation * 0.22 +
            accumulationScore * 0.2,
        );

  const validPeriods = analyses.filter(
    (analysis) => analysis.score !== null,
  ).length;

  const confidence = clamp(
    (validPeriods / AMSA_PERIODS.length) * 80 +
      Math.min(bars.length / 100, 1) * 20,
  );

  const rvol20 = findAnalysis(analyses, 20)?.relativeVolume;
  const rvol50 = findAnalysis(analyses, 50)?.relativeVolume;

  const reasons: string[] = [];

  if (rvol20 !== null && rvol20 !== undefined) {
    reasons.push(
      `Current volume is ${round(rvol20 * 100, 0)}% of the 20-day average.`,
    );
  }

  if (rvol50 !== null && rvol50 !== undefined) {
    reasons.push(
      `Current volume is ${round(rvol50 * 100, 0)}% of the 50-day average.`,
    );
  }

  reasons.push(
    accumulationScore >= 65
      ? "Recent volume has generally supported advancing sessions."
      : accumulationScore <= 40
        ? "Recent volume has generally favored declining sessions."
        : "Recent price and volume participation are mixed.",
  );

  reasons.push(
    directionalConfirmation >= 65
      ? "Today's price action confirms the volume reading."
      : directionalConfirmation <= 40
        ? "Today's price action conflicts with the volume reading."
        : "Today's price action provides limited volume confirmation.",
  );

  return {
    component: "volume",
    label: "Volume Participation",
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
        ? ["Long-term volume history is incomplete."]
        : [],
    metrics: {
      currentVolume: round(latest.volume, 0),
      currentPriceChange: roundNullable(currentPriceChange),
      closeLocation: round(closeLocation * 100),
      directionalConfirmation: round(directionalConfirmation),
      accumulationScore: round(accumulationScore),
      averageVolume5: roundNullable(
        findAnalysis(analyses, 5)?.averageVolume,
        0,
      ),
      averageVolume10: roundNullable(
        findAnalysis(analyses, 10)?.averageVolume,
        0,
      ),
      averageVolume20: roundNullable(
        findAnalysis(analyses, 20)?.averageVolume,
        0,
      ),
      averageVolume30: roundNullable(
        findAnalysis(analyses, 30)?.averageVolume,
        0,
      ),
      averageVolume50: roundNullable(
        findAnalysis(analyses, 50)?.averageVolume,
        0,
      ),
      averageVolume100: roundNullable(
        findAnalysis(analyses, 100)?.averageVolume,
        0,
      ),
      relativeVolume5: roundNullable(
        findAnalysis(analyses, 5)?.relativeVolume,
      ),
      relativeVolume10: roundNullable(
        findAnalysis(analyses, 10)?.relativeVolume,
      ),
      relativeVolume20: roundNullable(
        findAnalysis(analyses, 20)?.relativeVolume,
      ),
      relativeVolume30: roundNullable(
        findAnalysis(analyses, 30)?.relativeVolume,
      ),
      relativeVolume50: roundNullable(
        findAnalysis(analyses, 50)?.relativeVolume,
      ),
      relativeVolume100: roundNullable(
        findAnalysis(analyses, 100)?.relativeVolume,
      ),
    },
  };
}

function relativeVolumeToScore(relativeVolume: number): number {
  if (relativeVolume <= 0) return 0;

  if (relativeVolume < 0.5) {
    return relativeVolume * 50;
  }

  if (relativeVolume < 1) {
    return 25 + (relativeVolume - 0.5) * 50;
  }

  if (relativeVolume <= 2) {
    return 50 + (relativeVolume - 1) * 42;
  }

  /*
   * Extremely high volume may represent opportunity or exhaustion.
   * Cap the raw participation benefit rather than automatically
   * treating unlimited volume as increasingly bullish.
   */
  return Math.max(72, 92 - (relativeVolume - 2) * 4);
}

function calculateDirectionalConfirmation(
  priceChange: number | null,
  closeLocation: number,
): number {
  if (priceChange === null) {
    return 50;
  }

  const locationScore = clamp(closeLocation * 100);

  if (priceChange > 0) {
    return clamp(45 + priceChange * 6 + (locationScore - 50) * 0.35);
  }

  if (priceChange < 0) {
    return clamp(55 + priceChange * 6 + (locationScore - 50) * 0.35);
  }

  return clamp(45 + locationScore * 0.1);
}

function calculateAccumulationScore(
  bars: HistoricalBar[],
  period: number,
): number {
  const window = bars.slice(-Math.min(period, bars.length));

  if (window.length < 2) {
    return 50;
  }

  const upVolumes: number[] = [];
  const downVolumes: number[] = [];

  for (let index = 1; index < window.length; index += 1) {
    const current = window[index];
    const previous = window[index - 1];

    if (current.close >= previous.close) {
      upVolumes.push(current.volume);
    } else {
      downVolumes.push(current.volume);
    }
  }

  const averageUpVolume = average(upVolumes) ?? 0;
  const averageDownVolume = average(downVolumes) ?? 0;
  const total = averageUpVolume + averageDownVolume;

  if (total <= 0) {
    return 50;
  }

  return clamp((averageUpVolume / total) * 100);
}

function periodWeight(period: AMSAPeriod): number {
  const weights: Record<AMSAPeriod, number> = {
    5: 0.1,
    10: 0.14,
    20: 0.2,
    30: 0.2,
    50: 0.2,
    100: 0.16,
  };

  return weights[period];
}

function findAnalysis(
  analyses: VolumePeriodAnalysis[],
  period: AMSAPeriod,
): VolumePeriodAnalysis | undefined {
  return analyses.find((analysis) => analysis.period === period);
}

function roundNullable(
  value: number | null | undefined,
  digits = 2,
): number | null {
  return value === null || value === undefined
    ? null
    : round(value, digits);
}
