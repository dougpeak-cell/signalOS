import {
  clamp,
  isFiniteNumber,
  percentChange,
  round,
  sanitizeBars,
  scoreToDirection,
  scoreToState,
  weightedScore,
} from "../math";

import { calculateStockPulse } from "../engine";

import type {
  AMSADirection,
  AMSALeadershipState,
  AMSASectorInput,
  AMSASectorPulse,
  HistoricalBar,
} from "../types";

/* =========================================================
   AMSA SECTOR PULSE ENGINE

   Evaluates:
   - Sector ETF technical structure
   - Relative strength versus benchmark
   - Alignment with Market Pulse
   - Pulse velocity
========================================================= */

export function calculateSectorPulse(
  input: AMSASectorInput,
): AMSASectorPulse {
  const bars = sanitizeBars(input.bars);

  const benchmarkBars = sanitizeBars(
    input.benchmarkBars ?? [],
  );

  const technicalPulse =
    bars.length >= 20
      ? calculateStockPulse(bars, {
          symbol: input.symbol,
          weights: {
            sector: 0,
            market: 0,
          },
        })
      : null;

  const relativeStrengthScore =
    calculateRelativeStrengthScore(
      bars,
      benchmarkBars,
    );

  const marketAlignmentScore =
    calculateMarketAlignmentScore(
      technicalPulse?.score ?? null,
      input.marketPulse,
    );

  const score = weightedScore([
    {
      score:
        technicalPulse?.score ?? null,
      weight: 0.58,
    },
    {
      score: relativeStrengthScore,
      weight: 0.27,
    },
    {
      score: marketAlignmentScore,
      weight: 0.15,
    },
  ]);

  const previousScore =
    isFiniteNumber(input.previousPulse)
      ? clamp(input.previousPulse)
      : null;

  const change =
    score !== null &&
    previousScore !== null
      ? score - previousScore
      : null;

  const availableCount = [
    technicalPulse?.score ?? null,
    relativeStrengthScore,
    marketAlignmentScore,
  ].filter(isFiniteNumber).length;

  const technicalConfidence =
    technicalPulse?.confidence ?? 0;

  const confidence = clamp(
    technicalConfidence * 0.6 +
      (relativeStrengthScore !== null
        ? 25
        : 0) +
      (marketAlignmentScore !== null
        ? 15
        : 0),
  );

  const leadership =
    determineLeadership(
      score,
      change,
      relativeStrengthScore,
    );

  const direction =
    change !== null
      ? velocityToDirection(change)
      : scoreToDirection(score);

  const reasons: string[] = [];

  if (
    technicalPulse &&
    technicalPulse.score !== null
  ) {
    reasons.push(
      `${input.sector} technical structure has a Pulse of ${technicalPulse.score}.`,
    );
  }

  if (relativeStrengthScore !== null) {
    reasons.push(
      relativeStrengthScore >= 65
        ? `${input.sector} is outperforming the broader benchmark.`
        : relativeStrengthScore <= 40
          ? `${input.sector} is underperforming the broader benchmark.`
          : `${input.sector} performance is near the broader benchmark.`,
    );
  }

  if (marketAlignmentScore !== null) {
    reasons.push(
      marketAlignmentScore >= 70
        ? "Sector conditions are aligned with the broader Market Pulse."
        : marketAlignmentScore <= 40
          ? "Sector conditions conflict with the broader Market Pulse."
          : "Sector and market conditions are only partially aligned.",
    );
  }

  if (change !== null) {
    reasons.push(
      change >= 3
        ? `Sector Pulse improved by ${round(change)} points.`
        : change <= -3
          ? `Sector Pulse weakened by ${round(
              Math.abs(change),
            )} points.`
          : "Sector Pulse is relatively stable.",
    );
  }

  const warnings = [
    ...(technicalPulse?.warnings ?? []),
  ];

  if (!benchmarkBars.length) {
    warnings.push(
      "Relative strength is unavailable because benchmark history was not supplied.",
    );
  }

  return {
    sector: input.sector,
    symbol: input.symbol,

    score:
      score === null
        ? null
        : round(score),

    previousScore,

    change:
      change === null
        ? null
        : round(change),

    state: scoreToState(score),
    direction,
    leadership,

    confidence: round(confidence),

    status:
      availableCount === 3
        ? "ready"
        : availableCount >= 1
          ? "partial"
          : "insufficient-data",

    relativeStrengthScore:
      relativeStrengthScore === null
        ? null
        : round(relativeStrengthScore),

    stockPulseScore:
      technicalPulse?.score ?? null,

    marketAlignmentScore:
      marketAlignmentScore === null
        ? null
        : round(marketAlignmentScore),

    rank: null,
    previousRank:
      input.previousRank ?? null,
    rankChange: null,

    components:
      technicalPulse?.components ?? [],

    reasons,
    warnings,

    calculatedAt: new Date().toISOString(),
  };
}

export function rankSectorPulses(
  sectors: AMSASectorPulse[],
): AMSASectorPulse[] {
  const ranked = [...sectors].sort(
    (first, second) =>
      Number(second.score ?? -1) -
      Number(first.score ?? -1),
  );

  return ranked.map(
    (sector, index) => {
      const rank =
        sector.score === null
          ? null
          : index + 1;

      const rankChange =
        rank !== null &&
        sector.previousRank !== null
          ? sector.previousRank - rank
          : null;

      return {
        ...sector,
        rank,
        rankChange,
      };
    },
  );
}

function calculateRelativeStrengthScore(
  sectorBars: HistoricalBar[],
  benchmarkBars: HistoricalBar[],
): number | null {
  if (
    sectorBars.length < 20 ||
    benchmarkBars.length < 20
  ) {
    return null;
  }

  const periods = [
    {
      period: 5,
      weight: 0.14,
    },
    {
      period: 10,
      weight: 0.18,
    },
    {
      period: 20,
      weight: 0.28,
    },
    {
      period: 50,
      weight: 0.25,
    },
    {
      period: 100,
      weight: 0.15,
    },
  ];

  return weightedScore(
    periods.map(({ period, weight }) => {
      const sectorReturn =
        periodReturn(
          sectorBars,
          period,
        );

      const benchmarkReturn =
        periodReturn(
          benchmarkBars,
          period,
        );

      if (
        sectorReturn === null ||
        benchmarkReturn === null
      ) {
        return {
          score: null,
          weight,
        };
      }

      const excessReturn =
        sectorReturn -
        benchmarkReturn;

      return {
        score: clamp(
          50 +
            excessReturn * 4.5,
        ),
        weight,
      };
    }),
  );
}

function calculateMarketAlignmentScore(
  sectorPulse: number | null,
  marketPulse: number | null | undefined,
): number | null {
  if (
    !isFiniteNumber(sectorPulse) ||
    !isFiniteNumber(marketPulse)
  ) {
    return null;
  }

  const dispersion =
    Math.abs(
      sectorPulse -
        marketPulse,
    );

  const directionBonus =
    sectorPulse >= 50 &&
    marketPulse >= 50
      ? 18
      : sectorPulse < 50 &&
          marketPulse < 50
        ? 10
        : -12;

  return clamp(
    100 -
      dispersion * 1.6 +
      directionBonus,
  );
}

function periodReturn(
  bars: HistoricalBar[],
  period: number,
): number | null {
  if (bars.length <= period) {
    return null;
  }

  const current =
    bars.at(-1)?.close;

  const previous =
    bars.at(-(period + 1))?.close;

  if (
    !isFiniteNumber(current) ||
    !isFiniteNumber(previous)
  ) {
    return null;
  }

  return percentChange(
    current,
    previous,
  );
}

function determineLeadership(
  score: number | null,
  change: number | null,
  relativeStrength: number | null,
): AMSALeadershipState {
  if (!isFiniteNumber(score)) {
    return "Unavailable";
  }

  if (
    score >= 78 &&
    Number(relativeStrength ?? 50) >= 62
  ) {
    return "Leading";
  }

  if (
    score >= 60 &&
    Number(change ?? 0) >= 2
  ) {
    return "Improving";
  }

  if (
    score <= 32 &&
    Number(relativeStrength ?? 50) <= 40
  ) {
    return "Lagging";
  }

  if (
    score < 50 &&
    Number(change ?? 0) <= -2
  ) {
    return "Weakening";
  }

  return "Neutral";
}

function velocityToDirection(
  change: number,
): AMSADirection {
  if (change >= 7) {
    return "strongly-rising";
  }

  if (change >= 2) {
    return "rising";
  }

  if (change <= -7) {
    return "strongly-falling";
  }

  if (change <= -2) {
    return "falling";
  }

  return "stable";
}
