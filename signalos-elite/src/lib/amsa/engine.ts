import { DEFAULT_AMSA_WEIGHTS } from "./config";
import { calculateContextComponents } from "./contextComponents";
import {
  clamp,
  isFiniteNumber,
  round,
  sanitizeBars,
  scoreToDirection,
  scoreToState,
} from "./math";
import { calculateMovingAverageState } from "./movingAverage";
import { calculateRangeState } from "./range";
import { calculateRiskState } from "./risk";
import { calculateTrendState } from "./trend";
import type {
  AMSAComponentName,
  AMSAComponentResult,
  AMSAEngineOptions,
  AMSAStockPulse,
  AMSAWeightBreakdown,
  HistoricalBar,
} from "./types";
import { calculateVolumeState } from "./volume";

/* =========================================================
   Core AMSA Stock Pulse Engine
========================================================= */

export function calculateStockPulse(
  inputBars: HistoricalBar[],
  options: AMSAEngineOptions = {},
): AMSAStockPulse {
  const bars = sanitizeBars(inputBars);

  const components: AMSAComponentResult[] = [
    calculateMovingAverageState(bars),
    calculateTrendState(bars),
    calculateVolumeState(bars),
    calculateRangeState(bars),
    calculateRiskState(bars),
    ...calculateContextComponents(options.context),
  ];

  const requestedWeights = {
    ...DEFAULT_AMSA_WEIGHTS,
    ...options.weights,
  };

  const availableComponents = components.filter(
    (component) =>
      component.score !== null &&
      component.status !== "invalid-data" &&
      component.status !== "insufficient-data",
  );

  const availableWeightTotal = availableComponents.reduce(
    (total, component) => {
      return total + Math.max(0, requestedWeights[component.component]);
    },
    0,
  );

  const weights: AMSAWeightBreakdown[] = availableComponents.map(
    (component) => {
      const requestedWeight = Math.max(
        0,
        requestedWeights[component.component],
      );

      const effectiveWeight =
        availableWeightTotal > 0
          ? requestedWeight / availableWeightTotal
          : 0;

      const componentScore = Number(component.score);

      return {
        component: component.component,
        requestedWeight: round(requestedWeight, 4),
        effectiveWeight: round(effectiveWeight, 4),
        score: round(componentScore),
        contribution: round(
          componentScore * effectiveWeight,
          4,
        ),
      };
    },
  );

  const rawScore =
    weights.length > 0
      ? weights.reduce(
          (total, weight) => total + weight.contribution,
          0,
        )
      : null;

  const confidence = calculateOverallConfidence(
    availableComponents,
    components,
    bars.length,
  );

  const preliminaryScore =
    applyConfidenceAdjustment(
      rawScore,
      confidence,
    );

  const alignmentBonus =
    calculateContextAlignmentBonus(
      preliminaryScore,
      options.context?.sectorScore,
      options.context?.marketScore,
    );

  const score =
    preliminaryScore === null
      ? null
      : clamp(
          preliminaryScore +
            alignmentBonus,
        );

  const reasons = selectReasons(components, 6);
  const warnings = collectWarnings(components);
  const invalidationConditions =
    buildInvalidationConditions(components);

  const readyComponents = components.filter(
    (component) => component.status === "ready",
  ).length;

  const calculableComponents = availableComponents.length;

  const status =
    calculableComponents === 0
      ? "insufficient-data"
      : readyComponents >= 5
        ? "ready"
        : "partial";

  return {
    symbol: options.symbol?.trim().toUpperCase() || null,
    score: score === null ? null : round(score),
    state: scoreToState(score),
    direction: scoreToDirection(score),
    confidence: round(confidence),
    status,
    currentPrice: bars.at(-1)?.close ?? null,
    barCount: bars.length,
    components,
    weights,
    reasons,
    warnings,
    invalidationConditions,
    calculatedAt: new Date().toISOString(),
  };
}

function calculateOverallConfidence(
  availableComponents: AMSAComponentResult[],
  allComponents: AMSAComponentResult[],
  barCount: number,
): number {
  if (!availableComponents.length) {
    return 0;
  }

  const componentConfidence =
    availableComponents.reduce(
      (total, component) => total + component.confidence,
      0,
    ) / availableComponents.length;

  /*
   * Five internal components are enough for a strong Phase 1
   * reading. Market and sector context improve confidence but
   * are not required to calculate the initial Pulse.
   */
  const internalComponents = availableComponents.filter(
    (component) =>
      component.component !== "sector" &&
      component.component !== "market",
  ).length;

  const coverageScore = clamp((internalComponents / 5) * 100);
  const historyScore = clamp((barCount / 100) * 100);

  const contextBonus =
    allComponents.some(
      (component) =>
        component.component === "sector" &&
        component.score !== null,
    ) &&
    allComponents.some(
      (component) =>
        component.component === "market" &&
        component.score !== null,
    )
      ? 5
      : 0;

  return clamp(
    componentConfidence * 0.55 +
      coverageScore * 0.3 +
      historyScore * 0.15 +
      contextBonus,
  );
}

function applyConfidenceAdjustment(
  rawScore: number | null,
  confidence: number,
): number | null {
  if (rawScore === null) {
    return null;
  }

  /*
   * Low-confidence scores are gently drawn toward neutral.
   * This prevents incomplete data from producing extreme Pulse
   * readings.
   */
  const confidenceRatio = clamp(confidence) / 100;

  return clamp(50 + (rawScore - 50) * confidenceRatio);
}

function calculateContextAlignmentBonus(
  stockScore: number | null,
  sectorScore:
    | number
    | null
    | undefined,
  marketScore:
    | number
    | null
    | undefined,
): number {
  if (
    !isFiniteNumber(stockScore)
  ) {
    return 0;
  }

  const contextScores = [
    sectorScore,
    marketScore,
  ].filter(isFiniteNumber);

  if (!contextScores.length) {
    return 0;
  }

  const averageContext =
    contextScores.reduce(
      (total, value) =>
        total + value,
      0,
    ) /
    contextScores.length;

  const sameBullishState =
    stockScore >= 55 &&
    averageContext >= 55;

  const sameBearishState =
    stockScore <= 45 &&
    averageContext <= 45;

  const dispersion =
    Math.abs(
      stockScore -
        averageContext,
    );

  if (
    sameBullishState &&
    dispersion <= 18
  ) {
    return 4;
  }

  if (
    sameBearishState &&
    dispersion <= 18
  ) {
    return -2;
  }

  if (
    stockScore >= 65 &&
    averageContext <= 40
  ) {
    return -7;
  }

  if (
    stockScore <= 40 &&
    averageContext >= 65
  ) {
    return -4;
  }

  return 0;
}

function selectReasons(
  components: AMSAComponentResult[],
  maximum: number,
): string[] {
  const scoredComponents = components
    .filter((component) => component.score !== null)
    .sort((first, second) => {
      const firstDistance = Math.abs(Number(first.score) - 50);
      const secondDistance = Math.abs(Number(second.score) - 50);

      return secondDistance - firstDistance;
    });

  const reasons: string[] = [];

  for (const component of scoredComponents) {
    for (const reason of component.reasons) {
      if (!reasons.includes(reason)) {
        reasons.push(reason);
      }

      if (reasons.length >= maximum) {
        return reasons;
      }
    }
  }

  return reasons;
}

function collectWarnings(
  components: AMSAComponentResult[],
): string[] {
  return Array.from(
    new Set(
      components.flatMap((component) => component.warnings),
    ),
  );
}

function buildInvalidationConditions(
  components: AMSAComponentResult[],
): string[] {
  const conditions: string[] = [];

  const movingAverage = findComponent(
    components,
    "movingAverage",
  );

  const trend = findComponent(components, "trend");
  const volume = findComponent(components, "volume");
  const range = findComponent(components, "range");
  const risk = findComponent(components, "risk");
  const industry = findComponent(components, "industry");
  const alignment = findComponent(components, "alignment");
  const portfolio = findComponent(components, "portfolio");
  const sector = findComponent(components, "sector");
  const market = findComponent(components, "market");

  const movingAverageScore = movingAverage?.score;
  const trendScore = trend?.score;
  const volumeScore = volume?.score;
  const rangeScore = range?.score;
  const riskScore = risk?.score;
  const industryScore = industry?.score;
  const alignmentScore = alignment?.score;
  const portfolioScore = portfolio?.score;
  const sectorScore = sector?.score;
  const marketScore = market?.score;

  if (
    movingAverageScore !== null &&
    movingAverageScore !== undefined &&
    Number(movingAverageScore) >= 60
  ) {
    conditions.push(
      "A sustained break below the 20-day and 50-day moving-average structure would weaken the Pulse.",
    );
  }

  if (
    trendScore !== null &&
    trendScore !== undefined &&
    Number(trendScore) >= 60
  ) {
    conditions.push(
      "Loss of higher-high and higher-low structure would weaken trend persistence.",
    );
  }

  if (
    volumeScore !== null &&
    volumeScore !== undefined &&
    Number(volumeScore) >= 60
  ) {
    conditions.push(
      "Strong declining volume without recovery would conflict with the current participation reading.",
    );
  }

  if (
    rangeScore !== null &&
    rangeScore !== undefined &&
    Number(rangeScore) >= 60
  ) {
    conditions.push(
      "Repeated closes near daily lows would weaken buyer control.",
    );
  }

  if (
    riskScore !== null &&
    riskScore !== undefined &&
    Number(riskScore) < 50
  ) {
    conditions.push(
      "Elevated volatility or increasing drawdown may override otherwise constructive signals.",
    );
  }

  if (
    industryScore !== null &&
    industryScore !== undefined &&
    Number(industryScore) >= 60
  ) {
    conditions.push(
      "A deterioration in industry leadership would weaken the stock's tactical backdrop.",
    );
  }

  if (
    alignmentScore !== null &&
    alignmentScore !== undefined &&
    Number(alignmentScore) < 50
  ) {
    conditions.push(
      "Weakening context alignment would reduce confidence in the current Pulse continuation.",
    );
  }

  if (
    portfolioScore !== null &&
    portfolioScore !== undefined &&
    Number(portfolioScore) < 50
  ) {
    conditions.push(
      "Portfolio exposure and concentration could work against the current stock-level reading.",
    );
  }

  if (
    sectorScore !== null &&
    sectorScore !== undefined &&
    Number(sectorScore) >= 60
  ) {
    conditions.push(
      "A deterioration in sector leadership would reduce Pulse alignment.",
    );
  }

  if (
    marketScore !== null &&
    marketScore !== undefined &&
    Number(marketScore) >= 60
  ) {
    conditions.push(
      "A deterioration in the broader Market Pulse would reduce continuation support.",
    );
  }

  return conditions.slice(0, 7);
}

function findComponent(
  components: AMSAComponentResult[],
  componentName: AMSAComponentName,
): AMSAComponentResult | undefined {
  return components.find(
    (component) => component.component === componentName,
  );
}
