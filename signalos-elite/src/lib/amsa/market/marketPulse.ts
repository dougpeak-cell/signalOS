import {
  clamp,
  isFiniteNumber,
  percentChange,
  round,
  scoreToDirection,
  scoreToState,
  weightedScore,
} from "../math";

import { calculateStockPulse } from "../engine";
import { calculateMarketBreadth } from "./breadth";

import type {
  AMSAComponentResult,
  AMSAMacroInput,
  AMSAMarketPulse,
  AMSAMarketPulseInput,
  AMSAMarketRegime,
  AMSAVolatilityInput,
} from "../types";

/* =========================================================
   AMSA MARKET PULSE ENGINE

   Combines:
   - Major index structure
   - Market breadth
   - Volatility conditions
   - Macro pressure

   No individual missing input causes the entire engine to fail.
   Available weights are redistributed automatically.
========================================================= */

export function calculateMarketPulse(
  input: AMSAMarketPulseInput,
): AMSAMarketPulse {
  const indexComponent = calculateIndexComponent(input);
  const breadthResult = calculateMarketBreadth(
    input.breadth,
  );

  const breadthComponent: AMSAComponentResult = {
    component: "market",
    label: "Market Breadth",
    score: breadthResult.score,
    status: breadthResult.status,
    direction: breadthResult.direction,
    confidence: breadthResult.confidence,
    reasons: breadthResult.reasons,
    warnings: breadthResult.warnings,
    metrics: breadthResult.metrics,
  };

  const volatilityComponent =
    calculateVolatilityComponent(input.volatility);

  const macroComponent =
    calculateMacroComponent(input.macro);

  const score = weightedScore([
    {
      score: indexComponent.score,
      weight: 0.42,
    },
    {
      score: breadthComponent.score,
      weight: 0.3,
    },
    {
      score: volatilityComponent.score,
      weight: 0.18,
    },
    {
      score: macroComponent.score,
      weight: 0.1,
    },
  ]);

  const availableComponents = [
    indexComponent,
    breadthComponent,
    volatilityComponent,
    macroComponent,
  ].filter(
    (component) =>
      isFiniteNumber(component.score),
  );

  const confidence =
    availableComponents.length === 0
      ? 0
      : clamp(
          availableComponents.reduce(
            (total, component) =>
              total + component.confidence,
            0,
          ) /
            availableComponents.length *
            (availableComponents.length / 4),
        );

  const adjustedScore =
    score === null
      ? null
      : clamp(
          50 +
            (score - 50) *
              (0.55 + confidence / 220),
        );

  const previousScore = isFiniteNumber(
    input.previousPulse,
  )
    ? clamp(input.previousPulse)
    : null;

  const change =
    adjustedScore !== null &&
    previousScore !== null
      ? adjustedScore - previousScore
      : null;

  const reasons = selectReasons(
    [
      indexComponent,
      breadthComponent,
      volatilityComponent,
      macroComponent,
    ],
    7,
  );

  const warnings = Array.from(
    new Set(
      [
        ...indexComponent.warnings,
        ...breadthComponent.warnings,
        ...volatilityComponent.warnings,
        ...macroComponent.warnings,
      ],
    ),
  );

  return {
    score:
      adjustedScore === null
        ? null
        : round(adjustedScore),

    previousScore,

    change:
      change === null
        ? null
        : round(change),

    state: scoreToState(adjustedScore),
    regime: scoreToMarketRegime(adjustedScore),

    direction:
      change !== null
        ? changeToDirection(change)
        : scoreToDirection(adjustedScore),

    confidence: round(confidence),

    status:
      availableComponents.length === 4
        ? "ready"
        : availableComponents.length >= 2
          ? "partial"
          : availableComponents.length === 1
            ? "partial"
            : "insufficient-data",

    indexScore: indexComponent.score,
    breadthScore: breadthComponent.score,
    volatilityScore: volatilityComponent.score,
    macroScore: macroComponent.score,

    components: [
      indexComponent,
      breadthComponent,
      volatilityComponent,
      macroComponent,
    ],

    reasons,
    warnings,

    calculatedAt: new Date().toISOString(),
  };
}

function calculateIndexComponent(
  input: AMSAMarketPulseInput,
): AMSAComponentResult {
  const validIndices = input.indices.filter(
    (index) =>
      Array.isArray(index.bars) &&
      index.bars.length >= 20,
  );

  if (!validIndices.length) {
    return {
      component: "market",
      label: "Major Index Structure",
      score: null,
      status: "insufficient-data",
      direction: "unavailable",
      confidence: 0,
      reasons: [],
      warnings: [
        "No valid major-index history was supplied.",
      ],
      metrics: {},
    };
  }

  const results = validIndices.map((index) => {
    const pulse = calculateStockPulse(
      index.bars,
      {
        symbol: index.symbol,
        weights: {
          sector: 0,
          market: 0,
        },
      },
    );

    return {
      symbol: index.symbol,
      name: index.name ?? index.symbol,
      score: pulse.score,
      confidence: pulse.confidence,
      weight:
        isFiniteNumber(index.weight) &&
        index.weight > 0
          ? index.weight
          : defaultIndexWeight(index.symbol),
    };
  });

  const score = weightedScore(
    results.map((result) => ({
      score: result.score,
      weight: result.weight,
    })),
  );

  const confidenceValues = results.filter(
    (result) =>
      isFiniteNumber(result.score),
  );

  const confidence =
    confidenceValues.length === 0
      ? 0
      : clamp(
          confidenceValues.reduce(
            (total, result) =>
              total + result.confidence,
            0,
          ) / confidenceValues.length,
        );

  const reasons = results
    .filter((result) =>
      isFiniteNumber(result.score),
    )
    .sort(
      (first, second) =>
        Number(second.score) -
        Number(first.score),
    )
    .slice(0, 4)
    .map(
      (result) =>
        `${result.name} has an AMSA structure score of ${round(
          Number(result.score),
        )}.`,
    );

  return {
    component: "market",
    label: "Major Index Structure",
    score:
      score === null
        ? null
        : round(score),

    status:
      confidenceValues.length >= 4
        ? "ready"
        : "partial",

    direction: scoreToDirection(score),
    confidence: round(confidence),

    reasons,
    warnings:
      confidenceValues.length < 3
        ? [
            "The Market Pulse has limited index coverage.",
          ]
        : [],

    metrics: Object.fromEntries(
      results.map((result) => [
        result.symbol,
        result.score,
      ]),
    ),
  };
}

function calculateVolatilityComponent(
  input: AMSAVolatilityInput | null | undefined,
): AMSAComponentResult {
  if (!input) {
    return unavailableComponent(
      "Volatility Conditions",
      "Volatility inputs were not supplied.",
    );
  }

  const vixLevelScore = isFiniteNumber(
    input.vixValue,
  )
    ? vixToControlScore(input.vixValue)
    : null;

  const vixTrendScore =
    isFiniteNumber(input.vixValue) &&
    isFiniteNumber(input.vix20DayAverage)
      ? vixRelativeScore(
          input.vixValue,
          input.vix20DayAverage,
        )
      : null;

  const vixDayScore =
    isFiniteNumber(input.vixValue) &&
    isFiniteNumber(input.vixPreviousClose)
      ? vixDailyChangeScore(
          input.vixValue,
          input.vixPreviousClose,
        )
      : null;

  const atrControlScore = isFiniteNumber(
    input.marketAtrPercent,
  )
    ? clamp(
        100 -
          Math.max(
            0,
            input.marketAtrPercent - 0.6,
          ) *
            28,
      )
    : null;

  const gapControlScore = isFiniteNumber(
    input.averageGapPercent,
  )
    ? clamp(
        100 -
          Math.max(
            0,
            input.averageGapPercent - 0.2,
          ) *
            35,
      )
    : null;

  const score = weightedScore([
    {
      score: vixLevelScore,
      weight: 0.35,
    },
    {
      score: vixTrendScore,
      weight: 0.25,
    },
    {
      score: vixDayScore,
      weight: 0.1,
    },
    {
      score: atrControlScore,
      weight: 0.2,
    },
    {
      score: gapControlScore,
      weight: 0.1,
    },
  ]);

  const availableCount = [
    vixLevelScore,
    vixTrendScore,
    vixDayScore,
    atrControlScore,
    gapControlScore,
  ].filter(isFiniteNumber).length;

  const reasons: string[] = [];

  if (isFiniteNumber(input.vixValue)) {
    reasons.push(
      input.vixValue <= 15
        ? `VIX is ${round(input.vixValue)}, indicating controlled implied volatility.`
        : input.vixValue >= 30
          ? `VIX is ${round(input.vixValue)}, indicating elevated implied volatility.`
          : `VIX is ${round(input.vixValue)}, indicating moderate implied volatility.`,
    );
  }

  if (
    isFiniteNumber(input.vixValue) &&
    isFiniteNumber(input.vix20DayAverage)
  ) {
    reasons.push(
      input.vixValue <
        input.vix20DayAverage
        ? "VIX is below its 20-day average."
        : "VIX is above its 20-day average.",
    );
  }

  return {
    component: "market",
    label: "Volatility Conditions",
    score:
      score === null
        ? null
        : round(score),

    status:
      availableCount >= 4
        ? "ready"
        : availableCount >= 1
          ? "partial"
          : "insufficient-data",

    direction: scoreToDirection(score),

    confidence: round(
      clamp(
        (availableCount / 5) * 100,
      ),
    ),

    reasons,

    warnings:
      availableCount < 2
        ? [
            "Volatility confidence is limited.",
          ]
        : [],

    metrics: {
      vixValue:
        input.vixValue ?? null,

      vixPreviousClose:
        input.vixPreviousClose ?? null,

      vix20DayAverage:
        input.vix20DayAverage ?? null,

      marketAtrPercent:
        input.marketAtrPercent ?? null,

      averageGapPercent:
        input.averageGapPercent ?? null,
    },
  };
}

function calculateMacroComponent(
  input: AMSAMacroInput | null | undefined,
): AMSAComponentResult {
  if (!input) {
    return unavailableComponent(
      "Macro Conditions",
      "Macro inputs were not supplied.",
    );
  }

  /*
   * Macro scores are intentionally conservative in Phase 2.
   * This prevents the macro engine from overpowering price,
   * breadth, and volatility before the inputs are fully tuned.
   */

  const yieldChangeScore = isFiniteNumber(
    input.tenYearYieldChange,
  )
    ? clamp(
        50 -
          input.tenYearYieldChange * 7,
      )
    : null;

  const dollarScore = isFiniteNumber(
    input.dollarIndexChange,
  )
    ? clamp(
        50 -
          input.dollarIndexChange * 8,
      )
    : null;

  const oilScore = isFiniteNumber(
    input.oilChange,
  )
    ? clamp(
        50 -
          Math.abs(input.oilChange) * 2.5,
      )
    : null;

  const creditScore = isFiniteNumber(
    input.creditSpreadScore,
  )
    ? clamp(input.creditSpreadScore)
    : null;

  const economicScore = isFiniteNumber(
    input.economicRiskScore,
  )
    ? clamp(
        100 -
          input.economicRiskScore,
      )
    : null;

  const score = weightedScore([
    {
      score: yieldChangeScore,
      weight: 0.28,
    },
    {
      score: dollarScore,
      weight: 0.18,
    },
    {
      score: oilScore,
      weight: 0.12,
    },
    {
      score: creditScore,
      weight: 0.24,
    },
    {
      score: economicScore,
      weight: 0.18,
    },
  ]);

  const availableCount = [
    yieldChangeScore,
    dollarScore,
    oilScore,
    creditScore,
    economicScore,
  ].filter(isFiniteNumber).length;

  const reasons: string[] = [];

  if (isFiniteNumber(input.tenYearYieldChange)) {
    reasons.push(
      input.tenYearYieldChange > 0
        ? "The 10-year Treasury yield is rising, adding valuation pressure."
        : input.tenYearYieldChange < 0
          ? "The 10-year Treasury yield is falling, reducing valuation pressure."
          : "The 10-year Treasury yield is stable.",
    );
  }

  if (isFiniteNumber(input.dollarIndexChange)) {
    reasons.push(
      input.dollarIndexChange > 0
        ? "The U.S. dollar is strengthening."
        : input.dollarIndexChange < 0
          ? "The U.S. dollar is weakening."
          : "The U.S. dollar is stable.",
    );
  }

  return {
    component: "market",
    label: "Macro Conditions",

    score:
      score === null
        ? null
        : round(score),

    status:
      availableCount >= 4
        ? "ready"
        : availableCount >= 1
          ? "partial"
          : "insufficient-data",

    direction: scoreToDirection(score),

    confidence: round(
      clamp(
        (availableCount / 5) * 100,
      ),
    ),

    reasons,

    warnings:
      availableCount < 2
        ? [
            "Macro context is incomplete and carries reduced weight.",
          ]
        : [],

    metrics: {
      tenYearYield:
        input.tenYearYield ?? null,

      tenYearYieldChange:
        input.tenYearYieldChange ?? null,

      dollarIndexChange:
        input.dollarIndexChange ?? null,

      oilChange:
        input.oilChange ?? null,

      creditSpreadScore:
        input.creditSpreadScore ?? null,

      economicRiskScore:
        input.economicRiskScore ?? null,
    },
  };
}

function vixToControlScore(
  vix: number,
): number {
  if (vix <= 12) return 96;
  if (vix <= 15) return 88;
  if (vix <= 20) return 75;
  if (vix <= 25) return 58;
  if (vix <= 30) return 42;
  if (vix <= 40) return 24;

  return 10;
}

function vixRelativeScore(
  current: number,
  average: number,
): number {
  if (average <= 0) {
    return 50;
  }

  const difference =
    ((current - average) / average) *
    100;

  return clamp(
    50 -
      difference * 3,
  );
}

function vixDailyChangeScore(
  current: number,
  previous: number,
): number {
  const change = percentChange(
    current,
    previous,
  );

  if (change === null) {
    return 50;
  }

  return clamp(
    50 -
      change * 2.5,
  );
}

function scoreToMarketRegime(
  score: number | null,
): AMSAMarketRegime {
  if (!isFiniteNumber(score)) {
    return "Unavailable";
  }

  if (score >= 82) {
    return "Strong Risk-On";
  }

  if (score >= 65) {
    return "Risk-On";
  }

  if (score >= 43) {
    return "Balanced";
  }

  if (score >= 25) {
    return "Risk-Off";
  }

  return "Strong Risk-Off";
}

function changeToDirection(
  change: number,
) {
  if (change >= 7) {
    return "strongly-rising" as const;
  }

  if (change >= 2) {
    return "rising" as const;
  }

  if (change <= -7) {
    return "strongly-falling" as const;
  }

  if (change <= -2) {
    return "falling" as const;
  }

  return "stable" as const;
}

function defaultIndexWeight(
  symbol: string,
): number {
  const normalized =
    symbol.toUpperCase();

  if (
    normalized === "SPY" ||
    normalized === "^GSPC"
  ) {
    return 0.32;
  }

  if (
    normalized === "QQQ" ||
    normalized === "^IXIC"
  ) {
    return 0.26;
  }

  if (
    normalized === "IWM" ||
    normalized === "^RUT"
  ) {
    return 0.22;
  }

  if (
    normalized === "DIA" ||
    normalized === "^DJI"
  ) {
    return 0.2;
  }

  return 0.15;
}

function selectReasons(
  components: AMSAComponentResult[],
  maximum: number,
): string[] {
  const reasons: string[] = [];

  const orderedComponents =
    [...components].sort(
      (first, second) =>
        Math.abs(
          Number(second.score ?? 50) -
            50,
        ) -
        Math.abs(
          Number(first.score ?? 50) -
            50,
        ),
    );

  for (const component of orderedComponents) {
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

function unavailableComponent(
  label: string,
  warning: string,
): AMSAComponentResult {
  return {
    component: "market",
    label,
    score: null,
    status: "insufficient-data",
    direction: "unavailable",
    confidence: 0,
    reasons: [],
    warnings: [warning],
    metrics: {},
  };
}
