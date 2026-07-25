import {
  clamp,
  isFiniteNumber,
  round,
  weightedScore,
} from "../math";

import type {
  AMSAPortfolioHoldingInput,
  AMSASectorExposure,
} from "../types";

/* =========================================================
   AMSA PORTFOLIO EXPOSURE ENGINE
========================================================= */

export function calculateSectorExposure(
  holdings: AMSAPortfolioHoldingInput[],
): AMSASectorExposure[] {
  const totalValue =
    holdings.reduce(
      (total, holding) =>
        total +
        validMarketValue(
          holding.marketValue,
        ),
      0,
    );

  if (totalValue <= 0) {
    return [];
  }

  const sectorMap = new Map<
    string,
    {
      marketValue: number;
      holdingCount: number;
      pulses: {
        score: number | null;
        weight: number;
      }[];
    }
  >();

  for (const holding of holdings) {
    const marketValue =
      validMarketValue(
        holding.marketValue,
      );

    if (marketValue <= 0) {
      continue;
    }

    const sector =
      holding.sector?.trim() ||
      "Unclassified";

    const existing =
      sectorMap.get(sector) ?? {
        marketValue: 0,
        holdingCount: 0,
        pulses: [],
      };

    existing.marketValue +=
      marketValue;

    existing.holdingCount += 1;

    existing.pulses.push({
      score:
        holding.sectorPulse ??
        holding.stockPulse ??
        null,

      weight: marketValue,
    });

    sectorMap.set(
      sector,
      existing,
    );
  }

  return Array.from(
    sectorMap.entries(),
  )
    .map(
      ([sector, data]) => ({
        sector,

        marketValue:
          round(
            data.marketValue,
            2,
          ),

        weight:
          round(
            (data.marketValue /
              totalValue) *
              100,
            2,
          ),

        pulse:
          weightedScore(
            data.pulses,
          ) === null
            ? null
            : round(
                Number(
                  weightedScore(
                    data.pulses,
                  ),
                ),
              ),

        holdingCount:
          data.holdingCount,
      }),
    )
    .sort(
      (first, second) =>
        second.weight -
        first.weight,
    );
}

export function calculateConcentrationScore(
  exposures: AMSASectorExposure[],
  holdings: AMSAPortfolioHoldingInput[],
): number | null {
  if (!exposures.length) {
    return null;
  }

  const totalValue =
    holdings.reduce(
      (total, holding) =>
        total +
        validMarketValue(
          holding.marketValue,
        ),
      0,
    );

  if (totalValue <= 0) {
    return null;
  }

  /*
   * Herfindahl-Hirschman style concentration.
   * Higher final score means better diversification.
   */

  const sectorHhi =
    exposures.reduce(
      (total, exposure) => {
        const fraction =
          exposure.weight / 100;

        return (
          total +
          fraction ** 2
        );
      },
      0,
    );

  const holdingHhi =
    holdings.reduce(
      (total, holding) => {
        const weight =
          validMarketValue(
            holding.marketValue,
          ) / totalValue;

        return (
          total +
          weight ** 2
        );
      },
      0,
    );

  const combinedHhi =
    sectorHhi * 0.62 +
    holdingHhi * 0.38;

  /*
   * HHI near 1 = highly concentrated.
   * HHI near 0 = diversified.
   */

  return clamp(
    100 -
      combinedHhi * 125,
  );
}

export function calculateClassifiedValuePercent(
  holdings: AMSAPortfolioHoldingInput[],
): number {
  const totalValue =
    holdings.reduce(
      (total, holding) =>
        total +
        validMarketValue(
          holding.marketValue,
        ),
      0,
    );

  if (totalValue <= 0) {
    return 0;
  }

  const classifiedValue =
    holdings.reduce(
      (total, holding) => {
        if (
          !holding.sector ||
          !holding.sector.trim()
        ) {
          return total;
        }

        return (
          total +
          validMarketValue(
            holding.marketValue,
          )
        );
      },
      0,
    );

  return clamp(
    (classifiedValue /
      totalValue) *
      100,
  );
}

function validMarketValue(
  value: number,
): number {
  return isFiniteNumber(value) &&
    value > 0
    ? value
    : 0;
}
