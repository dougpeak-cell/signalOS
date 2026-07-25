import { MINIMUM_BARS } from "./config";
import {
  averageTrueRange,
  clamp,
  highest,
  percentChange,
  round,
  sanitizeBars,
  standardDeviation,
} from "./math";
import type {
  AMSAComponentResult,
  HistoricalBar,
} from "./types";

/* =========================================================
   Risk Control Engine

   Important:
   The component score is a Risk Control score.
   Higher = better-controlled risk.
   Lower = greater risk.
========================================================= */

export function calculateRiskState(
  inputBars: HistoricalBar[],
): AMSAComponentResult {
  const bars = sanitizeBars(inputBars);

  if (bars.length < MINIMUM_BARS.risk) {
    return {
      component: "risk",
      label: "Risk Control",
      score: null,
      status: "insufficient-data",
      direction: "unavailable",
      confidence: 0,
      reasons: [],
      warnings: [
        `At least ${MINIMUM_BARS.risk} daily bars are required.`,
      ],
      metrics: {
        availableBars: bars.length,
      },
    };
  }

  const latest = bars.at(-1);

  if (!latest) {
    return {
      component: "risk",
      label: "Risk Control",
      score: null,
      status: "invalid-data",
      direction: "unavailable",
      confidence: 0,
      reasons: [],
      warnings: ["Latest daily bar is unavailable."],
      metrics: {},
    };
  }

  const closes = bars.map((bar) => bar.close);
  const returns: number[] = [];

  for (let index = 1; index < closes.length; index += 1) {
    const change = percentChange(closes[index], closes[index - 1]);

    if (change !== null) {
      returns.push(change);
    }
  }

  const recentReturns = returns.slice(-20);
  const downsideReturns = recentReturns.filter((value) => value < 0);

  const volatility20 = standardDeviation(recentReturns);
  const downsideVolatility20 = standardDeviation(downsideReturns);

  const atr14 = averageTrueRange(bars, 14);
  const atrPercent =
    atr14 !== null && latest.close > 0
      ? (atr14 / latest.close) * 100
      : null;

  const high20 = highest(
    bars.map((bar) => bar.high),
    20,
  );

  const high50 = highest(
    bars.map((bar) => bar.high),
    50,
  );

  const drawdown20 =
    high20 && high20 > 0
      ? ((latest.close - high20) / high20) * 100
      : null;

  const drawdown50 =
    high50 && high50 > 0
      ? ((latest.close - high50) / high50) * 100
      : null;

  const gapRisk = calculateGapRisk(bars.slice(-20));

  const volatilityRisk = volatilityToRisk(volatility20);
  const downsideRisk = volatilityToRisk(downsideVolatility20);
  const atrRisk = atrToRisk(atrPercent);
  const drawdownRisk = drawdownToRisk(drawdown20, drawdown50);

  const rawRiskScore = clamp(
    volatilityRisk * 0.25 +
      downsideRisk * 0.25 +
      atrRisk * 0.2 +
      drawdownRisk * 0.2 +
      gapRisk * 0.1,
  );

  const riskControlScore = clamp(100 - rawRiskScore);

  const reasons = [
    atrPercent !== null
      ? `ATR represents ${round(atrPercent)}% of the current price.`
      : "ATR risk is unavailable.",

    drawdown20 !== null
      ? `Price is ${round(Math.abs(drawdown20))}% below its 20-day high.`
      : "20-day drawdown is unavailable.",

    downsideVolatility20 !== null
      ? `Recent downside volatility measures ${round(
          downsideVolatility20,
        )}%.`
      : "Downside volatility is unavailable.",

    riskControlScore >= 70
      ? "Current volatility and drawdown appear controlled."
      : riskControlScore <= 40
        ? "Current volatility, drawdown, or gap behavior is elevated."
        : "Current risk conditions are moderate.",
  ];

  return {
    component: "risk",
    label: "Risk Control",
    score: round(riskControlScore),
    status: bars.length >= 50 ? "ready" : "partial",
    direction:
      riskControlScore >= 80
        ? "strongly-rising"
        : riskControlScore >= 60
          ? "rising"
          : riskControlScore >= 42
            ? "stable"
            : riskControlScore >= 25
              ? "falling"
              : "strongly-falling",
    confidence: round(
      clamp(70 + Math.min(bars.length / 100, 1) * 30),
    ),
    reasons,
    warnings:
      riskControlScore < 35
        ? [
            "Elevated risk conditions may reduce the reliability of bullish Pulse signals.",
          ]
        : [],
    metrics: {
      riskScore: round(rawRiskScore),
      riskControlScore: round(riskControlScore),
      volatility20: roundNullable(volatility20),
      downsideVolatility20: roundNullable(downsideVolatility20),
      atr14: roundNullable(atr14),
      atrPercent: roundNullable(atrPercent),
      drawdown20: roundNullable(drawdown20),
      drawdown50: roundNullable(drawdown50),
      gapRisk: round(gapRisk),
    },
  };
}

function volatilityToRisk(
  volatility: number | null,
): number {
  if (volatility === null) {
    return 50;
  }

  /*
   * Daily volatility below 1% is relatively controlled.
   * Daily volatility over 5% is considered elevated.
   */
  return clamp((volatility - 0.6) * 22);
}

function atrToRisk(atrPercent: number | null): number {
  if (atrPercent === null) {
    return 50;
  }

  return clamp((atrPercent - 1) * 15);
}

function drawdownToRisk(
  drawdown20: number | null,
  drawdown50: number | null,
): number {
  const shortRisk =
    drawdown20 === null ? 50 : clamp(Math.abs(drawdown20) * 4);

  const mediumRisk =
    drawdown50 === null ? 50 : clamp(Math.abs(drawdown50) * 2.5);

  return shortRisk * 0.55 + mediumRisk * 0.45;
}

function calculateGapRisk(bars: HistoricalBar[]): number {
  if (bars.length < 2) {
    return 50;
  }

  const gaps: number[] = [];

  for (let index = 1; index < bars.length; index += 1) {
    const previousClose = bars[index - 1].close;

    if (previousClose <= 0) {
      continue;
    }

    const gap =
      Math.abs(bars[index].open - previousClose) /
      previousClose *
      100;

    gaps.push(gap);
  }

  const averageGap =
    gaps.reduce((total, gap) => total + gap, 0) /
    Math.max(gaps.length, 1);

  return clamp((averageGap - 0.3) * 22);
}

function roundNullable(
  value: number | null | undefined,
): number | null {
  return value === null || value === undefined
    ? null
    : round(value);
}
