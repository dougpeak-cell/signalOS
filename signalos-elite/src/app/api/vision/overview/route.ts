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

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
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
  const updatedAt = new Date().toISOString();
  const storedMarketContext = await getStoredMarketContext();
  const portfolioTickers = Array.from(
    new Set(
      storedMarketContext.portfolio
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

        return buildVisionOpportunity(item, candidate, updatedAt, {
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
    portfolio: storedMarketContext.portfolio,
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
    updatedAt,
    market,
    sectors,
    opportunities,
    risks,
    changes: [],
    portfolio,
    summary,
  };

  const previousSnapshotRecord = await getLatestVisionSnapshot();
  const previousSnapshot = previousSnapshotRecord?.snapshot ?? null;
  const currentFingerprint = getSnapshotFingerprint(payload);
  const previousFingerprint = previousSnapshotRecord?.fingerprint ?? null;

  payload.changes = buildVisionChanges(previousSnapshot, payload);

  if (currentFingerprint !== previousFingerprint) {
    await persistVisionSnapshot(payload, currentFingerprint);
  }

  return NextResponse.json(payload, {
    status: status === "unavailable" ? 503 : 200,
  });
}