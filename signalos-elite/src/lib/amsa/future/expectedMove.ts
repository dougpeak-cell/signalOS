import {
  clamp,
  isFiniteNumber,
  round,
} from "../math";

import type {
  AMSAExpectedMoveMethod,
  AMSAExpectedMoveResult,
  AMSAFutureMapHorizon,
  AMSAFutureMapInput,
} from "../types";

/* =========================================================
   FUTUREMAP(TM) EXPECTED MOVE ENGINE

   Uses:
   - ATR
   - ATR percentage
   - historical volatility
   - average daily range
   - implied volatility when available
   - trend strength
   - Pulse confidence
   - selected time horizon

   The result is an evidence-based scenario range.
========================================================= */

export function calculateExpectedMove(
  input: AMSAFutureMapInput,
): AMSAExpectedMoveResult {
  const horizon =
    input.horizon ?? "swing";

  const tradingDays =
    horizonTradingDays(horizon);

  const currentPrice =
    validPositiveNumber(
      input.currentPrice,
    );

  const atr =
    validPositiveNumber(
      input.technicals?.atr,
    );

  const suppliedAtrPercent =
    validPositiveNumber(
      input.technicals?.atrPercent,
    );

  const calculatedAtrPercent =
    currentPrice !== null &&
    atr !== null
      ? (atr / currentPrice) * 100
      : null;

  const atrPercent =
    suppliedAtrPercent ??
    calculatedAtrPercent;

  const historicalVolatility =
    validPositiveNumber(
      input.technicals
        ?.historicalVolatilityPercent,
    );

  const impliedVolatility =
    validPositiveNumber(
      input.technicals
        ?.impliedVolatilityPercent,
    );

  const averageDailyRange =
    validPositiveNumber(
      input.technicals
        ?.averageDailyRangePercent,
    );

  const averageGap =
    validPositiveNumber(
      input.technicals
        ?.averageGapPercent,
    );

  const method =
    determineExpectedMoveMethod({
      atrPercent,
      historicalVolatility,
      impliedVolatility,
      averageDailyRange,
    });

  const oneDayVolatility =
    calculateOneDayVolatility({
      atrPercent,
      historicalVolatility,
      impliedVolatility,
      averageDailyRange,
    });

  const horizonMultiplier =
    Math.sqrt(tradingDays);

  const trendMultiplier =
    calculateTrendMultiplier(input);

  const confidenceMultiplier =
    calculateConfidenceMultiplier(input);

  const volatilityMultiplier =
    calculateVolatilityMultiplier({
      atrPercent,
      averageGap,
      riskControl:
        input.components
          ?.riskControl,
      volatilityControl:
        input.components
          ?.volatilityControl,
    });

  const baseExpectedMove =
    oneDayVolatility *
    horizonMultiplier;

  const directionalBias =
    calculateDirectionalBias(input);

  const adjustedExpectedMove =
    clamp(
      baseExpectedMove *
        trendMultiplier *
        confidenceMultiplier *
        volatilityMultiplier,
      minimumMove(horizon),
      maximumMove(horizon),
    );

  const bullExpansion =
    clamp(
      1 +
        Math.max(
          directionalBias,
          0,
        ) *
          0.28,
      0.8,
      1.35,
    );

  const bearExpansion =
    clamp(
      1 +
        Math.max(
          -directionalBias,
          0,
        ) *
          0.28,
      0.8,
      1.35,
    );

  const bullMovePercent =
    adjustedExpectedMove *
    bullExpansion;

  const bearMovePercent =
    -adjustedExpectedMove *
    bearExpansion;

  const baseWidth =
    adjustedExpectedMove *
    calculateBaseRangeFactor(input);

  const expectedMovePrice =
    currentPrice === null
      ? null
      : (currentPrice *
          adjustedExpectedMove) /
        100;

  const normalRangeLow =
    currentPrice === null
      ? null
      : currentPrice *
        (1 -
          adjustedExpectedMove /
            100);

  const normalRangeHigh =
    currentPrice === null
      ? null
      : currentPrice *
        (1 +
          adjustedExpectedMove /
            100);

  const extendedMultiplier =
    calculateExtendedMoveMultiplier(
      input,
    );

  const extendedRangeLow =
    currentPrice === null
      ? null
      : currentPrice *
        (1 -
          (adjustedExpectedMove *
            extendedMultiplier) /
            100);

  const extendedRangeHigh =
    currentPrice === null
      ? null
      : currentPrice *
        (1 +
          (adjustedExpectedMove *
            extendedMultiplier) /
            100);

  const availableInputs = [
    atrPercent,
    historicalVolatility,
    impliedVolatility,
    averageDailyRange,
    input.stockPulse,
    input.stockConfidence,
  ].filter(isFiniteNumber).length;

  const confidence =
    clamp(
      (availableInputs / 6) * 70 +
        Number(
          input.stockConfidence ??
            50,
        ) *
          0.3,
    );

  const reasons: string[] = [];

  if (atrPercent !== null) {
    reasons.push(
      `ATR represents approximately ${round(
        atrPercent,
      )}% of the current price.`,
    );
  }

  if (
    historicalVolatility !== null
  ) {
    reasons.push(
      `Historical volatility is ${round(
        historicalVolatility,
      )}% annualized.`,
    );
  }

  if (
    impliedVolatility !== null
  ) {
    reasons.push(
      `Implied volatility is ${round(
        impliedVolatility,
      )}% annualized.`,
    );
  }

  reasons.push(
    `The ${horizon} horizon uses approximately ${tradingDays} trading day${
      tradingDays === 1 ? "" : "s"
    }.`,
  );

  if (trendMultiplier > 1.05) {
    reasons.push(
      "Strong directional evidence expanded the expected move.",
    );
  } else if (
    trendMultiplier < 0.97
  ) {
    reasons.push(
      "Mixed directional evidence reduced the expected move.",
    );
  }

  const warnings: string[] = [];

  if (method === "fallback") {
    warnings.push(
      "Expected move uses a conservative fallback because ATR and volatility inputs are unavailable.",
    );
  }

  if (
    averageGap !== null &&
    averageGap >= 3
  ) {
    warnings.push(
      "Historical gap behavior may cause price to move through calculated levels.",
    );
  }

  if (confidence < 55) {
    warnings.push(
      "Expected-move confidence is limited because several volatility inputs are missing.",
    );
  }

  return {
    method,
    horizon,

    horizonTradingDays:
      tradingDays,

    oneAtrPercent:
      atrPercent === null
        ? null
        : round(atrPercent),

    expectedMovePercent:
      round(adjustedExpectedMove),

    expectedMovePrice:
      roundPrice(
        expectedMovePrice,
      ),

    normalRangeLow:
      roundPrice(
        normalRangeLow,
      ),

    normalRangeHigh:
      roundPrice(
        normalRangeHigh,
      ),

    extendedRangeLow:
      roundPrice(
        extendedRangeLow,
      ),

    extendedRangeHigh:
      roundPrice(
        extendedRangeHigh,
      ),

    bullMovePercent:
      round(
        bullMovePercent,
      ),

    baseMoveLowPercent:
      round(-baseWidth),

    baseMoveHighPercent:
      round(baseWidth),

    bearMovePercent:
      round(
        bearMovePercent,
      ),

    volatilityMultiplier:
      round(
        volatilityMultiplier,
        3,
      ),

    trendMultiplier:
      round(
        trendMultiplier,
        3,
      ),

    confidenceMultiplier:
      round(
        confidenceMultiplier,
        3,
      ),

    horizonMultiplier:
      round(
        horizonMultiplier,
        3,
      ),

    confidence:
      round(confidence),

    reasons,
    warnings,
  };
}

function calculateOneDayVolatility({
  atrPercent,
  historicalVolatility,
  impliedVolatility,
  averageDailyRange,
}: {
  atrPercent: number | null;
  historicalVolatility: number | null;
  impliedVolatility: number | null;
  averageDailyRange: number | null;
}): number {
  const values: {
    value: number;
    weight: number;
  }[] = [];

  if (atrPercent !== null) {
    values.push({
      value: atrPercent,
      weight: 0.46,
    });
  }

  if (
    averageDailyRange !== null
  ) {
    values.push({
      value:
        averageDailyRange *
        0.72,
      weight: 0.2,
    });
  }

  if (
    historicalVolatility !== null
  ) {
    values.push({
      value:
        historicalVolatility /
        Math.sqrt(252),
      weight: 0.19,
    });
  }

  if (
    impliedVolatility !== null
  ) {
    values.push({
      value:
        impliedVolatility /
        Math.sqrt(252),
      weight: 0.15,
    });
  }

  if (!values.length) {
    return 2.25;
  }

  const totalWeight =
    values.reduce(
      (total, item) =>
        total +
        item.weight,
      0,
    );

  return (
    values.reduce(
      (total, item) =>
        total +
        item.value *
          item.weight,
      0,
    ) / totalWeight
  );
}

function calculateDirectionalBias(
  input: AMSAFutureMapInput,
): number {
  const values: {
    value: number;
    weight: number;
  }[] = [];

  addBiasValue(
    values,
    input.stockPulse,
    0.35,
  );

  addBiasValue(
    values,
    input.sectorPulse,
    0.16,
  );

  addBiasValue(
    values,
    input.industryPulse,
    0.14,
  );

  addBiasValue(
    values,
    input.marketPulse,
    0.1,
  );

  addBiasValue(
    values,
    input.components?.trend,
    0.15,
  );

  addBiasValue(
    values,
    input.alignmentScore,
    0.1,
  );

  if (!values.length) {
    return 0;
  }

  const totalWeight =
    values.reduce(
      (total, item) =>
        total +
        item.weight,
      0,
    );

  return clamp(
    values.reduce(
      (total, item) =>
        total +
        item.value *
          item.weight,
      0,
    ) / totalWeight,
    -1,
    1,
  );
}

function addBiasValue(
  values: {
    value: number;
    weight: number;
  }[],
  score:
    | number
    | null
    | undefined,
  weight: number,
) {
  if (!isFiniteNumber(score)) {
    return;
  }

  values.push({
    value:
      clamp(
        (score - 50) / 50,
        -1,
        1,
      ),

    weight,
  });
}

function calculateTrendMultiplier(
  input: AMSAFutureMapInput,
): number {
  const trendScores = [
    input.stockPulse,
    input.components?.trend,
    input.components
      ?.movingAverage,
    input.alignmentScore,
  ].filter(isFiniteNumber);

  if (!trendScores.length) {
    return 1;
  }

  const averageScore =
    trendScores.reduce(
      (total, score) =>
        total + score,
      0,
    ) /
    trendScores.length;

  const directionalStrength =
    Math.abs(
      averageScore - 50,
    ) / 50;

  const evolutionBoost =
    isFiniteNumber(
      input.evolution?.change,
    )
      ? clamp(
          Math.abs(
            input.evolution.change,
          ) / 20,
          0,
          0.2,
        )
      : 0;

  return clamp(
    0.92 +
      directionalStrength *
        0.25 +
      evolutionBoost,
    0.88,
    1.32,
  );
}

function calculateConfidenceMultiplier(
  input: AMSAFutureMapInput,
): number {
  const confidences = [
    input.stockConfidence,
    input.marketConfidence,
    input.sectorConfidence,
    input.industryConfidence,
    input.alignmentConfidence,
    input.evolution?.confidence,
  ].filter(isFiniteNumber);

  if (!confidences.length) {
    return 0.94;
  }

  const averageConfidence =
    confidences.reduce(
      (total, confidence) =>
        total + confidence,
      0,
    ) /
    confidences.length;

  return clamp(
    0.88 +
      (averageConfidence /
        100) *
        0.2,
    0.88,
    1.08,
  );
}

function calculateVolatilityMultiplier({
  atrPercent,
  averageGap,
  riskControl,
  volatilityControl,
}: {
  atrPercent: number | null;

  averageGap:
    | number
    | null;

  riskControl:
    | number
    | null
    | undefined;

  volatilityControl:
    | number
    | null
    | undefined;
}): number {
  let multiplier = 1;

  if (
    atrPercent !== null &&
    atrPercent >= 5
  ) {
    multiplier += 0.08;
  }

  if (
    averageGap !== null &&
    averageGap >= 2
  ) {
    multiplier += 0.06;
  }

  const controls = [
    riskControl,
    volatilityControl,
  ].filter(isFiniteNumber);

  if (controls.length) {
    const averageControl =
      controls.reduce(
        (total, score) =>
          total + score,
        0,
      ) /
      controls.length;

    if (averageControl <= 35) {
      multiplier += 0.12;
    } else if (
      averageControl >= 75
    ) {
      multiplier -= 0.05;
    }
  }

  return clamp(
    multiplier,
    0.88,
    1.28,
  );
}

function calculateBaseRangeFactor(
  input: AMSAFutureMapInput,
): number {
  const trendScore =
    input.components?.trend;

  const alignment =
    input.alignmentScore;

  const directionalStrength =
    [
      trendScore,
      alignment,
      input.stockPulse,
    ]
      .filter(isFiniteNumber)
      .reduce(
        (total, score) =>
          total +
          Math.abs(
            score - 50,
          ),
        0,
      );

  const availableCount =
    [
      trendScore,
      alignment,
      input.stockPulse,
    ].filter(isFiniteNumber).length;

  if (!availableCount) {
    return 0.48;
  }

  const averageStrength =
    directionalStrength /
    availableCount;

  return clamp(
    0.62 -
      averageStrength /
        100,
    0.32,
    0.62,
  );
}

function calculateExtendedMoveMultiplier(
  input: AMSAFutureMapInput,
): number {
  const riskControl =
    input.components
      ?.riskControl;

  const volatilityControl =
    input.components
      ?.volatilityControl;

  const controls = [
    riskControl,
    volatilityControl,
  ].filter(isFiniteNumber);

  if (!controls.length) {
    return 1.55;
  }

  const averageControl =
    controls.reduce(
      (total, score) =>
        total + score,
      0,
    ) /
    controls.length;

  if (averageControl <= 30) {
    return 1.9;
  }

  if (averageControl <= 50) {
    return 1.7;
  }

  if (averageControl >= 80) {
    return 1.35;
  }

  return 1.5;
}

function determineExpectedMoveMethod({
  atrPercent,
  historicalVolatility,
  impliedVolatility,
  averageDailyRange,
}: {
  atrPercent: number | null;
  historicalVolatility: number | null;
  impliedVolatility: number | null;
  averageDailyRange: number | null;
}): AMSAExpectedMoveMethod {
  const available =
    [
      atrPercent,
      historicalVolatility,
      impliedVolatility,
      averageDailyRange,
    ].filter(isFiniteNumber).length;

  if (
    atrPercent !== null &&
    available >= 2
  ) {
    return "blended";
  }

  if (atrPercent !== null) {
    return "atr";
  }

  if (
    historicalVolatility !== null ||
    impliedVolatility !== null
  ) {
    return "historical-volatility";
  }

  return "fallback";
}

function horizonTradingDays(
  horizon: AMSAFutureMapHorizon,
): number {
  if (horizon === "intraday") {
    return 1;
  }

  if (horizon === "position") {
    return 40;
  }

  return 10;
}

function minimumMove(
  horizon: AMSAFutureMapHorizon,
): number {
  if (horizon === "intraday") {
    return 0.45;
  }

  if (horizon === "position") {
    return 3;
  }

  return 1.25;
}

function maximumMove(
  horizon: AMSAFutureMapHorizon,
): number {
  if (horizon === "intraday") {
    return 15;
  }

  if (horizon === "position") {
    return 65;
  }

  return 35;
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
  value: number | null,
): number | null {
  if (
    !isFiniteNumber(value) ||
    value <= 0
  ) {
    return null;
  }

  if (value >= 1000) {
    return round(value, 1);
  }

  if (value >= 1) {
    return round(value, 2);
  }

  return round(value, 4);
}