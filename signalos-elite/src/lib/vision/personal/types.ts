export type PortfolioClassificationStatus =
  | "classified"
  | "partial"
  | "pending";

export type PersonalIntelligenceHolding = {
  symbol: string;
  companyName?: string | null;

  quantity?: number | null;
  currentPrice?: number | null;
  marketValue: number;
  dayChangePercent?: number | null;

  sector?: string | null;
  industry?: string | null;

  pulseScore?: number | null;
  pulseDirection?: "improving" | "weakening" | "stable" | null;

  classificationStatus: PortfolioClassificationStatus;
  classificationReason?: string | null;

  weight: number;
};

export type PortfolioCoverage = {
  totalHoldings: number;
  classifiedHoldings: number;
  partialHoldings: number;
  pendingHoldings: number;

  holdingCoveragePercent: number;
  valueCoveragePercent: number;

  isReliable: boolean;
  requiredCoveragePercent: number;
};

export type PersonalIntelligenceResult = {
  holdings: PersonalIntelligenceHolding[];
  coverage: PortfolioCoverage;

  trackedValue: number;
  dayChangePercent?: number | null;

  portfolioPulse?: number | null;
  alignmentPercent?: number | null;
  concentrationLevel?: "Low" | "Moderate" | "High" | null;

  largestExposure?: {
    sector: string;
    weight: number;
  } | null;

  message: string;
};