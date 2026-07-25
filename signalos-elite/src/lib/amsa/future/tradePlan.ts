import {
  isFiniteNumber,
  round,
} from "../math";

import type {
  AMSAFutureMap,
  AMSATradePlan,
} from "../types";

/* =========================================================
   FUTUREMAP(TM) TRADE-PLAN ENGINE

   Converts the dominant scenario into a structured plan.

   This is model output, not personalized investment advice.
========================================================= */

export function createFutureMapTradePlan(
  futureMap: Omit<
    AMSAFutureMap,
    "tradePlan"
  >,
): AMSATradePlan | null {
  const scenario =
    futureMap[
      futureMap.primaryScenario
    ];

  const currentPrice =
    validPositiveNumber(
      futureMap.currentPrice,
    );

  if (currentPrice === null) {
    return null;
  }

  const direction =
    futureMap.primaryScenario ===
      "bull"
      ? "long"
      : futureMap.primaryScenario ===
          "bear"
        ? "short"
        : "neutral";

  if (direction === "neutral") {
    return {
      symbol:
        futureMap.symbol,

      direction:
        "neutral",

      scenario: "base",

      currentPrice,

      entryZoneLow:
        scenario.expectedLow,

      entryZoneHigh:
        scenario.expectedHigh,

      targetOne:
        scenario.targetPrice,

      targetTwo: null,

      invalidationPrice: null,

      stopDistancePercent: null,

      expectedMovePercent:
        scenario.expectedMove
          ?.expectedMovePercent ??
        null,

      rewardToRisk: null,
      expectedValuePercent: null,

      probability:
        scenario.probability,

      confidence:
        scenario.confidence,

      qualityScore:
        scenario.quality
          ?.score ??
        null,

      qualityLabel:
        scenario.quality
          ?.label ??
        "Unavailable",

      riskLevel:
        futureMap.riskLevel,

      conditions:
        scenario.requirements,

      warnings: [
        "The Base scenario is dominant. FutureMap does not identify a strong directional edge.",
      ],

      positionRiskNotice:
        "FutureMap scenarios are model-generated and should be evaluated alongside personal risk limits and independent research.",
    };
  }

  const invalidation =
    scenario
      .invalidationPrice;

  const targetOne =
    scenario
      .targetLevels.at(0)
      ?.price ??
    scenario.targetPrice;

  const targetTwo =
    scenario
      .targetLevels.at(1)
      ?.price ??
    (
      direction === "long"
        ? scenario
            .expectedHigh
        : scenario
            .expectedLow
    );

  const atr =
    scenario.expectedMove
      ?.expectedMovePrice ??
    null;

  const entryZone =
    calculateEntryZone({
      direction,
      currentPrice,
      atr,
      invalidation,
    });

  const stopDistancePercent =
    invalidation === null
      ? null
      : (Math.abs(
          currentPrice -
            invalidation,
        ) /
          currentPrice) *
        100;

  const warnings = [
    ...(
      scenario.riskReward
        ?.warnings ??
      []
    ),
    ...(
      scenario.quality
        ?.warnings ??
      []
    ),
  ];

  if (
    futureMap.confidence <
    55
  ) {
    warnings.push(
      "FutureMap confidence is below 55%.",
    );
  }

  if (
    futureMap.riskLevel ===
      "High" ||
    futureMap.riskLevel ===
      "Extreme"
  ) {
    warnings.push(
      `Risk conditions are classified as ${futureMap.riskLevel}.`,
    );
  }

  return {
    symbol:
      futureMap.symbol,

    direction,

    scenario:
      futureMap.primaryScenario,

    currentPrice,

    entryZoneLow:
      entryZone.low,

    entryZoneHigh:
      entryZone.high,

    targetOne,

    targetTwo:
      targetTwo !==
        targetOne
        ? targetTwo
        : null,

    invalidationPrice:
      invalidation,

    stopDistancePercent:
      stopDistancePercent ===
      null
        ? null
        : round(
            stopDistancePercent,
          ),

    expectedMovePercent:
      scenario.expectedMove
        ?.expectedMovePercent ??
      null,

    rewardToRisk:
      scenario.riskReward
        ?.rewardToRisk ??
      null,

    expectedValuePercent:
      scenario.riskReward
        ?.expectedValuePercent ??
      null,

    probability:
      scenario.probability,

    confidence:
      scenario.confidence,

    qualityScore:
      scenario.quality
        ?.score ??
      null,

    qualityLabel:
      scenario.quality
        ?.label ??
      "Unavailable",

    riskLevel:
      futureMap.riskLevel,

    conditions:
      scenario.requirements,

    warnings:
      Array.from(
        new Set(warnings),
      ),

    positionRiskNotice:
      "FutureMap scenarios are model-generated and should be evaluated alongside personal risk limits and independent research.",
  };
}

function calculateEntryZone({
  direction,
  currentPrice,
  atr,
  invalidation,
}: {
  direction:
    | "long"
    | "short";

  currentPrice: number;

  atr: number | null;

  invalidation: number | null;
}): {
  low: number;
  high: number;
} {
  const volatilityUnit =
    atr !== null
      ? atr
      : currentPrice *
        0.015;

  if (direction === "long") {
    const low =
      Math.max(
        currentPrice -
          volatilityUnit *
            0.25,
        invalidation !== null
          ? invalidation +
            (
              currentPrice -
              invalidation
            ) *
              0.45
          : 0,
      );

    const high =
      currentPrice +
      volatilityUnit *
        0.08;

    return {
      low:
        roundPrice(low),

      high:
        roundPrice(high),
    };
  }

  const low =
    currentPrice -
    volatilityUnit *
      0.08;

  const high =
    invalidation !== null
      ? Math.min(
          currentPrice +
            volatilityUnit *
              0.25,

          currentPrice +
            (
              invalidation -
              currentPrice
            ) *
              0.55,
        )
      : currentPrice +
        volatilityUnit *
          0.25;

  return {
    low:
      roundPrice(low),

    high:
      roundPrice(high),
  };
}

function validPositiveNumber(
  value:
    | number
    | null
    | undefined,
): number | null {
  return isFiniteNumber(value) &&
    value > 0
    ? value
    : null;
}

function roundPrice(
  value: number,
): number {
  if (value >= 1000) {
    return round(value, 1);
  }

  if (value >= 1) {
    return round(value, 2);
  }

  return round(value, 4);
}