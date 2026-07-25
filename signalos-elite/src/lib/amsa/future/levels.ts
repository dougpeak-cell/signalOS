import {
  clamp,
  isFiniteNumber,
  round,
} from "../math";

import type {
  AMSAExpectedMoveResult,
  AMSAFutureMapInput,
  AMSAPriceLevel,
  AMSAPriceLevelStrength,
} from "../types";

/* =========================================================
   FUTUREMAP(TM) PRICE LEVEL ENGINE

   Builds ranked support and resistance levels from:
   - Explicit support / resistance
   - Secondary levels
   - Moving averages
   - Recent highs and lows
   - VWAP
   - ATR fallback levels
========================================================= */

export function calculateFuturePriceLevels({
  input,
  expectedMove,
}: {
  input: AMSAFutureMapInput;
  expectedMove: AMSAExpectedMoveResult;
}): {
  supports: AMSAPriceLevel[];
  resistances: AMSAPriceLevel[];
} {
  const currentPrice =
    validPositiveNumber(
      input.currentPrice,
    );

  if (currentPrice === null) {
    return {
      supports: [],
      resistances: [],
    };
  }

  const supportCandidates:
    CandidateLevel[] = [];

  const resistanceCandidates:
    CandidateLevel[] = [];

  addExplicitLevel(
    supportCandidates,
    input.technicals?.support,
    "Primary Support",
    "support",
    "strong",
    92,
  );

  addExplicitLevel(
    supportCandidates,
    input.technicals
      ?.secondarySupport,
    "Secondary Support",
    "support",
    "moderate",
    78,
  );

  addExplicitLevel(
    resistanceCandidates,
    input.technicals?.resistance,
    "Primary Resistance",
    "resistance",
    "strong",
    92,
  );

  addExplicitLevel(
    resistanceCandidates,
    input.technicals
      ?.secondaryResistance,
    "Secondary Resistance",
    "resistance",
    "moderate",
    78,
  );

  addMovingAverage(
    supportCandidates,
    resistanceCandidates,
    input.technicals
      ?.movingAverage5,
    "5-Day Moving Average",
    currentPrice,
    60,
  );

  addMovingAverage(
    supportCandidates,
    resistanceCandidates,
    input.technicals
      ?.movingAverage10,
    "10-Day Moving Average",
    currentPrice,
    66,
  );

  addMovingAverage(
    supportCandidates,
    resistanceCandidates,
    input.technicals
      ?.movingAverage20,
    "20-Day Moving Average",
    currentPrice,
    78,
  );

  addMovingAverage(
    supportCandidates,
    resistanceCandidates,
    input.technicals
      ?.movingAverage30,
    "30-Day Moving Average",
    currentPrice,
    74,
  );

  addMovingAverage(
    supportCandidates,
    resistanceCandidates,
    input.technicals
      ?.movingAverage50,
    "50-Day Moving Average",
    currentPrice,
    86,
  );

  addMovingAverage(
    supportCandidates,
    resistanceCandidates,
    input.technicals
      ?.movingAverage100,
    "100-Day Moving Average",
    currentPrice,
    82,
  );

  addMovingAverage(
    supportCandidates,
    resistanceCandidates,
    input.technicals
      ?.movingAverage200,
    "200-Day Moving Average",
    currentPrice,
    94,
  );

  addMovingAverage(
    supportCandidates,
    resistanceCandidates,
    input.technicals
      ?.anchoredVwap,
    "Anchored VWAP",
    currentPrice,
    80,
  );

  addMovingAverage(
    supportCandidates,
    resistanceCandidates,
    input.technicals
      ?.sessionVwap,
    "Session VWAP",
    currentPrice,
    62,
  );

  addRecentRangeLevel(
    supportCandidates,
    input.technicals
      ?.recentLow,
    "Recent Range Low",
    "recent-low",
    "strong",
    84,
  );

  addRecentRangeLevel(
    resistanceCandidates,
    input.technicals
      ?.recentHigh,
    "Recent Range High",
    "recent-high",
    "strong",
    84,
  );

  addRecentRangeLevel(
    supportCandidates,
    input.technicals
      ?.previousLow,
    "Previous Low",
    "recent-low",
    "moderate",
    70,
  );

  addRecentRangeLevel(
    resistanceCandidates,
    input.technicals
      ?.previousHigh,
    "Previous High",
    "recent-high",
    "moderate",
    70,
  );

  const atr =
    validPositiveNumber(
      input.technicals?.atr,
    );

  if (atr !== null) {
    supportCandidates.push({
      price:
        currentPrice -
        atr,

      label:
        "One ATR Below",

      type: "atr",
      strength: "moderate",
      confidence: 68,
      source: "atr",

      description:
        "One average true range below the current price.",
    });

    supportCandidates.push({
      price:
        currentPrice -
        atr *
        1.5,

      label:
        "1.5 ATR Below",

      type: "atr",
      strength: "weak",
      confidence: 58,
      source: "atr",

      description:
        "An extended volatility level below the current price.",
    });

    resistanceCandidates.push({
      price:
        currentPrice +
        atr,

      label:
        "One ATR Above",

      type: "atr",
      strength: "moderate",
      confidence: 68,
      source: "atr",

      description:
        "One average true range above the current price.",
    });

    resistanceCandidates.push({
      price:
        currentPrice +
        atr *
        1.5,

      label:
        "1.5 ATR Above",

      type: "atr",
      strength: "weak",
      confidence: 58,
      source: "atr",

      description:
        "An extended volatility level above the current price.",
    });
  }

  if (
    expectedMove.normalRangeLow !==
    null
  ) {
    supportCandidates.push({
      price:
        expectedMove.normalRangeLow,

      label:
        "Expected Range Low",

      type: "range-low",
      strength: "moderate",
      confidence:
        expectedMove.confidence,

      source: "calculated",

      description:
        "The lower boundary of the calculated normal expected-move range.",
    });
  }

  if (
    expectedMove.normalRangeHigh !==
    null
  ) {
    resistanceCandidates.push({
      price:
        expectedMove.normalRangeHigh,

      label:
        "Expected Range High",

      type: "range-high",
      strength: "moderate",
      confidence:
        expectedMove.confidence,

      source: "calculated",

      description:
        "The upper boundary of the calculated normal expected-move range.",
    });
  }

  const supports =
    normalizeLevels(
      supportCandidates,
      currentPrice,
      "support",
    )
      .filter(
        (level) =>
          level.price <
          currentPrice,
      )
      .sort(
        (first, second) =>
          second.price -
          first.price,
      )
      .slice(0, 8);

  const resistances =
    normalizeLevels(
      resistanceCandidates,
      currentPrice,
      "resistance",
    )
      .filter(
        (level) =>
          level.price >
          currentPrice,
      )
      .sort(
        (first, second) =>
          first.price -
          second.price,
      )
      .slice(0, 8);

  return {
    supports,
    resistances,
  };
}

export function selectBullInvalidation({
  input,
  supports,
  expectedMove,
}: {
  input: AMSAFutureMapInput;
  supports: AMSAPriceLevel[];
  expectedMove: AMSAExpectedMoveResult;
}): AMSAPriceLevel | null {
  const currentPrice =
    validPositiveNumber(
      input.currentPrice,
    );

  if (currentPrice === null) {
    return null;
  }

  const atr =
    validPositiveNumber(
      input.technicals?.atr,
    );

  const preferredSupport =
    supports.find(
      (level) => {
        const distance =
          level.distancePercent;

        return (
          distance !== null &&
          distance >= 0.7 &&
          distance <=
            maximumInvalidationDistance(
              input,
            )
        );
      },
    );

  if (preferredSupport) {
    const buffer =
      atr !== null
        ? atr *
          invalidationAtrBuffer(
            input,
          )
        : currentPrice *
          0.0035;

    const price =
      Math.max(
        preferredSupport.price -
          buffer,
        0.0001,
      );

    return createInvalidationLevel({
      price,
      currentPrice,
      label:
        "Bull Invalidation",

      confidence:
        preferredSupport
          .confidence,

      source:
        preferredSupport
          .source,

      description:
        `The bullish scenario weakens below ${preferredSupport.label}.`,
    });
  }

  if (
    expectedMove.normalRangeLow !==
    null
  ) {
    return createInvalidationLevel({
      price:
        expectedMove.normalRangeLow,

      currentPrice,

      label:
        "Bull Invalidation",

      confidence:
        expectedMove.confidence,

      source: "calculated",

      description:
        "The bullish scenario weakens below the calculated expected-move range.",
    });
  }

  return null;
}

export function selectBearInvalidation({
  input,
  resistances,
  expectedMove,
}: {
  input: AMSAFutureMapInput;
  resistances: AMSAPriceLevel[];
  expectedMove: AMSAExpectedMoveResult;
}): AMSAPriceLevel | null {
  const currentPrice =
    validPositiveNumber(
      input.currentPrice,
    );

  if (currentPrice === null) {
    return null;
  }

  const atr =
    validPositiveNumber(
      input.technicals?.atr,
    );

  const preferredResistance =
    resistances.find(
      (level) => {
        const distance =
          level.distancePercent;

        return (
          distance !== null &&
          distance >= 0.7 &&
          distance <=
            maximumInvalidationDistance(
              input,
            )
        );
      },
    );

  if (preferredResistance) {
    const buffer =
      atr !== null
        ? atr *
          invalidationAtrBuffer(
            input,
          )
        : currentPrice *
          0.0035;

    return createInvalidationLevel({
      price:
        preferredResistance.price +
        buffer,

      currentPrice,

      label:
        "Bear Invalidation",

      confidence:
        preferredResistance
          .confidence,

      source:
        preferredResistance
          .source,

      description:
        `The bearish scenario weakens above ${preferredResistance.label}.`,
    });
  }

  if (
    expectedMove.normalRangeHigh !==
    null
  ) {
    return createInvalidationLevel({
      price:
        expectedMove.normalRangeHigh,

      currentPrice,

      label:
        "Bear Invalidation",

      confidence:
        expectedMove.confidence,

      source: "calculated",

      description:
        "The bearish scenario weakens above the calculated expected-move range.",
    });
  }

  return null;
}

function normalizeLevels(
  candidates: CandidateLevel[],
  currentPrice: number,
  fallbackType:
    | "support"
    | "resistance",
): AMSAPriceLevel[] {
  const deduplicated:
    CandidateLevel[] = [];

  for (const candidate of candidates) {
    if (
      !isFiniteNumber(
        candidate.price,
      ) ||
      candidate.price <= 0
    ) {
      continue;
    }

    const duplicate =
      deduplicated.find(
        (existing) => {
          const difference =
            (Math.abs(
              existing.price -
                candidate.price,
            ) /
              currentPrice) *
            100;

          return difference <= 0.2;
        },
      );

    if (!duplicate) {
      deduplicated.push(
        candidate,
      );

      continue;
    }

    if (
      candidate.confidence >
      duplicate.confidence
    ) {
      Object.assign(
        duplicate,
        candidate,
      );
    }
  }

  return deduplicated.map(
    (candidate) => ({
      type:
        candidate.type ??
        fallbackType,

      label:
        candidate.label,

      price:
        roundPrice(
          candidate.price,
        )!,

      distancePercent:
        round(
          (Math.abs(
            candidate.price -
              currentPrice,
          ) /
            currentPrice) *
            100,
        ),

      strength:
        candidate.strength,

      confidence:
        round(
          clamp(
            candidate.confidence,
          ),
        ),

      source:
        candidate.source,

      description:
        candidate.description,
    }),
  );
}

function addExplicitLevel(
  candidates: CandidateLevel[],
  value:
    | number
    | null
    | undefined,
  label: string,
  type:
    | "support"
    | "resistance",
  strength: AMSAPriceLevelStrength,
  confidence: number,
) {
  if (
    !isFiniteNumber(value) ||
    value <= 0
  ) {
    return;
  }

  candidates.push({
    price: value,
    label,
    type,
    strength,
    confidence,
    source: "explicit",

    description:
      `${label} was supplied by the technical-level engine.`,
  });
}

function addMovingAverage(
  supports: CandidateLevel[],
  resistances: CandidateLevel[],
  value:
    | number
    | null
    | undefined,
  label: string,
  currentPrice: number,
  confidence: number,
) {
  if (
    !isFiniteNumber(value) ||
    value <= 0
  ) {
    return;
  }

  const candidate: CandidateLevel = {
    price: value,
    label,
    type:
      "moving-average",

    strength:
      movingAverageStrength(
        confidence,
      ),

    confidence,

    source:
      "moving-average",

    description:
      `${label} may act as dynamic support or resistance.`,
  };

  if (value < currentPrice) {
    supports.push(candidate);
  } else if (
    value > currentPrice
  ) {
    resistances.push(candidate);
  }
}

function addRecentRangeLevel(
  candidates: CandidateLevel[],
  value:
    | number
    | null
    | undefined,
  label: string,
  type:
    | "recent-high"
    | "recent-low",
  strength: AMSAPriceLevelStrength,
  confidence: number,
) {
  if (
    !isFiniteNumber(value) ||
    value <= 0
  ) {
    return;
  }

  candidates.push({
    price: value,
    label,
    type,
    strength,
    confidence,
    source:
      "recent-range",

    description:
      `${label} is based on recent price structure.`,
  });
}

function createInvalidationLevel({
  price,
  currentPrice,
  label,
  confidence,
  source,
  description,
}: {
  price: number;
  currentPrice: number;
  label: string;
  confidence: number;
  source:
    AMSAPriceLevel["source"];
  description: string;
}): AMSAPriceLevel {
  return {
    type:
      "invalidation",

    label,

    price:
      roundPrice(price)!,

    distancePercent:
      round(
        (Math.abs(
          price -
            currentPrice,
        ) /
          currentPrice) *
          100,
      ),

    strength:
      confidence >= 85
        ? "major"
        : confidence >= 72
          ? "strong"
          : "moderate",

    confidence:
      round(
        clamp(confidence),
      ),

    source,

    description,
  };
}

function movingAverageStrength(
  confidence: number,
): AMSAPriceLevelStrength {
  if (confidence >= 90) {
    return "major";
  }

  if (confidence >= 80) {
    return "strong";
  }

  if (confidence >= 65) {
    return "moderate";
  }

  return "weak";
}

function invalidationAtrBuffer(
  input: AMSAFutureMapInput,
): number {
  if (
    input.horizon ===
    "intraday"
  ) {
    return 0.12;
  }

  if (
    input.horizon ===
    "position"
  ) {
    return 0.45;
  }

  return 0.25;
}

function maximumInvalidationDistance(
  input: AMSAFutureMapInput,
): number {
  if (
    input.horizon ===
    "intraday"
  ) {
    return 5;
  }

  if (
    input.horizon ===
    "position"
  ) {
    return 18;
  }

  return 10;
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

type CandidateLevel = {
  price: number;

  label: string;

  type:
    AMSAPriceLevel["type"];

  strength:
    AMSAPriceLevelStrength;

  confidence: number;

  source:
    AMSAPriceLevel["source"];

  description: string;
};