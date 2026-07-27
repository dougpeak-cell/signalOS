import type { SigiScores } from "@/lib/intelligence/scores";
import type { VisionSector } from "@/lib/market/sectorComparison";

export type VisionRegime = "Risk-On" | "Balanced" | "Risk-Off";
export type VisionHorizon = "trader" | "swing" | "investor";

export type VisionHorizonView = {
  score: number;
  stance: "Strong" | "Constructive" | "Extended" | "Neutral" | "Cautious";
  summary: string;
};

export type VisionOpportunity = {
  symbol: string;
  company: string;
  sector: string;
  price: number | null;
  changePercent: number | null;
  relativeVolume?: number | null;
  bias: "bullish" | "bearish" | "neutral";
  scores: SigiScores;
  setupType: string;
  riskLevel: "Low" | "Medium" | "High";
  horizons: Record<VisionHorizon, VisionHorizonView>;
  reasons: string[];
  risks: string[];
  invalidation: string;
  warnings: string[];
  dataQuality: "complete" | "partial";
  updatedAt: string;
};

export type VisionRisk = {
  title: string;
  severity: "Low" | "Moderate" | "Elevated" | "High";
  explanation: string;
};

export type VisionChange = {
  type:
    | "market-health"
    | "sector-rank"
    | "new-opportunity"
    | "removed-opportunity"
    | "risk-change";
  importance: "low" | "medium" | "high";
  message: string;
};

export type VisionPortfolioHolding = {
  symbol: string;
  name: string;
  sector: string;
  weight: number;
  marketValue: number | null;
  changePercent: number | null;
  alignment: "aligned" | "watch" | "weakening";
  earningsDateLabel: string | null;
  earningsTiming: string | null;
};

export type VisionPortfolioIntelligence = {
  hasPortfolio: boolean;
  holdingsCount: number;
  classifiedHoldingsCount: number;
  classificationCoverage: number;
  sectorAnalysisAvailable: boolean;
  totalValue: number;
  topSector: string | null;
  topSectorWeight: number;
  concentrationLevel: "Low" | "Moderate" | "High";
  correlationLevel: "Low" | "Moderate" | "High";
  sensitivityLevel: "Low" | "Moderate" | "High";
  alignedHoldings: number;
  weakeningHoldings: number;
  nearbyEarningsCount: number;
  exposureSummary: string;
  concentrationSummary: string;
  sectorAlignmentSummary: string;
  riskConflictSummary: string;
  earningsSummary: string;
  correlationSummary: string;
  sensitivitySummary: string;
  sectorExposure: Array<{
    sector: string;
    weight: number;
  }>;
  topSectors: Array<{
    sector: string;
    weight: number;
  }>;
  riskConflicts: string[];
  holdings: VisionPortfolioHolding[];
};

export type VisionOverview = {
  status: "live" | "partial" | "unavailable";
  updatedAt: string;
  market: {
    health: number;
    regime: VisionRegime;
    confidence: number;
    trend: number;
    volume?: number | null;
    breadth: number;
    volatility: number;
  };
  sectors: {
    leader: string | null;
    improving: string[];
    weakening: string[];
    undervalued: string[];
    breakoutWatch: string[];
    snapshot: VisionSector[];
  };
  opportunities: VisionOpportunity[];
  risks: VisionRisk[];
  changes: VisionChange[];
  portfolio: VisionPortfolioIntelligence;
  summary: {
    headline: string;
    marketRead: string;
    opportunityRead: string;
    riskRead: string;
  };
};