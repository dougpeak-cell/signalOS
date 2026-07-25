import {
  clamp,
  isFiniteNumber,
  round,
} from "../math";

import type {
  AMSAFutureMapInput,
  AMSARiskRewardResult,
  AMSAScenarioQuality,
} from "../types";

/* =========================================================
   FUTUREMAP(TM) REWARD-TO-RISK ENGINE

   Calculates:
   - reward per share
   - risk per share
   - reward-to-risk
   - break-even probability
   - probability-adjusted expected value
========================================================= */

export function calculateRiskReward({
  direction,
  entryPrice,
  targetPrice,
  invalidationPrice,
  scenarioProbability,
}: {
  direction: "long" | "short";

  entryPrice:
    | number
    | null
    | undefined;

  targetPrice:
    | number
    | null
    | undefined;

  invalidationPrice:
    | number
    | null
    | undefined;

  scenarioProbability: number;
}): AMSARiskRewardResult {
  const entry =
    positiveNumber(
      entryPrice,
    );

  const target =
    positiveNumber(
      targetPrice,
    );

  const invalidation =
    positiveNumber(
      invalidationPrice,
    );

  const warnings: string[] = [];

  if (
    entry === null ||
    target === null ||
    invalidation === null
  ) {
    return unavailableRiskReward({
      direction,
      entry,
      target,
      invalidation,
      scenarioProbability,
      warning:
        "Entry, target, and invalidation prices are required to calculate reward-to-risk.",
    });
  }

  const rewardPerShare =
    direction === "long"
      ? target - entry
      : entry - target;

  const riskPerShare =
    direction === "long"
      ? entry - invalidation
      : invalidation - entry;

  if (rewardPerShare <= 0) {
    warnings.push(
      "The scenario target does not provide positive directional reward.",
    );
  }

  if (riskPerShare <= 0) {
    warnings.push(
      "The invalidation level is positioned on the wrong side of the entry.",
    );
  }

  if (
    rewardPerShare <= 0 ||
    riskPerShare <= 0
  ) {
    return unavailableRiskReward({
      direction,
      entry,
      target,
      invalidation,
      scenarioProbability,
      warning:
        warnings.join(" "),
    });
  }

  const rewardPercent =
    (rewardPerShare /
      entry) *
    100;

  const riskPercent =
    (riskPerShare / entry) *
    100;

  const rewardToRisk =
    rewardPerShare /
    riskPerShare;

  const breakEvenProbability =
    (riskPerShare /
      (riskPerShare +
        rewardPerShare)) *
    100;

  const normalizedProbability =
    clamp(
      scenarioProbability,
    ) / 100;

  const failureProbability =
    1 -
    normalizedProbability;

  const probabilityAdjustedReward =
    rewardPerShare *
    normalizedProbability;

  const probabilityAdjustedRisk =
    riskPerShare *
    failureProbability;

  const expectedValuePerShare =
    probabilityAdjustedReward -
    probabilityAdjustedRisk;

  const expectedValuePercent =
    (expectedValuePerShare /
      entry) *
    100;

  if (riskPercent >= 10) {
    warnings.push(
      "The invalidation distance exceeds 10% of the entry price.",
    );
  }

  if (
    scenarioProbability <
    breakEvenProbability
  ) {
    warnings.push(
      "The scenario probability is below the mathematical break-even probability.",
    );
  }

  return {
    direction,

    entryPrice:
      roundPrice(entry),

    targetPrice:
      roundPrice(target),

    invalidationPrice:
      roundPrice(
        invalidation,
      ),

    rewardPerShare:
      round(
        rewardPerShare,
        4,
      ),

    riskPerShare:
      round(
        riskPerShare,
        4,
      ),

    rewardPercent:
      round(rewardPercent),

    riskPercent:
      round(riskPercent),

    rewardToRisk:
      round(
        rewardToRisk,
        2,
      ),

    breakEvenProbability:
      round(
        breakEvenProbability,
      ),

    scenarioProbability:
      round(
        clamp(
          scenarioProbability,
        ),
      ),

    probabilityAdjustedReward:
      round(
        probabilityAdjustedReward,
        4,
      ),

    probabilityAdjustedRisk:
      round(
        probabilityAdjustedRisk,
        4,
      ),

    expectedValuePerShare:
      round(
        expectedValuePerShare,
        4,
      ),

    expectedValuePercent:
      round(
        expectedValuePercent,
      ),

    quality:
      determineRiskRewardQuality({
        rewardToRisk,
        expectedValuePercent,
        scenarioProbability,
        breakEvenProbability,
      }),

    warnings,
  };
}

function determineRiskRewardQuality({
  rewardToRisk,
  expectedValuePercent,
  scenarioProbability,
  breakEvenProbability,
}: {
  rewardToRisk: number;
  expectedValuePercent: number;
  scenarioProbability: number;
  breakEvenProbability: number;
}): AMSARiskRewardResult["quality"] {
  const probabilityEdge =
    scenarioProbability -
    breakEvenProbability;

  if (
    rewardToRisk >= 3 &&
    expectedValuePercent >= 3 &&
    probabilityEdge >= 15
  ) {
    return "Exceptional";
  }

  if (
    rewardToRisk >= 2 &&
    expectedValuePercent > 0 &&
    probabilityEdge >= 8
  ) {
    return "Strong";
  }

  if (
    rewardToRisk >= 1.5 &&
    expectedValuePercent >= 0 &&
    probabilityEdge >= 2
  ) {
    return "Acceptable";
  }

  if (
    rewardToRisk >= 1 &&
    expectedValuePercent >= -1
  ) {
    return "Marginal";
  }

  return "Poor";
}

function unavailableRiskReward({
  direction,
  entry,
  target,
  invalidation,
  scenarioProbability,
  warning,
}: {
  direction: "long" | "short";

  entry: number | null;
  target: number | null;
  invalidation: number | null;

  scenarioProbability: number;
  warning: string;
}): AMSARiskRewardResult {
  return {
    direction,

    entryPrice:
      entry,

    targetPrice:
      target,

    invalidationPrice:
      invalidation,

    rewardPerShare: null,
    riskPerShare: null,

    rewardPercent: null,
    riskPercent: null,

    rewardToRisk: null,

    breakEvenProbability: null,

    scenarioProbability:
      round(
        clamp(
          scenarioProbability,
        ),
      ),

    probabilityAdjustedReward: null,
    probabilityAdjustedRisk: null,

    expectedValuePerShare: null,
    expectedValuePercent: null,

    quality: "Unavailable",

    warnings: [warning],
  };
}

function positiveNumber(
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

export function calculateScenarioQuality({
  probability,
  confidence,
  riskReward,
  input,
}: {
  probability: number;
  confidence: number;

  riskReward:
    | AMSARiskRewardResult
    | null;

  input: AMSAFutureMapInput;
}): AMSAScenarioQuality {
  const probabilityScore =
    clamp(
      probability,
    );

  const confidenceScore =
    clamp(
      confidence,
    );

  const rewardRiskScore =
    riskReward?.rewardToRisk ===
      null ||
    riskReward?.rewardToRisk ===
      undefined
      ? 45
      : clamp(
          (riskReward.rewardToRisk /
            3) *
            100,
        );

  const alignmentScore =
    isFiniteNumber(
      input.alignmentScore,
    )
      ? clamp(
          input.alignmentScore,
        )
      : 50;

  const riskControlScore =
    isFiniteNumber(
      input.components
        ?.riskControl,
    )
      ? clamp(
          input.components
            .riskControl,
        )
      : 50;

  const score =
    clamp(
      probabilityScore *
        0.28 +
        confidenceScore *
          0.25 +
        rewardRiskScore *
          0.2 +
        alignmentScore *
          0.15 +
        riskControlScore *
          0.12,
    );

  const reasons: string[] = [];

  if (probabilityScore >= 60) {
    reasons.push(
      "Scenario probability is meaningfully above neutral.",
    );
  }

  if (confidenceScore >= 75) {
    reasons.push(
      "AMSA input confidence is strong.",
    );
  }

  if (
    riskReward?.rewardToRisk !==
      null &&
    riskReward?.rewardToRisk !==
      undefined &&
    riskReward.rewardToRisk >= 2
  ) {
    reasons.push(
      `Reward-to-risk is ${round(
        riskReward.rewardToRisk,
        2,
      )}:1.`,
    );
  }

  if (alignmentScore >= 70) {
    reasons.push(
      "The stock is supported by hierarchical market alignment.",
    );
  }

  if (riskControlScore >= 70) {
    reasons.push(
      "Risk conditions are relatively controlled.",
    );
  }

  const warnings: string[] = [];

  if (probabilityScore < 45) {
    warnings.push(
      "Scenario probability is not dominant.",
    );
  }

  if (confidenceScore < 55) {
    warnings.push(
      "Scenario confidence is limited.",
    );
  }

  if (
    riskReward?.rewardToRisk !==
      null &&
    riskReward?.rewardToRisk !==
      undefined &&
    riskReward.rewardToRisk < 1
  ) {
    warnings.push(
      "Calculated reward is smaller than calculated risk.",
    );
  }

  if (alignmentScore < 40) {
    warnings.push(
      "The scenario conflicts with the broader market hierarchy.",
    );
  }

  return {
    score: round(score),

    label:
      scenarioQualityLabel(score),

    probabilityScore:
      round(
        probabilityScore,
      ),

    confidenceScore:
      round(
        confidenceScore,
      ),

    rewardRiskScore:
      round(
        rewardRiskScore,
      ),

    alignmentScore:
      round(
        alignmentScore,
      ),

    riskControlScore:
      round(
        riskControlScore,
      ),

    reasons,
    warnings,
  };
}

function scenarioQualityLabel(
  score: number,
): AMSAScenarioQuality["label"] {
  if (score >= 85) {
    return "Elite";
  }

  if (score >= 74) {
    return "Strong";
  }

  if (score >= 62) {
    return "Constructive";
  }

  if (score >= 48) {
    return "Mixed";
  }

  return "Weak";
}