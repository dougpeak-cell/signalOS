import {
  average,
  clamp,
  isFiniteNumber,
  round,
  standardDeviation,
} from "../math";

import type {
  AMSAAlignmentInput,
  AMSAAlignmentResult,
  AMSAAlignmentState,
  AMSADirection,
} from "../types";

/* =========================================================
   AMSA HIERARCHICAL ALIGNMENT ENGINE

   Measures agreement across:

   Market
      ↓
   Sector
      ↓
   Industry
      ↓
   Stock

   A high Stock Pulse is more reliable when the environment
   is also supportive.
========================================================= */

export function calculateAlignment(
  input: AMSAAlignmentInput,
): AMSAAlignmentResult {
  const hierarchy = {
    market: normalizeScore(
      input.marketPulse,
    ),
    sector: normalizeScore(
      input.sectorPulse,
    ),
    industry: normalizeScore(
      input.industryPulse,
    ),
    stock: normalizeScore(
      input.stockPulse,
    ),
  };

  const scores = Object.values(
    hierarchy,
  ).filter(isFiniteNumber);

  if (scores.length < 2) {
    return {
      score: null,
      state: "Unavailable",
      confidence: 0,
      status: "insufficient-data",

      agreementScore: null,
      dispersionScore: null,
      directionAgreementScore: null,

      hierarchy,

      reasons: [],
      conflicts: [
        "At least two hierarchical Pulse readings are required to calculate alignment.",
      ],
    };
  }

  const agreementScore =
    calculateAgreementScore(scores);

  const dispersionScore =
    calculateDispersionScore(scores);

  const directionAgreementScore =
    calculateDirectionAgreementScore(
      [
        input.marketDirection,
        input.sectorDirection,
        input.industryDirection,
        input.stockDirection,
      ],
      hierarchy,
    );

  const sequentialScore =
    calculateSequentialSupport(
      hierarchy,
    );

  const score = clamp(
    agreementScore * 0.36 +
      dispersionScore * 0.27 +
      directionAgreementScore *
        0.2 +
      sequentialScore * 0.17,
  );

  const confidence = clamp(
    (scores.length / 4) * 100,
  );

  const reasons =
    buildAlignmentReasons(
      hierarchy,
      score,
      sequentialScore,
    );

  const conflicts =
    buildAlignmentConflicts(
      hierarchy,
    );

  return {
    score: round(score),
    state:
      scoreToAlignmentState(score),

    confidence:
      round(confidence),

    status:
      scores.length === 4
        ? "ready"
        : "partial",

    agreementScore:
      round(agreementScore),

    dispersionScore:
      round(dispersionScore),

    directionAgreementScore:
      round(
        directionAgreementScore,
      ),

    hierarchy,
    reasons,
    conflicts,
  };
}

function calculateAgreementScore(
  scores: number[],
): number {
  const positive =
    scores.filter(
      (score) =>
        score >= 55,
    ).length;

  const negative =
    scores.filter(
      (score) =>
        score <= 45,
    ).length;

  const neutral =
    scores.length -
    positive -
    negative;

  if (
    positive === scores.length ||
    negative === scores.length
  ) {
    return 100;
  }

  const dominant =
    Math.max(
      positive,
      negative,
      neutral,
    );

  return clamp(
    (dominant / scores.length) *
      100,
  );
}

function calculateDispersionScore(
  scores: number[],
): number {
  const deviation =
    standardDeviation(scores);

  if (deviation === null) {
    return 50;
  }

  return clamp(
    100 -
      deviation * 4,
  );
}

function calculateDirectionAgreementScore(
  directions: (
    | AMSADirection
    | null
    | undefined
  )[],
  hierarchy: {
    market: number | null;
    sector: number | null;
    industry: number | null;
    stock: number | null;
  },
): number {
  const resolvedDirections =
    directions
      .map((direction, index) => {
        if (
          direction &&
          direction !== "unavailable"
        ) {
          return normalizeDirection(
            direction,
          );
        }

        const scores = [
          hierarchy.market,
          hierarchy.sector,
          hierarchy.industry,
          hierarchy.stock,
        ];

        return scoreDirection(
          scores[index],
        );
      })
      .filter(
        (
          direction,
        ): direction is number =>
          direction !== null,
      );

  if (
    resolvedDirections.length < 2
  ) {
    return 50;
  }

  const mean =
    average(
      resolvedDirections,
    );

  if (mean === null) {
    return 50;
  }

  const difference =
    resolvedDirections.reduce(
      (total, direction) =>
        total +
        Math.abs(
          direction - mean,
        ),
      0,
    ) /
    resolvedDirections.length;

  return clamp(
    100 -
      difference * 50,
  );
}

function calculateSequentialSupport(
  hierarchy: {
    market: number | null;
    sector: number | null;
    industry: number | null;
    stock: number | null;
  },
): number {
  const sequence = [
    hierarchy.market,
    hierarchy.sector,
    hierarchy.industry,
    hierarchy.stock,
  ];

  let availablePairs = 0;
  let supportivePairs = 0;

  for (
    let index = 0;
    index <
    sequence.length - 1;
    index += 1
  ) {
    const parent =
      sequence[index];

    const child =
      sequence[index + 1];

    if (
      !isFiniteNumber(parent) ||
      !isFiniteNumber(child)
    ) {
      continue;
    }

    availablePairs += 1;

    const sameSide =
      (parent >= 50 &&
        child >= 50) ||
      (parent < 50 &&
        child < 50);

    const reasonablyClose =
      Math.abs(
        parent - child,
      ) <= 25;

    if (
      sameSide &&
      reasonablyClose
    ) {
      supportivePairs += 1;
    }
  }

  if (!availablePairs) {
    return 50;
  }

  return (
    supportivePairs /
    availablePairs
  ) * 100;
}

function buildAlignmentReasons(
  hierarchy: {
    market: number | null;
    sector: number | null;
    industry: number | null;
    stock: number | null;
  },
  score: number,
  sequentialSupport: number,
): string[] {
  const reasons: string[] = [];

  if (score >= 75) {
    reasons.push(
      "The available market, sector, industry, and stock readings are strongly aligned.",
    );
  } else if (score >= 55) {
    reasons.push(
      "Most available Pulse readings support the same market-state conclusion.",
    );
  } else {
    reasons.push(
      "The hierarchical Pulse readings show meaningful disagreement.",
    );
  }

  if (
    sequentialSupport >= 75
  ) {
    reasons.push(
      "Each available layer is receiving support from the layer above it.",
    );
  } else if (
    sequentialSupport <= 35
  ) {
    reasons.push(
      "The stock or industry is attempting to move against its broader environment.",
    );
  }

  if (
    isFiniteNumber(
      hierarchy.stock,
    ) &&
    isFiniteNumber(
      hierarchy.market,
    )
  ) {
    const difference =
      hierarchy.stock -
      hierarchy.market;

    if (difference >= 25) {
      reasons.push(
        "The Stock Pulse is materially stronger than the broader Market Pulse.",
      );
    } else if (
      difference <= -25
    ) {
      reasons.push(
        "The Stock Pulse is materially weaker than the broader Market Pulse.",
      );
    }
  }

  return reasons;
}

function buildAlignmentConflicts(
  hierarchy: {
    market: number | null;
    sector: number | null;
    industry: number | null;
    stock: number | null;
  },
): string[] {
  const conflicts: string[] = [];

  compareHierarchy(
    "Market",
    hierarchy.market,
    "Sector",
    hierarchy.sector,
    conflicts,
  );

  compareHierarchy(
    "Sector",
    hierarchy.sector,
    "Industry",
    hierarchy.industry,
    conflicts,
  );

  compareHierarchy(
    "Industry",
    hierarchy.industry,
    "Stock",
    hierarchy.stock,
    conflicts,
  );

  compareHierarchy(
    "Market",
    hierarchy.market,
    "Stock",
    hierarchy.stock,
    conflicts,
  );

  return Array.from(
    new Set(conflicts),
  ).slice(0, 4);
}

function compareHierarchy(
  firstLabel: string,
  firstScore: number | null,
  secondLabel: string,
  secondScore: number | null,
  conflicts: string[],
) {
  if (
    !isFiniteNumber(firstScore) ||
    !isFiniteNumber(secondScore)
  ) {
    return;
  }

  if (
    firstScore >= 60 &&
    secondScore <= 40
  ) {
    conflicts.push(
      `${secondLabel} strength conflicts with supportive ${firstLabel} conditions.`,
    );
  }

  if (
    firstScore <= 40 &&
    secondScore >= 60
  ) {
    conflicts.push(
      `${secondLabel} strength is fighting weak ${firstLabel} conditions.`,
    );
  }

  if (
    Math.abs(
      firstScore -
        secondScore,
    ) >= 35
  ) {
    conflicts.push(
      `${firstLabel} and ${secondLabel} Pulse readings have unusually high dispersion.`,
    );
  }
}

function normalizeScore(
  value:
    | number
    | null
    | undefined,
): number | null {
  return isFiniteNumber(value)
    ? clamp(value)
    : null;
}

function normalizeDirection(
  direction: AMSADirection,
): number {
  if (
    direction ===
    "strongly-rising"
  ) {
    return 1;
  }

  if (
    direction === "rising"
  ) {
    return 0.5;
  }

  if (
    direction === "falling"
  ) {
    return -0.5;
  }

  if (
    direction ===
    "strongly-falling"
  ) {
    return -1;
  }

  return 0;
}

function scoreDirection(
  score: number | null,
): number | null {
  if (!isFiniteNumber(score)) {
    return null;
  }

  if (score >= 70) {
    return 1;
  }

  if (score >= 55) {
    return 0.5;
  }

  if (score <= 30) {
    return -1;
  }

  if (score <= 45) {
    return -0.5;
  }

  return 0;
}

function scoreToAlignmentState(
  score: number,
): AMSAAlignmentState {
  if (score >= 82) {
    return "Strongly Aligned";
  }

  if (score >= 65) {
    return "Aligned";
  }

  if (score >= 45) {
    return "Mixed";
  }

  if (score >= 25) {
    return "Conflicted";
  }

  return "Strongly Conflicted";
}
