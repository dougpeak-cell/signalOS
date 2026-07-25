import type {
  AMSAComponentResult,
  AMSAIndustryPulse,
  AMSAMarketPulse,
  AMSAPortfolioPulse,
  AMSAPulseEntityType,
  AMSAPulseSnapshot,
  AMSASectorPulse,
  AMSASnapshotFrequency,
  AMSAStockPulse,
} from "../types";

/* =========================================================
   AMSA SNAPSHOT CONVERSION HELPERS
========================================================= */

type SnapshotOptions = {
  frequency?: AMSASnapshotFrequency;
  sourceUpdatedAt?: string | null;
  metadata?: Record<string, unknown>;
};

export function stockPulseToSnapshot(
  pulse: AMSAStockPulse,
  options: SnapshotOptions = {},
): AMSAPulseSnapshot {
  return {
    entityType: "stock",
    entityKey:
      pulse.symbol ?? "UNKNOWN",
    entityName:
      pulse.symbol,

    score:
      pulse.score,

    confidence:
      pulse.confidence,

    state:
      pulse.state,

    direction:
      pulse.direction,

    status:
      pulse.status,

    components:
      pulse.components.map(
        componentToSnapshot,
      ),

    reasons:
      pulse.reasons,

    warnings:
      pulse.warnings,

    metadata: {
      barCount:
        pulse.barCount,

      currentPrice:
        pulse.currentPrice,

      weights:
        pulse.weights,

      invalidationConditions:
        pulse.invalidationConditions,

      ...options.metadata,
    },

    sourceUpdatedAt:
      options.sourceUpdatedAt,

    calculatedAt:
      pulse.calculatedAt,

    frequency:
      options.frequency ??
      "daily",
  };
}

export function marketPulseToSnapshot(
  pulse: AMSAMarketPulse,
  options: SnapshotOptions = {},
): AMSAPulseSnapshot {
  return {
    entityType: "market",
    entityKey: "US",
    entityName: "United States Market",

    score:
      pulse.score,

    confidence:
      pulse.confidence,

    state:
      pulse.regime,

    direction:
      pulse.direction,

    status:
      pulse.status,

    components:
      pulse.components.map(
        componentToSnapshot,
      ),

    reasons:
      pulse.reasons,

    warnings:
      pulse.warnings,

    metadata: {
      indexScore:
        pulse.indexScore,

      breadthScore:
        pulse.breadthScore,

      volatilityScore:
        pulse.volatilityScore,

      macroScore:
        pulse.macroScore,

      ...options.metadata,
    },

    sourceUpdatedAt:
      options.sourceUpdatedAt,

    calculatedAt:
      pulse.calculatedAt,

    frequency:
      options.frequency ??
      "daily",
  };
}

export function sectorPulseToSnapshot(
  pulse: AMSASectorPulse,
  options: SnapshotOptions = {},
): AMSAPulseSnapshot {
  return {
    entityType: "sector",
    entityKey:
      pulse.symbol,

    entityName:
      pulse.sector,

    score:
      pulse.score,

    confidence:
      pulse.confidence,

    state:
      pulse.state,

    direction:
      pulse.direction,

    status:
      pulse.status,

    components:
      pulse.components.map(
        componentToSnapshot,
      ),

    reasons:
      pulse.reasons,

    warnings:
      pulse.warnings,

    metadata: {
      sector:
        pulse.sector,

      leadership:
        pulse.leadership,

      relativeStrengthScore:
        pulse.relativeStrengthScore,

      marketAlignmentScore:
        pulse.marketAlignmentScore,

      rank:
        pulse.rank,

      previousRank:
        pulse.previousRank,

      rankChange:
        pulse.rankChange,

      ...options.metadata,
    },

    sourceUpdatedAt:
      options.sourceUpdatedAt,

    calculatedAt:
      pulse.calculatedAt,

    frequency:
      options.frequency ??
      "daily",
  };
}

export function industryPulseToSnapshot(
  pulse: AMSAIndustryPulse,
  options: SnapshotOptions = {},
): AMSAPulseSnapshot {
  return {
    entityType: "industry",

    entityKey:
      `${pulse.sector}:${pulse.industry}`,

    entityName:
      pulse.industry,

    score:
      pulse.score,

    confidence:
      pulse.confidence,

    state:
      pulse.state,

    direction:
      pulse.direction,

    status:
      pulse.status,

    components: [
      {
        key:
          "constituents",

        label:
          "Constituent Pulse",

        score:
          pulse.constituentScore,
      },
      {
        key:
          "participation",

        label:
          "Industry Participation",

        score:
          pulse.participationScore,
      },
      {
        key:
          "environment",

        label:
          "Environment Alignment",

        score:
          pulse.environmentScore,
      },
    ],

    reasons:
      pulse.reasons,

    warnings:
      pulse.warnings,

    metadata: {
      sector:
        pulse.sector,

      industry:
        pulse.industry,

      leadership:
        pulse.leadership,

      ...options.metadata,
    },

    sourceUpdatedAt:
      options.sourceUpdatedAt,

    calculatedAt:
      pulse.calculatedAt,

    frequency:
      options.frequency ??
      "daily",
  };
}

export function portfolioPulseToSnapshot(
  pulse: AMSAPortfolioPulse,
  portfolioKey: string,
  options: SnapshotOptions = {},
): AMSAPulseSnapshot {
  return {
    entityType: "portfolio",

    entityKey:
      portfolioKey,

    entityName:
      "Portfolio",

    score:
      pulse.score,

    confidence:
      pulse.confidence,

    state:
      pulse.state,

    direction:
      pulse.direction,

    status:
      pulse.status,

    components: [
      {
        key: "stocks",
        label:
          "Weighted Stock Pulse",
        score:
          pulse.weightedStockPulse,
      },
      {
        key: "alignment",
        label:
          "Portfolio Alignment",
        score:
          pulse.weightedAlignmentScore,
      },
      {
        key: "diversification",
        label:
          "Diversification",
        score:
          pulse.diversificationScore,
      },
      {
        key: "concentration",
        label:
          "Concentration Control",
        score:
          pulse.concentrationScore,
      },
      {
        key: "risk",
        label:
          "Risk Control",
        score:
          pulse.riskControlScore,
      },
    ],

    reasons:
      pulse.reasons,

    warnings:
      pulse.warnings,

    metadata: {
      totalMarketValue:
        pulse.totalMarketValue,

      dayChangePercent:
        pulse.dayChangePercent,

      largestSector:
        pulse.largestSector,

      largestSectorWeight:
        pulse.largestSectorWeight,

      classifiedValuePercent:
        pulse.classifiedValuePercent,

      alignedHoldings:
        pulse.alignedHoldings,

      totalHoldings:
        pulse.totalHoldings,

      sectorExposure:
        pulse.sectorExposure,

      conflicts:
        pulse.conflicts,

      ...options.metadata,
    },

    sourceUpdatedAt:
      options.sourceUpdatedAt,

    calculatedAt:
      pulse.calculatedAt,

    frequency:
      options.frequency ??
      "daily",
  };
}

function componentToSnapshot(
  component: AMSAComponentResult,
) {
  return {
    key:
      component.component,

    label:
      component.label,

    score:
      component.score,

    confidence:
      component.confidence,

    direction:
      component.direction,
  };
}

export function assertEntityType(
  value: string,
): AMSAPulseEntityType | null {
  const allowed:
    AMSAPulseEntityType[] = [
      "market",
      "sector",
      "industry",
      "stock",
      "portfolio",
      "crypto",
    ];

  return allowed.includes(
    value as AMSAPulseEntityType,
  )
    ? value as AMSAPulseEntityType
    : null;
}