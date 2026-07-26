import { NextResponse } from "next/server";
import { getHistoryBars, type HistoryBar } from "@/lib/market/historyBars";
import {
  buildSectorComparisonData,
  type SectorComparisonRow,
} from "@/lib/market/sectorComparison";
import { fetchServerQuoteMap } from "@/lib/market/serverQuote";
import {
  calculateMarketHealth,
  getMarketRegime,
} from "@/lib/intelligence/market-health";
import { qualifiesForVision } from "@/lib/intelligence/opportunity-filter";
import {
  calculateSigiScores,
  type ScoreInputs,
} from "@/lib/intelligence/scores";
import {
  buildVisionSummary,
} from "@/lib/intelligence/vision-summary";
import { buildVisionHorizonViews } from "@/lib/intelligence/visionHorizons";
import { buildVisionPortfolioIntelligence } from "@/lib/intelligence/visionPortfolio";
import { getStoredMarketContext } from "@/lib/intelligence/contextStore";
import { buildPersonalIntelligence } from "@/lib/vision/personal/buildPersonalIntelligence";
import { classifyPortfolioHoldings } from "@/lib/vision/personal/classifyPortfolioHoldings";
import { resolvePortfolioClassification } from "@/lib/vision/personal/resolvePortfolioClassification";
import type { PersonalIntelligenceResult } from "@/lib/vision/personal/types";
import type { PortfolioItem } from "@/lib/intelligence/buildMarketIntel";
import type {
  VisionChange,
  VisionOpportunity,
  VisionOverview,
  VisionRegime,
  VisionRisk,
} from "@/lib/intelligence/visionOverview";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getSetupDiscoveryData } from "@/lib/today/setupDiscoveryData";
import type {
  RankedSetupItem,
  SetupDiscoveryCandidate,
} from "@/lib/today/setupDiscovery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type VisionSnapshotRecord = {
  id: number;
  fingerprint: string;
  snapshot: VisionOverview;
  created_at: string;
};

const CHANGE_IMPORTANCE_WEIGHT: Record<VisionChange["importance"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const RISK_SEVERITY_WEIGHT: Record<VisionRisk["severity"], number> = {
  High: 4,
  Elevated: 3,
  Moderate: 2,
  Low: 1,
};

const BREAKOUT_STAGE_WEIGHT: Record<string, number> = {
  "No Signal": 0,
  "Early Rotation": 1,
  "Breakout Watch": 2,
  "Breakout Active": 3,
};

type ApiDataStatus = "live" | "partial" | "unavailable";
type ApiDirection = "rising" | "falling" | "stable";
type ApiPulseState =
  | "Elite"
  | "Strong"
  | "Constructive"
  | "Balanced"
  | "Weak"
  | "Critical";
type ApiRiskLevel = "Low" | "Moderate" | "Elevated" | "High";

type ApiPulseComponent = {
  key: string;
  label: string;
  score: number | null;
  direction?: ApiDirection;
  explanation?: string;
};

type ApiPulseReading = {
  score: number | null;
  previousScore?: number | null;
  state: ApiPulseState | null;
  direction: ApiDirection | null;
  confidence: number | null;
  stability?: number | null;
  alignment?: number | null;
  calculatedAt?: string | null;
  updatedAt?: string | null;
  components?: ApiPulseComponent[];
  reasons?: string[];
  risks?: string[];
  invalidation?: string | null;
};

type ApiMarketPulse = ApiPulseReading & {
  regime?: VisionRegime | null;
  breadth?: number | null;
  volatility?: number | null;
};

type ApiSectorPulse = ApiPulseReading & {
  sector: string;
  symbol: string;
  today: number | null;
  week: number | null;
  month: number | null;
  year: number | null;
  rank: number | null;
  previousRank?: number | null;
  valuationState?: string | null;
  breakoutState?: string | null;
};

type ApiStockPulse = ApiPulseReading & {
  symbol: string;
  company?: string | null;
  sector?: string | null;
  price: number | null;
  changePercent: number | null;
  opportunityScore?: number | null;
  riskScore?: number | null;
};

type ApiPortfolioPulse = ApiPulseReading & {
  trackedValue?: number | null;
  dayChangePercent?: number | null;
  classificationCoverage?: number | null;
  largestSector?: string | null;
  largestSectorWeight?: number | null;
  alignedHoldings?: number | null;
  totalHoldings?: number | null;
  concentrationLevel?: ApiRiskLevel | null;
  sectorExposure?: {
    sector: string;
    weight: number;
  }[];
  topHoldings?: {
    symbol: string;
    weight: number;
    sector?: string | null;
    pulse?: number | null;
    direction?: ApiDirection | null;
  }[];
  conflicts?: string[];
};

type ApiWatchlistPulseChange = {
  symbol: string;
  company?: string | null;
  pulse: number | null;
  previousPulse: number | null;
  change: number | null;
  direction: ApiDirection | null;
  reason?: string | null;
};

type ApiVisionChange = {
  id: string;
  message: string;
  importance: VisionChange["importance"];
  category: "market" | "sector" | "stock" | "portfolio" | "risk" | "data";
};

type ApiFutureScenario = {
  name: "Bull" | "Base" | "Bear";
  probability: number | null;
  priceLow?: number | null;
  priceHigh?: number | null;
  conditions: string[];
};

type ApiFutureMap = {
  symbol: string;
  horizonDays: number;
  currentDirection: "Bullish" | "Neutral" | "Bearish" | null;
  confidence: number | null;
  mostImportantVariable?: string | null;
  invalidation?: string | null;
  scenarios: ApiFutureScenario[];
};

type ApiLesson = {
  title: string;
  explanation: string;
  example?: string | null;
};

type ApiVisionOverview = {
  status: ApiDataStatus;
  updatedAt: string | null;
  marketOpen?: boolean | null;
  marketPulse: ApiMarketPulse | null;
  sectors: ApiSectorPulse[];
  stocks: ApiStockPulse[];
  portfolioPulse: ApiPortfolioPulse | null;
  watchlistChanges: ApiWatchlistPulseChange[];
  changes: ApiVisionChange[];
  futureMap: ApiFutureMap | null;
  intelligence: {
    headline?: string | null;
    summary?: string | null;
    opportunity?: string | null;
    risk?: string | null;
  } | null;
  personalIntelligence: PersonalIntelligenceResult;
  lesson: ApiLesson | null;
};

type ClassifiedPortfolioHolding = PortfolioItem & {
  symbol: string;
  companyName?: string | null;
  industry?: string | null;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function pulseStateFromScore(score: number | null): ApiPulseState | null {
  if (!Number.isFinite(score)) return null;
  if (Number(score) >= 90) return "Elite";
  if (Number(score) >= 80) return "Strong";
  if (Number(score) >= 68) return "Constructive";
  if (Number(score) >= 48) return "Balanced";
  if (Number(score) >= 30) return "Weak";
  return "Critical";
}

function directionFromDelta(value: number | null | undefined): ApiDirection | null {
  if (!Number.isFinite(value)) return null;
  if (Number(value) > 0.25) return "rising";
  if (Number(value) < -0.25) return "falling";
  return "stable";
}

function directionFromScores(current: number | null | undefined, previous: number | null | undefined) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return null;
  }

  return directionFromDelta(Number(current) - Number(previous));
}

function getAverage(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => Number.isFinite(value));

  if (!valid.length) {
    return null;
  }

  return clampScore(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function toApiRiskLevel(level: string | null | undefined, elevated = false): ApiRiskLevel | null {
  if (level === "High") return "High";
  if (level === "Moderate") return elevated ? "Elevated" : "Moderate";
  if (level === "Low") return "Low";
  return null;
}

function toChangeCategory(type: VisionChange["type"]): ApiVisionChange["category"] {
  if (type === "sector-rank") return "sector";
  if (type === "new-opportunity" || type === "removed-opportunity") return "stock";
  if (type === "risk-change") return "risk";
  return "market";
}

function buildMarketPulse(
  snapshot: VisionOverview,
  previousSnapshot: VisionOverview | null,
  updatedAt: string
): ApiMarketPulse {
  const previousScore = previousSnapshot?.market.health ?? null;
  const sectorAlignment = getAverage(snapshot.sectors.snapshot.slice(0, 3).map((sector) => sector.score));

  return {
    score: snapshot.market.health,
    previousScore,
    state: pulseStateFromScore(snapshot.market.health),
    direction: directionFromScores(snapshot.market.health, previousScore),
    confidence: snapshot.market.confidence,
    stability: getAverage([snapshot.market.trend, snapshot.market.volatility]),
    alignment: getAverage([snapshot.market.breadth, sectorAlignment]),
    calculatedAt: updatedAt,
    updatedAt,
    regime: snapshot.market.regime,
    breadth: snapshot.market.breadth,
    volatility: snapshot.market.volatility,
    components: [
      {
        key: "trend",
        label: "Trend",
        score: snapshot.market.trend,
        direction: directionFromDelta(snapshot.market.trend - 50) ?? undefined,
        explanation: "Major index trend strength is derived from SPY, QQQ, and IWM movement.",
      },
      {
        key: "volume",
        label: "Volume",
        score: null,
        explanation: "A dedicated unified volume component is not connected to Vision Overview yet.",
      },
      {
        key: "breadth",
        label: "Participation",
        score: snapshot.market.breadth,
        direction: directionFromDelta(snapshot.market.breadth - 50) ?? undefined,
        explanation: "Breadth reflects how many qualified candidates and sectors are participating.",
      },
      {
        key: "structure",
        label: "Structure",
        score: snapshot.market.health,
        direction: directionFromScores(snapshot.market.health, previousScore) ?? undefined,
        explanation: "Overall market structure combines trend, breadth, sector participation, and volatility.",
      },
      {
        key: "sector",
        label: "Sector Alignment",
        score: sectorAlignment,
        direction: directionFromDelta((sectorAlignment ?? 50) - 50) ?? undefined,
        explanation: "Alignment reflects whether the strongest sectors confirm the broader market read.",
      },
      {
        key: "risk",
        label: "Risk Control",
        score: snapshot.market.volatility,
        direction: directionFromDelta(snapshot.market.volatility - 50) ?? undefined,
        explanation: "Higher scores indicate calmer volatility conditions and better risk control.",
      },
    ],
    reasons: [
      snapshot.sectors.leader ? `${snapshot.sectors.leader} is currently leading sector rotation.` : null,
      snapshot.sectors.improving[0]
        ? `${snapshot.sectors.improving[0]} is showing improving participation.`
        : null,
      snapshot.summary.marketRead,
    ].filter((value): value is string => Boolean(value)),
    risks: snapshot.risks.map((risk) => risk.explanation).slice(0, 3),
    invalidation: snapshot.risks[0]?.explanation ?? null,
  };
}

function buildSectorPulses(snapshot: VisionOverview, previousSnapshot: VisionOverview | null, updatedAt: string) {
  const previousSectorRanks = previousSnapshot ? getSectorRankMap(previousSnapshot) : new Map();

  return snapshot.sectors.snapshot.map((sector, index): ApiSectorPulse => {
    const previousSector = previousSectorRanks.get(sector.sector);

    return {
      sector: sector.sector,
      symbol: sector.symbol,
      today: sector.today,
      week: sector.week,
      month: sector.month,
      year: sector.year,
      rank: index + 1,
      previousRank: previousSector?.rank ?? null,
      valuationState: sector.valuation ?? null,
      breakoutState: sector.breakout ?? null,
      score: sector.score,
      previousScore: previousSector?.score ?? null,
      state: pulseStateFromScore(sector.score),
      direction:
        directionFromScores(sector.score, previousSector?.score ?? null) ??
        directionFromDelta(sector.today),
      confidence: snapshot.market.confidence,
      stability: getAverage([sector.week, sector.month, sector.year]),
      alignment: getAverage([sector.score, snapshot.market.health]),
      calculatedAt: updatedAt,
      updatedAt,
    };
  });
}

function buildStockPulses(snapshot: VisionOverview, previousSnapshot: VisionOverview | null, updatedAt: string) {
  const previousOpportunities = new Map(
    (previousSnapshot?.opportunities ?? []).map((opportunity) => [opportunity.symbol, opportunity])
  );

  return snapshot.opportunities.map((opportunity): ApiStockPulse => {
    const previousOpportunity = previousOpportunities.get(opportunity.symbol);

    return {
      symbol: opportunity.symbol,
      company: opportunity.company,
      sector: opportunity.sector,
      price: opportunity.price,
      changePercent: opportunity.changePercent,
      opportunityScore: opportunity.scores.opportunity,
      riskScore: opportunity.scores.risk,
      score: opportunity.scores.opportunity,
      previousScore: previousOpportunity?.scores.opportunity ?? null,
      state: pulseStateFromScore(opportunity.scores.opportunity),
      direction:
        directionFromScores(
          opportunity.scores.opportunity,
          previousOpportunity?.scores.opportunity ?? null,
        ) ?? directionFromDelta(opportunity.changePercent),
      confidence: opportunity.scores.confidence,
      stability: getAverage([
        opportunity.horizons.trader.score,
        opportunity.horizons.swing.score,
        opportunity.horizons.investor.score,
      ]),
      alignment: getAverage([
        opportunity.scores.momentum,
        opportunity.scores.opportunity,
        snapshot.market.health,
      ]),
      calculatedAt: updatedAt,
      updatedAt,
      reasons: opportunity.reasons,
      risks: opportunity.risks,
      invalidation: opportunity.invalidation,
    };
  });
}

function getPortfolioScore(portfolio: VisionOverview["portfolio"]) {
  if (!portfolio.hasPortfolio || !portfolio.sectorAnalysisAvailable) {
    return null;
  }

  const alignmentScore =
    portfolio.holdingsCount > 0
      ? (portfolio.alignedHoldings / portfolio.holdingsCount) * 100
      : 0;
  const concentrationScore =
    portfolio.concentrationLevel === "Low"
      ? 85
      : portfolio.concentrationLevel === "Moderate"
        ? 65
        : 40;

  return clampScore(
    portfolio.classificationCoverage * 0.25 +
      alignmentScore * 0.45 +
      concentrationScore * 0.3,
  );
}

function getPortfolioDayChangePercent(portfolio: VisionOverview["portfolio"]) {
  const weightedMoves = portfolio.holdings
    .filter(
      (holding) =>
        Number.isFinite(holding.weight) && Number.isFinite(holding.changePercent),
    )
    .map((holding) => ({
      weight: holding.weight,
      changePercent: Number(holding.changePercent),
    }));

  if (!weightedMoves.length) {
    return null;
  }

  const totalWeight = weightedMoves.reduce((sum, item) => sum + item.weight, 0);

  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return null;
  }

  return weightedMoves.reduce((sum, item) => sum + item.changePercent * item.weight, 0) / totalWeight;
}

function buildPortfolioPulse(
  snapshot: VisionOverview,
  previousSnapshot: VisionOverview | null,
  opportunityMap: Map<string, ApiStockPulse>,
  updatedAt: string,
): ApiPortfolioPulse | null {
  const portfolio = snapshot.portfolio;

  if (!portfolio.hasPortfolio) {
    return null;
  }

  const score = getPortfolioScore(portfolio);
  const previousScore = previousSnapshot ? getPortfolioScore(previousSnapshot.portfolio) : null;
  const elevatedConcentration = portfolio.topSectorWeight >= 35 && portfolio.concentrationLevel === "Moderate";

  return {
    score,
    previousScore,
    state: pulseStateFromScore(score),
    direction: directionFromScores(score, previousScore),
    confidence: clampScore(portfolio.classificationCoverage),
    stability: getAverage([
      score,
      previousScore,
      snapshot.market.health,
    ]),
    alignment:
      portfolio.holdingsCount > 0
        ? clampScore((portfolio.alignedHoldings / portfolio.holdingsCount) * 100)
        : null,
    calculatedAt: updatedAt,
    updatedAt,
    trackedValue: portfolio.totalValue,
    dayChangePercent: getPortfolioDayChangePercent(portfolio),
    classificationCoverage: clampScore(portfolio.classificationCoverage),
    largestSector: portfolio.topSector,
    largestSectorWeight: portfolio.topSectorWeight,
    alignedHoldings: portfolio.alignedHoldings,
    totalHoldings: portfolio.holdingsCount,
    concentrationLevel: toApiRiskLevel(portfolio.concentrationLevel, elevatedConcentration),
    sectorExposure: portfolio.sectorExposure,
    topHoldings: portfolio.holdings.slice(0, 8).map((holding) => ({
      symbol: holding.symbol,
      weight: holding.weight,
      sector: holding.sector,
      pulse: opportunityMap.get(holding.symbol)?.score ?? null,
      direction:
        directionFromDelta(holding.changePercent) ??
        (holding.alignment === "aligned"
          ? "rising"
          : holding.alignment === "weakening"
            ? "falling"
            : "stable"),
    })),
    conflicts: portfolio.riskConflicts,
    risks: [
      portfolio.riskConflictSummary,
      portfolio.concentrationSummary,
      portfolio.correlationSummary,
    ].filter((value): value is string => Boolean(value)),
    invalidation: portfolio.riskConflicts[0] ?? null,
  };
}

function buildApiChanges(changes: VisionChange[]): ApiVisionChange[] {
  return changes.map((change, index) => ({
    id: `${change.type}-${index + 1}`,
    message: change.message,
    importance: change.importance,
    category: toChangeCategory(change.type),
  }));
}

function buildApiVisionOverview(
  snapshot: VisionOverview,
  previousSnapshot: VisionOverview | null,
  personalIntelligence: PersonalIntelligenceResult,
): ApiVisionOverview {
  const marketPulse = buildMarketPulse(snapshot, previousSnapshot, snapshot.updatedAt);
  const sectors = buildSectorPulses(snapshot, previousSnapshot, snapshot.updatedAt);
  const stocks = buildStockPulses(snapshot, previousSnapshot, snapshot.updatedAt);
  const stockMap = new Map(stocks.map((stock) => [stock.symbol, stock]));

  return {
    status: snapshot.status,
    updatedAt:
      marketPulse?.calculatedAt ??
      marketPulse?.updatedAt ??
      snapshot.updatedAt,
    marketOpen: null,
    marketPulse,
    sectors,
    stocks,
    portfolioPulse: buildPortfolioPulse(snapshot, previousSnapshot, stockMap, snapshot.updatedAt),
    watchlistChanges: [],
    changes: buildApiChanges(snapshot.changes),
    futureMap: null,
    intelligence: {
      headline: snapshot.summary.headline,
      summary: snapshot.summary.marketRead,
      opportunity: snapshot.summary.opportunityRead,
      risk: snapshot.summary.riskRead,
    },
    personalIntelligence,
    lesson: null,
  };
}

function canPersistVisionSnapshots() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeTicker(value: string) {
  return String(value ?? "").trim().toUpperCase();
}

function getSectorRankMap(snapshot: VisionOverview) {
  return new Map(
    snapshot.sectors.snapshot.map((sector, index) => [sector.sector, { ...sector, rank: index + 1 }])
  );
}

function getSnapshotFingerprint(snapshot: VisionOverview) {
  return JSON.stringify({
    status: snapshot.status,
    market: snapshot.market,
    sectors: snapshot.sectors.snapshot.map((sector, index) => ({
      sector: sector.sector,
      rank: index + 1,
      score: sector.score,
      breakout: sector.breakout,
    })),
    opportunities: snapshot.opportunities.map((opportunity, index) => ({
      symbol: opportunity.symbol,
      rank: index + 1,
      opportunityScore: opportunity.scores.opportunity,
      confidence: opportunity.scores.confidence,
      risk: opportunity.scores.risk,
    })),
    risks: snapshot.risks.map((risk) => ({
      title: risk.title,
      severity: risk.severity,
    })),
    portfolio: {
      hasPortfolio: snapshot.portfolio.hasPortfolio,
      holdingsCount: snapshot.portfolio.holdingsCount,
      topSector: snapshot.portfolio.topSector,
      topSectorWeight: snapshot.portfolio.topSectorWeight,
      concentrationLevel: snapshot.portfolio.concentrationLevel,
    },
  });
}

function toChangeImportance(magnitude: number): VisionChange["importance"] {
  if (magnitude >= 10) return "high";
  if (magnitude >= 5) return "medium";
  return "low";
}

function sortChanges(changes: VisionChange[]) {
  return [...changes].sort((left, right) => {
    const importanceDelta =
      CHANGE_IMPORTANCE_WEIGHT[right.importance] - CHANGE_IMPORTANCE_WEIGHT[left.importance];

    if (importanceDelta !== 0) {
      return importanceDelta;
    }

    return left.message.localeCompare(right.message);
  });
}

function getPrimaryRisk(snapshot: VisionOverview) {
  return [...snapshot.risks].sort(
    (left, right) => RISK_SEVERITY_WEIGHT[right.severity] - RISK_SEVERITY_WEIGHT[left.severity]
  )[0] ?? null;
}

function buildVisionChanges(
  previousSnapshot: VisionOverview | null,
  currentSnapshot: VisionOverview
): VisionChange[] {
  if (!previousSnapshot) {
    return [];
  }

  const changes: VisionChange[] = [];
  const marketHealthDelta = currentSnapshot.market.health - previousSnapshot.market.health;

  if (Math.abs(marketHealthDelta) >= 3) {
    changes.push({
      type: "market-health",
      importance: toChangeImportance(Math.abs(marketHealthDelta)),
      message: `Market Health ${marketHealthDelta > 0 ? "improved" : "declined"} from ${previousSnapshot.market.health} to ${currentSnapshot.market.health}.`,
    });
  }

  const breadthDelta = currentSnapshot.market.breadth - previousSnapshot.market.breadth;

  if (Math.abs(breadthDelta) >= 5) {
    changes.push({
      type: "market-health",
      importance: toChangeImportance(Math.abs(breadthDelta)),
      message: `Market breadth ${breadthDelta > 0 ? "improved" : "weakened"} by ${Math.abs(breadthDelta)} points.`,
    });
  }

  if (currentSnapshot.market.regime !== previousSnapshot.market.regime) {
    changes.push({
      type: "market-health",
      importance: "high",
      message: `Market regime changed from ${previousSnapshot.market.regime} to ${currentSnapshot.market.regime}.`,
    });
  }

  const previousSectorRanks = getSectorRankMap(previousSnapshot);
  const currentSectorRanks = getSectorRankMap(currentSnapshot);

  for (const [sectorName, currentSector] of currentSectorRanks.entries()) {
    const previousSector = previousSectorRanks.get(sectorName);

    if (!previousSector) {
      continue;
    }

    const rankShift = previousSector.rank - currentSector.rank;

    if (Math.abs(rankShift) >= 2 && currentSector.rank <= 6) {
      changes.push({
        type: "sector-rank",
        importance: toChangeImportance(Math.abs(rankShift) * 3),
        message:
          rankShift > 0
            ? `${sectorName} improved from #${previousSector.rank} to #${currentSector.rank}.`
            : `${sectorName} fell from #${previousSector.rank} to #${currentSector.rank}.`,
      });
    }

    const previousBreakoutWeight = BREAKOUT_STAGE_WEIGHT[previousSector.breakout] ?? 0;
    const currentBreakoutWeight = BREAKOUT_STAGE_WEIGHT[currentSector.breakout] ?? 0;

    if (currentBreakoutWeight > previousBreakoutWeight) {
      changes.push({
        type: "sector-rank",
        importance: currentBreakoutWeight >= 2 ? "medium" : "low",
        message:
          currentSector.breakout === "Early Rotation"
            ? `${sectorName} entered Early Rotation.`
            : `${sectorName} moved onto ${currentSector.breakout}.`,
      });
    }
  }

  const previousOpportunities = new Map(
    previousSnapshot.opportunities.map((opportunity, index) => [opportunity.symbol, index + 1])
  );
  const currentOpportunities = new Map(
    currentSnapshot.opportunities.map((opportunity, index) => [opportunity.symbol, index + 1])
  );

  for (const opportunity of currentSnapshot.opportunities) {
    if (!previousOpportunities.has(opportunity.symbol)) {
      changes.push({
        type: "new-opportunity",
        importance: (currentOpportunities.get(opportunity.symbol) ?? 6) <= 2 ? "high" : "medium",
        message: `${opportunity.symbol} entered the top-five opportunity list.`,
      });
    }
  }

  for (const opportunity of previousSnapshot.opportunities) {
    if (!currentOpportunities.has(opportunity.symbol)) {
      changes.push({
        type: "removed-opportunity",
        importance: (previousOpportunities.get(opportunity.symbol) ?? 6) <= 2 ? "medium" : "low",
        message: `${opportunity.symbol} dropped out of the top-five opportunity list.`,
      });
    }
  }

  const previousPrimaryRisk = getPrimaryRisk(previousSnapshot);
  const currentPrimaryRisk = getPrimaryRisk(currentSnapshot);

  if (previousPrimaryRisk && currentPrimaryRisk) {
    if (previousPrimaryRisk.severity !== currentPrimaryRisk.severity) {
      changes.push({
        type: "risk-change",
        importance: "high",
        message: `Risk changed from ${previousPrimaryRisk.severity} to ${currentPrimaryRisk.severity}.`,
      });
    } else if (previousPrimaryRisk.title !== currentPrimaryRisk.title) {
      changes.push({
        type: "risk-change",
        importance: "medium",
        message: `Primary risk shifted from ${previousPrimaryRisk.title} to ${currentPrimaryRisk.title}.`,
      });
    }
  }

  return sortChanges(changes).slice(0, 6);
}

async function getLatestVisionSnapshot(): Promise<VisionSnapshotRecord | null> {
  if (!canPersistVisionSnapshots()) {
    return null;
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("vision_snapshots")
      .select("id, fingerprint, snapshot, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.snapshot) {
      return null;
    }

    return data as VisionSnapshotRecord;
  } catch (error) {
    console.error("Vision snapshot load failed", error);
    return null;
  }
}

async function persistVisionSnapshot(snapshot: VisionOverview, fingerprint: string) {
  if (!canPersistVisionSnapshots()) {
    return;
  }

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("vision_snapshots").insert({
      snapshot: {
        ...snapshot,
        changes: [],
      },
      fingerprint,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Vision snapshot persist failed", error);
  }
}

function scoreTrendFromChangePercent(changePercent: number | null | undefined) {
  if (typeof changePercent !== "number" || !Number.isFinite(changePercent)) {
    return 50;
  }

  return clampScore(50 + changePercent * 12);
}

function scoreVolatility(vixPrice: number | null | undefined, vixChange: number | null | undefined) {
  const base =
    typeof vixPrice === "number" && Number.isFinite(vixPrice)
      ? clampScore(100 - Math.max(0, (vixPrice - 12) * 5))
      : 50;

  const changeAdjustment =
    typeof vixChange === "number" && Number.isFinite(vixChange)
      ? clampScore(base - vixChange * 3)
      : base;

  return clampScore(changeAdjustment);
}

function calculateMarketConfidence(input: {
  trend: number;
  breadth: number;
  volatility: number;
  sectorsPositive: number;
}) {
  const signals = [
    input.trend >= 60,
    input.breadth >= 55,
    input.volatility >= 55,
    input.sectorsPositive >= 55,
  ];

  const agreement = signals.filter(Boolean).length / signals.length;
  return clampScore(40 + agreement * 60);
}

function getCloseOnOrBefore(bars: HistoryBar[], target: Date): number | null {
  const targetTime = target.getTime();

  for (let index = bars.length - 1; index >= 0; index -= 1) {
    const barTime = new Date(`${bars[index].date}T00:00:00Z`).getTime();

    if (barTime <= targetTime) {
      return bars[index].close;
    }
  }

  return bars[0]?.close ?? null;
}

function shiftDays(base: Date, days: number) {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() - days);
  return next;
}

function computePercentDelta(current: number | null, baseline: number | null): number {
  if (
    current == null ||
    baseline == null ||
    !Number.isFinite(current) ||
    !Number.isFinite(baseline) ||
    baseline <= 0
  ) {
    return 0;
  }

  return ((current - baseline) / baseline) * 100;
}

function computeDrawdownPercent(current: number | null, bars: HistoryBar[]) {
  if (current == null || !Number.isFinite(current) || current <= 0 || !bars.length) {
    return 0;
  }

  const highestHigh = bars.reduce((highest, bar) => Math.max(highest, bar.high), 0);

  if (!Number.isFinite(highestHigh) || highestHigh <= 0) {
    return 0;
  }

  return ((highestHigh - current) / highestHigh) * 100;
}

function isEligibleOpportunity(stock: {
  symbol?: string;
  price?: number | null;
  changePercent?: number | null;
  volume?: number | null;
  securityType?: string;
  isWarrant?: boolean;
  isRights?: boolean;
  isPreferred?: boolean;
  isUnit?: boolean;
}) {
  if (!stock.symbol) return false;
  if (!Number.isFinite(stock.price) || Number(stock.price) <= 1) return false;
  if (!Number.isFinite(stock.volume) || Number(stock.volume) <= 0) return false;

  if (
    Number.isFinite(stock.changePercent) &&
    Math.abs(Number(stock.changePercent)) > 35
  ) {
    return false;
  }

  if (stock.isWarrant || stock.isRights || stock.isPreferred || stock.isUnit) {
    return false;
  }

  const blockedTypes = ["warrant", "right", "preferred", "unit"];
  const type = stock.securityType?.toLowerCase() ?? "";

  return !blockedTypes.some((blocked) => type.includes(blocked));
}

function meetsConvictionGate(
  item: RankedSetupItem,
  candidate: SetupDiscoveryCandidate | undefined
) {
  if (!candidate) {
    return false;
  }

  const rvol = candidate.rvol ?? item.rvol ?? 0;
  const avgVolume = candidate.avgVolume ?? item.avgVolume ?? 0;
  const volume = candidate.volume ?? item.volume ?? 0;

  return (
    item.bias === "bullish" &&
    item.score >= 60 &&
    item.trendAlignmentScore >= 65 &&
    item.liquidityScore >= 55 &&
    item.rvolScore >= 50 &&
    volume >= 500_000 &&
    avgVolume >= 100_000 &&
    rvol >= 1.2 &&
    !candidate.spreadTooWide &&
    !candidate.volumeLooksBroken
  );
}

function getRiskLevel(riskScore: number): "Low" | "Medium" | "High" {
  if (riskScore < 40) return "Low";
  if (riskScore < 70) return "Medium";
  return "High";
}

function buildOpportunityReasons(item: RankedSetupItem): string[] {
  const setupReasons = item.whyThisSetup
    .split(/•/g)
    .map((value) => value.trim())
    .filter(Boolean);

  return [...setupReasons, item.shortReasonTag, item.catalystLabel]
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function buildSupportingReasons(
  item: RankedSetupItem,
  candidate: SetupDiscoveryCandidate,
  context: {
    sectorName: string;
    sectorStrength: number;
    changeWeek: number;
    changeMonth: number;
  }
): string[] {
  const reasons: string[] = [];

  if (context.sectorStrength >= 70) {
    reasons.push(`${context.sectorName} is a leading sector.`);
  } else if (context.sectorStrength >= 55) {
    reasons.push(`${context.sectorName} is showing improving participation.`);
  }

  if (item.trendAlignmentScore >= 75) {
    reasons.push("Price is holding above its short-term trend structure.");
  } else if (item.trendAlignmentScore >= 65) {
    reasons.push("Trend strength remains constructive.");
  }

  if ((candidate.rvol ?? item.rvol ?? 0) >= 1.2) {
    reasons.push("Relative volume is above normal.");
  }

  if (candidate.hasAnalystAction) {
    reasons.push("Analyst support has improved.");
  }

  if (candidate.hasEarnings) {
    reasons.push("Earnings quality is supportive.");
  }

  if (context.changeWeek > 0 && context.changeMonth > 0) {
    reasons.push("The stock is strengthening across weekly and monthly timeframes.");
  }

  return [...reasons, ...buildOpportunityReasons(item)].filter(Boolean).slice(0, 4);
}

function buildOpportunityWarnings(candidate: SetupDiscoveryCandidate, item: RankedSetupItem): string[] {
  const warnings: string[] = [];

  if (candidate.spreadTooWide) warnings.push("Wide spread requires tighter execution.");
  if (candidate.volumeLooksBroken) warnings.push("Volume needs confirmation before acting.");
  if (candidate.newsIsStale) warnings.push("Catalyst freshness may be fading.");
  if ((candidate.rvol ?? 0) < 1.2) warnings.push("Relative volume is still modest.");
  if (item.bias === "bearish") warnings.push("Current bias remains bearish.");

  return warnings.slice(0, 2);
}

function buildOpportunityRisks(
  item: RankedSetupItem,
  candidate: SetupDiscoveryCandidate,
  context: {
    drawdown: number;
    sectorStrength: number;
  }
): string[] {
  const risks: string[] = [];

  if (context.drawdown > 20) {
    risks.push("The stock is still well below its recent high, so failed follow-through remains a risk.");
  }

  if (Math.abs(item.changePercent ?? 0) > 8) {
    risks.push("The recent move is extended enough that entries need disciplined risk control.");
  }

  if (candidate.spreadTooWide) {
    risks.push("Spread conditions can weaken execution quality.");
  }

  if (candidate.volumeLooksBroken) {
    risks.push("Volume quality is not fully confirmed.");
  }

  if (context.sectorStrength < 55) {
    risks.push("Sector support is not strong enough to fully back the setup.");
  }

  return [...risks, ...buildOpportunityWarnings(candidate, item)].filter(Boolean).slice(0, 3);
}

function buildInvalidation(
  item: RankedSetupItem,
  context: {
    changeWeek: number;
    changeMonth: number;
  }
) {
  if (item.trendAlignmentScore >= 75) {
    return "Momentum weakens if price loses its short-term trend structure and relative volume fades.";
  }

  if (context.changeWeek <= 0 || context.changeMonth <= 0) {
    return "The read breaks down if the recent bounce fails to turn into sustained multi-timeframe strength.";
  }

  return "The read weakens if trend alignment slips and confirmation volume stops improving.";
}

function getDataQuality(candidate: SetupDiscoveryCandidate): "complete" | "partial" {
  const hasCompleteCoreFields =
    Number.isFinite(candidate.price) &&
    Number.isFinite(candidate.changePercent) &&
    Number.isFinite(candidate.volume) &&
    Number.isFinite(candidate.avgVolume) &&
    Number.isFinite(candidate.marketCap);

  return hasCompleteCoreFields ? "complete" : "partial";
}

function buildVisionOpportunity(
  item: RankedSetupItem,
  candidate: SetupDiscoveryCandidate,
  updatedAt: string,
  context: {
    changeWeek: number;
    changeMonth: number;
    sectorStrength: number;
    drawdown: number;
  }
): VisionOpportunity {
  const scoreInputs: ScoreInputs = {
    changeToday: toNumber(item.changePercent),
    changeWeek: context.changeWeek,
    changeMonth: context.changeMonth,
    relativeVolume: toNumber(candidate.rvol ?? item.rvol, 0),
    trendStrength: item.trendAlignmentScore,
    sectorStrength: context.sectorStrength,
    earningsQuality: candidate.hasEarnings ? 75 : 50,
    analystSupport: candidate.hasAnalystAction ? 72 : 50,
    volatility:
      Math.abs(toNumber(item.changePercent)) * 2 +
      (candidate.spreadTooWide ? 18 : 0) +
      (candidate.volumeLooksBroken ? 24 : 0),
    drawdown: context.drawdown,
  };
  const scores = calculateSigiScores(scoreInputs);
  const horizons = buildVisionHorizonViews(scoreInputs);
  const sectorName = item.sector ?? "This sector";

  return {
    symbol: item.ticker,
    company: item.name,
    sector: item.sector ?? "Unclassified",
    price: item.price,
    changePercent: item.changePercent,
    bias: item.bias,
    scores,
    setupType: item.structureLabel,
    riskLevel: getRiskLevel(scores.risk),
    horizons,
    reasons: buildSupportingReasons(item, candidate, {
      sectorName,
      sectorStrength: context.sectorStrength,
      changeWeek: context.changeWeek,
      changeMonth: context.changeMonth,
    }),
    risks: buildOpportunityRisks(item, candidate, {
      drawdown: context.drawdown,
      sectorStrength: context.sectorStrength,
    }),
    invalidation: buildInvalidation(item, {
      changeWeek: context.changeWeek,
      changeMonth: context.changeMonth,
    }),
    warnings: buildOpportunityWarnings(candidate, item),
    dataQuality: getDataQuality(candidate),
    updatedAt,
  };
}

function buildRisks({
  market,
  sectors,
  opportunities,
}: {
  market: VisionOverview["market"];
  sectors: VisionOverview["sectors"];
  opportunities: VisionOpportunity[];
}): VisionRisk[] {
  const risks: VisionRisk[] = [];

  if (market.breadth < 35) {
    risks.push({
      title: "Weak breadth",
      severity: "Elevated",
      explanation: "Participation is thin, which makes the current market read easier to break if leadership fades.",
    });
  }

  if (market.volatility < 45) {
    risks.push({
      title: "Elevated volatility",
      severity: "High",
      explanation: "Volatility conditions are unstable enough to invalidate directional reads quickly.",
    });
  }

  if (sectors.weakening.length > 0) {
    risks.push({
      title: "Sector weakness",
      severity: "Moderate",
      explanation: `${sectors.weakening.slice(0, 2).join(" and ")} remain the weakest areas of the tape and can drag on broader confirmation.`,
    });
  }

  if (!opportunities.length) {
    risks.push({
      title: "Limited confirmation",
      severity: "Moderate",
      explanation: "No setups currently pass Vision's safety and conviction filters, which limits confirmation for aggressive risk-taking.",
    });
  }

  return risks.slice(0, 4);
}

function getOverviewStatus({
  hasMarket,
  hasSectors,
  hasOpportunities,
}: {
  hasMarket: boolean;
  hasSectors: boolean;
  hasOpportunities: boolean;
}): VisionOverview["status"] {
  if (hasMarket && hasSectors && hasOpportunities) {
    return "live";
  }

  if (hasMarket || hasSectors || hasOpportunities) {
    return "partial";
  }

  return "unavailable";
}

export async function GET() {
  const storedMarketContext = await getStoredMarketContext();
  const portfolioHoldings = storedMarketContext.portfolio;
  const normalizedHoldings: ClassifiedPortfolioHolding[] = portfolioHoldings.map((holding) => ({
    ...holding,
    symbol: (
      holding.symbol ??
      holding.ticker ??
      ""
    )
      .trim()
      .toUpperCase(),
  }));
  const classifiedHoldings = await classifyPortfolioHoldings(
    normalizedHoldings,
    async (symbol) => {
      const classification = await resolvePortfolioClassification(symbol);

      if (classification.source === "unresolved") {
        return null;
      }

      return {
        companyName: classification.companyName,
        name: classification.companyName,
        sector: classification.sector,
        industry: classification.industry,
      };
    },
  );

  console.info(
    "Portfolio classification result",
    classifiedHoldings.map((holding) => ({
      symbol: holding.symbol,
      sector: holding.sector ?? null,
      industry: holding.industry ?? null,
      status:
        holding.sector && holding.industry
          ? "classified"
          : holding.sector || holding.industry
            ? "partial"
            : "unresolved",
    })),
  );

  const portfolioHoldingsWithClassification = classifiedHoldings.map((holding) => {
    const symbol = (
      holding.symbol ??
      holding.ticker ??
      ""
    )
      .trim()
      .toUpperCase();

    return {
      ...holding,
      symbol,
      name:
        holding.name ??
        holding.companyName ??
        null,
      companyName:
        holding.companyName ??
        holding.name ??
        null,
      sector:
        holding.sector ??
        null,
      industry:
        holding.industry ??
        null,
    };
  });

  const unresolvedSymbols = portfolioHoldingsWithClassification
    .filter((holding) => !holding.sector || !holding.industry)
    .map((holding) => holding.symbol ?? "")
    .filter(Boolean);

  console.info("Portfolio classification summary", {
    total: portfolioHoldingsWithClassification.length,
    classified:
      portfolioHoldingsWithClassification.length - unresolvedSymbols.length,
    unresolvedSymbols,
  });

  const personalIntelligence = buildPersonalIntelligence(
    portfolioHoldingsWithClassification,
  );
  const portfolioTickers = Array.from(
    new Set(
      portfolioHoldingsWithClassification
        .map((item) => normalizeTicker(item.ticker ?? item.symbol ?? ""))
        .filter(Boolean)
    )
  );

  const [sectorResult, discoveryResult, quoteMapResult] = await Promise.allSettled([
    buildSectorComparisonData(),
    getSetupDiscoveryData(),
    fetchServerQuoteMap([...portfolioTickers, "SPY", "QQQ", "IWM", "^VIX"]),
  ]);

  const sectorComparison = sectorResult.status === "fulfilled" ? sectorResult.value : null;
  const discovery = discoveryResult.status === "fulfilled" ? discoveryResult.value : null;
  const quoteMap = quoteMapResult.status === "fulfilled" ? quoteMapResult.value : null;

  const bullishCount = discovery
    ? discovery.candidates.filter((candidate) => candidate.signal?.toLowerCase().includes("bull")).length
    : 0;
  const candidateCount = discovery?.candidates.length ?? 0;
  const breadthPercent = candidateCount > 0 ? (bullishCount / candidateCount) * 100 : 50;
  const positiveSectors = sectorComparison?.rows.filter((row) => row.today > 0).length ?? 0;
  const sectorRowCount = sectorComparison?.rows.length ?? 0;
  const sectorsPositivePercent = sectorRowCount > 0
    ? (positiveSectors / sectorRowCount) * 100
    : 50;

  const trend = quoteMap
    ? Math.round(
        scoreTrendFromChangePercent(quoteMap.SPY?.changePct ?? null) * 0.4 +
          scoreTrendFromChangePercent(quoteMap.QQQ?.changePct ?? null) * 0.35 +
          scoreTrendFromChangePercent(quoteMap.IWM?.changePct ?? null) * 0.25
      )
    : 50;
  const volatility = quoteMap
    ? scoreVolatility(
        quoteMap["^VIX"]?.price ?? quoteMap.VIX?.price ?? null,
        quoteMap["^VIX"]?.changePct ?? quoteMap.VIX?.changePct ?? null
      )
    : 50;
  const marketInputs = {
    spyTrend: quoteMap ? scoreTrendFromChangePercent(quoteMap.SPY?.changePct ?? null) : 50,
    qqqTrend: quoteMap ? scoreTrendFromChangePercent(quoteMap.QQQ?.changePct ?? null) : 50,
    iwmTrend: quoteMap ? scoreTrendFromChangePercent(quoteMap.IWM?.changePct ?? null) : 50,
    breadthPercent: clampScore(breadthPercent),
    sectorsPositivePercent: clampScore(sectorsPositivePercent),
    volatilityScore: volatility,
  };
  const health = quoteMap && discovery && sectorComparison
    ? calculateMarketHealth(marketInputs)
    : 0;
  const regime = quoteMap && discovery && sectorComparison
    ? getMarketRegime(health)
    : "Balanced";
  const marketConfidence = calculateMarketConfidence({
    trend,
    breadth: marketInputs.breadthPercent,
    volatility,
    sectorsPositive: marketInputs.sectorsPositivePercent,
  });

  const sectorRows = sectorComparison?.rows ?? [];
  const leader = sectorRows[0]?.sector ?? null;
  const improving = sectorRows
    .filter((row) => row.today > 0 || row.week > 0)
    .map((row) => row.sector)
    .slice(0, 3);
  const weakening = [...sectorRows]
    .sort((left, right) => left.today - right.today)
    .filter((row) => row.today <= 0)
    .map((row) => row.sector)
    .slice(0, 3);
  const undervalued = sectorRows
    .filter((row) => row.valuation === "Undervalued Watch" || row.valuation === "Rotation Value")
    .map((row) => row.sector)
    .slice(0, 3);
  const breakoutWatch = sectorRows
    .filter((row) => row.breakout === "Breakout Active" || row.breakout === "Breakout Watch")
    .map((row) => row.sector)
    .slice(0, 3);
  const sectorStrengthMap = new Map(
    sectorRows.map((row) => [row.sector.toLowerCase(), row.score])
  );
  const previousSnapshotRecord = await getLatestVisionSnapshot();
  const previousSnapshot = previousSnapshotRecord?.snapshot ?? null;
  const calculationUpdatedAt =
    sectorComparison?.generatedAt ??
    previousSnapshot?.updatedAt ??
    new Date().toISOString();

  let opportunities: VisionOpportunity[] = [];

  if (discovery) {
    const candidateMap = new Map(
      discovery.candidates.map((candidate) => [normalizeTicker(candidate.ticker), candidate])
    );

    const rankedUniverse = [...discovery.top, ...discovery.emerging]
      .filter((item, index, all) => index === all.findIndex((entry) => entry.ticker === item.ticker))
      .filter((item) => {
        const candidate = candidateMap.get(item.ticker);

        if (!candidate) {
          return false;
        }

        return isEligibleOpportunity({
          symbol: item.ticker,
          price: item.price,
          changePercent: item.changePercent,
          volume: item.volume,
          isWarrant: candidate.isWarrant,
          isRights: candidate.isRights,
          isPreferred: candidate.isPreferred,
          isUnit: candidate.isUnit,
        });
      })
      .filter((item) => meetsConvictionGate(item, candidateMap.get(item.ticker)))
      .sort((left, right) => right.score - left.score)
      .slice(0, 10);

    const historyEntries = await Promise.all(
      rankedUniverse.map(async (item) => [item.ticker, await getHistoryBars(item.ticker, "3mo")] as const)
    );
    const historyMap = new Map(historyEntries);
    const now = new Date();

    opportunities = rankedUniverse
      .map((item) => {
        const candidate = candidateMap.get(item.ticker)!;
        const bars = historyMap.get(item.ticker) ?? [];
        const currentPrice = item.price;
        const weekClose = getCloseOnOrBefore(bars, shiftDays(now, 7));
        const monthClose = getCloseOnOrBefore(bars, shiftDays(now, 30));

        return buildVisionOpportunity(item, candidate, calculationUpdatedAt, {
          changeWeek: computePercentDelta(currentPrice, weekClose),
          changeMonth: computePercentDelta(currentPrice, monthClose),
          sectorStrength: sectorStrengthMap.get((item.sector ?? "Unclassified").toLowerCase()) ?? 50,
          drawdown: computeDrawdownPercent(currentPrice, bars),
        });
      })
      .filter((opportunity) =>
        qualifiesForVision({
          symbol: opportunity.symbol,
          name: opportunity.company,
          price: opportunity.price ?? undefined,
          volume: candidateMap.get(opportunity.symbol)?.volume ?? undefined,
          averageVolume: candidateMap.get(opportunity.symbol)?.avgVolume ?? undefined,
          changePercent: opportunity.changePercent ?? undefined,
          opportunityScore: opportunity.scores.opportunity,
          riskScore: opportunity.scores.risk,
          confidence: opportunity.scores.confidence,
        })
      )
      .sort((left, right) => {
        if (right.scores.opportunity !== left.scores.opportunity) {
          return right.scores.opportunity - left.scores.opportunity;
        }

        if (left.scores.risk !== right.scores.risk) {
          return left.scores.risk - right.scores.risk;
        }

        return right.scores.confidence - left.scores.confidence;
      })
      .slice(0, 5);
  }

  const market = {
    health,
    regime: regime as VisionRegime,
    confidence: marketConfidence,
    trend,
    breadth: marketInputs.breadthPercent,
    volatility,
  };
  const sectors = {
    leader,
    improving,
    weakening,
    undervalued,
    breakoutWatch,
    snapshot: sectorRows.map((row: SectorComparisonRow) => ({
      sector: row.sector,
      symbol: row.symbol,
      today: row.today,
      week: row.week,
      month: row.month,
      year: row.year,
      score: row.score,
      momentum: row.momentum,
      valuation: row.valuation,
      breakout: row.breakout,
    })),
  };
  const risks = buildRisks({ market, sectors, opportunities });
  const summary = {
    headline: leader ? `${market.regime} regime with ${leader} leadership` : `${market.regime} regime`,
    marketRead:
      leader && weakening[0]
        ? buildVisionSummary({
            leader,
            improving: improving.find((sector) => sector !== leader),
            laggard: weakening[0],
            regime: market.regime,
            mainRisk: risks[0]?.title.toLowerCase() ?? "market uncertainty",
          })
        : "Vision does not yet have enough market context to produce a full read.",
    opportunityRead: opportunities.length
      ? `${opportunities[0].symbol} leads the current confirmed opportunity set, with ${opportunities[0].scores.opportunity} opportunity, ${opportunities[0].scores.momentum} momentum, ${opportunities[0].scores.risk} risk, and ${opportunities[0].scores.confidence}% confidence.`
      : "No setups currently pass Vision's safety and conviction filters.",
    riskRead: risks[0]?.explanation ?? "Risk conditions are not fully available right now.",
  };
  const portfolio = await buildVisionPortfolioIntelligence({
    portfolio: portfolioHoldingsWithClassification,
    quoteMap: quoteMap ?? {},
    sectors: sectors.snapshot,
    leader,
    improving,
    weakening,
    opportunities,
  });

  const status = getOverviewStatus({
    hasMarket: Boolean(quoteMap && discovery && sectorComparison),
    hasSectors: Boolean(sectorComparison?.rows.length),
    hasOpportunities: Boolean(discovery),
  });

  const payload: VisionOverview = {
    status,
    updatedAt: calculationUpdatedAt,
    market,
    sectors,
    opportunities,
    risks,
    changes: [],
    portfolio,
    summary,
  };

  const currentFingerprint = getSnapshotFingerprint(payload);
  const previousFingerprint = previousSnapshotRecord?.fingerprint ?? null;

  if (currentFingerprint === previousFingerprint && previousSnapshot?.updatedAt) {
    payload.updatedAt = previousSnapshot.updatedAt;
  }

  payload.changes = buildVisionChanges(previousSnapshot, payload);

  if (currentFingerprint !== previousFingerprint) {
    await persistVisionSnapshot(payload, currentFingerprint);
  }

  const apiPayload = buildApiVisionOverview(
    payload,
    previousSnapshot,
    personalIntelligence,
  );

  return NextResponse.json(apiPayload);
}