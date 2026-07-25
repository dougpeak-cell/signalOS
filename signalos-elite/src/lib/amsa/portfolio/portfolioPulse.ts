import {
  clamp,
  isFiniteNumber,
  round,
  scoreToDirection,
  scoreToState,
  weightedScore,
} from "../math";

import {
  calculateAlignment,
} from "../alignment/alignment";

import {
  calculateClassifiedValuePercent,
  calculateConcentrationScore,
  calculateSectorExposure,
} from "./exposure";

import type {
  AMSAPortfolioHoldingInput,
  AMSAPortfolioPulse,
} from "../types";

/* =========================================================
   AMSA PORTFOLIO PULSE ENGINE

   Evaluates:
   - Weighted Stock Pulse
   - Hierarchical alignment
   - Diversification
   - Concentration
   - Risk control
========================================================= */

export function calculatePortfolioPulse(
  holdingsInput: AMSAPortfolioHoldingInput[],
): AMSAPortfolioPulse {
  const holdings =
    holdingsInput.filter(
      (holding) =>
        isFiniteNumber(
          holding.marketValue,
        ) &&
        holding.marketValue > 0,
    );

  const totalMarketValue =
    holdings.reduce(
      (total, holding) =>
        total +
        holding.marketValue,
      0,
    );

  if (
    !holdings.length ||
    totalMarketValue <= 0
  ) {
    return emptyPortfolioPulse();
  }

  const enrichedHoldings =
    holdings.map((holding) => {
      const weight =
        (holding.marketValue /
          totalMarketValue) *
        100;

      const alignment =
        calculateAlignment({
          stockPulse:
            holding.stockPulse,

          industryPulse:
            holding.industryPulse,

          sectorPulse:
            holding.sectorPulse,

          marketPulse:
            holding.marketPulse,
        });

      return {
        holding,
        weight,
        alignment:
          alignment.score,
        alignmentState:
          alignment.state,
      };
    });

  const weightedStockPulse =
    weightedScore(
      enrichedHoldings.map(
        ({ holding }) => ({
          score:
            holding.stockPulse ??
            null,

          weight:
            holding.marketValue,
        }),
      ),
    );

  const weightedAlignmentScore =
    weightedScore(
      enrichedHoldings.map(
        ({
          holding,
          alignment,
        }) => ({
          score: alignment,
          weight:
            holding.marketValue,
        }),
      ),
    );

  const sectorExposure =
    calculateSectorExposure(
      holdings,
    );

  const concentrationScore =
    calculateConcentrationScore(
      sectorExposure,
      holdings,
    );

  const diversificationScore =
    calculateDiversificationScore(
      holdings,
      sectorExposure,
      concentrationScore,
    );

  const riskControlScore =
    calculatePortfolioRiskControl(
      holdings,
    );

  const score =
    weightedScore([
      {
        score:
          weightedStockPulse,
        weight: 0.4,
      },
      {
        score:
          weightedAlignmentScore,
        weight: 0.25,
      },
      {
        score:
          diversificationScore,
        weight: 0.14,
      },
      {
        score:
          concentrationScore,
        weight: 0.11,
      },
      {
        score:
          riskControlScore,
        weight: 0.1,
      },
    ]);

  const classifiedValuePercent =
    calculateClassifiedValuePercent(
      holdings,
    );

  const alignedHoldings =
    enrichedHoldings.filter(
      ({
        alignment,
      }) =>
        isFiniteNumber(
          alignment,
        ) &&
        alignment >= 65,
    ).length;

  const dayChangePercent =
    calculateWeightedDayChange(
      holdings,
      totalMarketValue,
    );

  const largestExposure =
    sectorExposure.at(0) ??
    null;

  const availableComponents = [
    weightedStockPulse,
    weightedAlignmentScore,
    diversificationScore,
    concentrationScore,
    riskControlScore,
  ].filter(isFiniteNumber).length;

  const pulseCoverage =
    holdings.filter(
      (holding) =>
        isFiniteNumber(
          holding.stockPulse,
        ),
    ).reduce(
      (total, holding) =>
        total +
        holding.marketValue,
      0,
    ) /
    totalMarketValue *
    100;

  const confidence = clamp(
    pulseCoverage * 0.55 +
      classifiedValuePercent *
        0.25 +
      (availableComponents / 5) *
        20,
  );

  const reasons: string[] = [];

  if (
    weightedStockPulse !== null
  ) {
    reasons.push(
      `The value-weighted Stock Pulse is ${round(
        weightedStockPulse,
      )}.`,
    );
  }

  if (
    weightedAlignmentScore !== null
  ) {
    reasons.push(
      weightedAlignmentScore >= 70
        ? "Most portfolio value is aligned with market, sector, and industry conditions."
        : weightedAlignmentScore <= 40
          ? "A meaningful portion of the portfolio is fighting its broader environment."
          : "Portfolio alignment is mixed.",
    );
  }

  if (
    largestExposure
  ) {
    reasons.push(
      `${largestExposure.sector} is the largest sector exposure at ${round(
        largestExposure.weight,
      )}%.`,
    );
  }

  if (
    diversificationScore !== null
  ) {
    reasons.push(
      diversificationScore >= 70
        ? "Portfolio diversification is constructive."
        : diversificationScore <= 40
          ? "Portfolio diversification is limited."
          : "Portfolio diversification is moderate.",
    );
  }

  const conflicts: string[] = [];

  if (
    largestExposure &&
    largestExposure.weight >= 45
  ) {
    conflicts.push(
      `${largestExposure.sector} represents ${round(
        largestExposure.weight,
      )}% of portfolio value.`,
    );
  }

  const weakHighWeightHoldings =
    enrichedHoldings.filter(
      ({
        holding,
        weight,
      }) =>
        weight >= 10 &&
        isFiniteNumber(
          holding.stockPulse,
        ) &&
        Number(
          holding.stockPulse,
        ) <= 40,
    );

  for (
    const item of
      weakHighWeightHoldings
  ) {
    conflicts.push(
      `${item.holding.symbol} has a weak Pulse while representing ${round(
        item.weight,
      )}% of portfolio value.`,
    );
  }

  const unalignedHighWeight =
    enrichedHoldings.filter(
      ({
        alignment,
        weight,
      }) =>
        weight >= 10 &&
        isFiniteNumber(
          alignment,
        ) &&
        alignment <= 40,
    );

  for (
    const item of
      unalignedHighWeight
  ) {
    conflicts.push(
      `${item.holding.symbol} has low environmental alignment at a ${round(
        item.weight,
      )}% portfolio weight.`,
    );
  }

  const warnings: string[] = [];

  if (
    classifiedValuePercent < 80
  ) {
    warnings.push(
      `Only ${round(
        classifiedValuePercent,
      )}% of portfolio value has a sector classification.`,
    );
  }

  if (
    pulseCoverage < 80
  ) {
    warnings.push(
      `Only ${round(
        pulseCoverage,
      )}% of portfolio value has a valid Stock Pulse.`,
    );
  }

  return {
    score:
      score === null
        ? null
        : round(score),

    state: scoreToState(score),
    direction:
      scoreToDirection(score),

    confidence:
      round(confidence),

    status:
      confidence >= 80
        ? "ready"
        : confidence > 0
          ? "partial"
          : "insufficient-data",

    totalMarketValue:
      round(
        totalMarketValue,
        2,
      ),

    dayChangePercent:
      dayChangePercent === null
        ? null
        : round(
            dayChangePercent,
          ),

    weightedStockPulse:
      weightedStockPulse === null
        ? null
        : round(
            weightedStockPulse,
          ),

    weightedAlignmentScore:
      weightedAlignmentScore === null
        ? null
        : round(
            weightedAlignmentScore,
          ),

    diversificationScore:
      diversificationScore === null
        ? null
        : round(
            diversificationScore,
          ),

    concentrationScore:
      concentrationScore === null
        ? null
        : round(
            concentrationScore,
          ),

    riskControlScore:
      riskControlScore === null
        ? null
        : round(
            riskControlScore,
          ),

    largestSector:
      largestExposure?.sector ??
      null,

    largestSectorWeight:
      largestExposure?.weight ??
      null,

    classifiedValuePercent:
      round(
        classifiedValuePercent,
      ),

    alignedHoldings,
    totalHoldings:
      holdings.length,

    sectorExposure,

    holdings:
      enrichedHoldings
        .map(
          ({
            holding,
            weight,
            alignment,
          }) => ({
            symbol:
              holding.symbol,

            weight:
              round(weight),

            pulse:
              holding.stockPulse ??
              null,

            alignment:
              alignment === null
                ? null
                : round(
                    alignment,
                  ),

            sector:
              holding.sector ??
              null,
          }),
        )
        .sort(
          (first, second) =>
            second.weight -
            first.weight,
        ),

    reasons,

    conflicts:
      Array.from(
        new Set(conflicts),
      ).slice(0, 6),

    warnings,

    calculatedAt:
      new Date().toISOString(),
  };
}

function calculateDiversificationScore(
  holdings: AMSAPortfolioHoldingInput[],
  sectorExposure: {
    sector: string;
    weight: number;
  }[],
  concentrationScore: number | null,
): number | null {
  if (!holdings.length) {
    return null;
  }

  const holdingCountScore =
    clamp(
      Math.min(
        holdings.length / 12,
        1,
      ) * 100,
    );

  const sectorCount =
    sectorExposure.filter(
      (sector) =>
        sector.sector !==
        "Unclassified",
    ).length;

  const sectorCountScore =
    clamp(
      Math.min(
        sectorCount / 7,
        1,
      ) * 100,
    );

  return weightedScore([
    {
      score:
        holdingCountScore,
      weight: 0.3,
    },
    {
      score:
        sectorCountScore,
      weight: 0.35,
    },
    {
      score:
        concentrationScore,
      weight: 0.35,
    },
  ]);
}

function calculatePortfolioRiskControl(
  holdings: AMSAPortfolioHoldingInput[],
): number | null {
  return weightedScore(
    holdings.map(
      (holding) => ({
        score:
          isFiniteNumber(
            holding.riskScore,
          )
            ? clamp(
                100 -
                  holding.riskScore,
              )
            : null,

        weight:
          holding.marketValue,
      }),
    ),
  );
}

function calculateWeightedDayChange(
  holdings: AMSAPortfolioHoldingInput[],
  totalMarketValue: number,
): number | null {
  const validHoldings =
    holdings.filter(
      (holding) =>
        isFiniteNumber(
          holding.dayChangePercent,
        ),
    );

  if (
    !validHoldings.length ||
    totalMarketValue <= 0
  ) {
    return null;
  }

  return validHoldings.reduce(
    (total, holding) =>
      total +
      Number(
        holding.dayChangePercent,
      ) *
        (holding.marketValue /
          totalMarketValue),
    0,
  );
}

function emptyPortfolioPulse(): AMSAPortfolioPulse {
  return {
    score: null,
    state: "Unavailable",
    direction: "unavailable",
    confidence: 0,
    status: "insufficient-data",

    totalMarketValue: 0,
    dayChangePercent: null,

    weightedStockPulse: null,
    weightedAlignmentScore: null,
    diversificationScore: null,
    concentrationScore: null,
    riskControlScore: null,

    largestSector: null,
    largestSectorWeight: null,

    classifiedValuePercent: 0,
    alignedHoldings: 0,
    totalHoldings: 0,

    sectorExposure: [],
    holdings: [],

    reasons: [],
    conflicts: [],
    warnings: [
      "No valid portfolio holdings were supplied.",
    ],

    calculatedAt:
      new Date().toISOString(),
  };
}
