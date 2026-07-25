import {
  calculateMarketPulse,
} from "./market/marketPulse";

import {
  calculateSectorPulse,
  rankSectorPulses,
} from "./sector/sectorPulse";

import { calculateIndustryPulse } from "./industry/industryPulse";
import {
  calculateAlignment,
} from "./alignment/alignment";

import {
  calculatePortfolioPulse,
} from "./portfolio/portfolioPulse";

import type {
  AMSAAlignmentInput,
  AMSAAlignmentResult,
  AMSAIndustryInput,
  AMSAIndustryPulse,
  AMSAMarketPulse,
  AMSAMarketPulseInput,
  AMSAPortfolioHoldingInput,
  AMSAPortfolioPulse,
  AMSASectorInput,
  AMSASectorPulse,
} from "./types";

/* =========================================================
   AMSA CONTEXT ENGINE

   One centralized interface for Market, Sector, Industry,
   Alignment, and Portfolio intelligence.
========================================================= */

export type AMSAContextEngineInput = {
  market?: AMSAMarketPulseInput;

  sectors?: AMSASectorInput[];

  industries?: AMSAIndustryInput[];

  alignment?: AMSAAlignmentInput;

  portfolio?: AMSAPortfolioHoldingInput[];
};

export type AMSAContextEngineResult = {
  market: AMSAMarketPulse | null;

  sectors: AMSASectorPulse[];

  industries: AMSAIndustryPulse[];

  alignment: AMSAAlignmentResult | null;

  portfolio: AMSAPortfolioPulse | null;

  calculatedAt: string;
};

export function calculateAMSAContext(
  input: AMSAContextEngineInput,
): AMSAContextEngineResult {
  const market =
    input.market
      ? calculateMarketPulse(
          input.market,
        )
      : null;

  const sectors =
    rankSectorPulses(
      (input.sectors ?? []).map(
        (sector) =>
          calculateSectorPulse({
            ...sector,

            marketPulse:
              sector.marketPulse ??
              market?.score ??
              null,
          }),
      ),
    );

  const industries =
    (input.industries ?? []).map(
      (industry) => {
        const matchingSector =
          sectors.find(
            (sector) =>
              sector.sector ===
              industry.sector,
          );

        return calculateIndustryPulse({
          ...industry,

          sectorPulse:
            industry.sectorPulse ??
            matchingSector?.score ??
            null,

          marketPulse:
            industry.marketPulse ??
            market?.score ??
            null,
        });
      },
    );

  const alignment =
    input.alignment
      ? calculateAlignment({
          ...input.alignment,

          marketPulse:
            input.alignment
              .marketPulse ??
            market?.score ??
            null,
        })
      : null;

  const portfolio =
    input.portfolio
      ? calculatePortfolioPulse(
          input.portfolio.map(
            (holding) => ({
              ...holding,

              marketPulse:
                holding.marketPulse ??
                market?.score ??
                null,

              sectorPulse:
                holding.sectorPulse ??
                sectors.find(
                  (sector) =>
                    sector.sector ===
                    holding.sector,
                )?.score ??
                null,

              industryPulse:
                holding.industryPulse ??
                industries.find(
                  (industry) =>
                    industry.industry ===
                    holding.industry,
                )?.score ??
                null,
            }),
          ),
        )
      : null;

  return {
    market,
    sectors,
    industries,
    alignment,
    portfolio,

    calculatedAt:
      new Date().toISOString(),
  };
}
