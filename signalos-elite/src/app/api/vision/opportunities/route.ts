import { NextResponse } from "next/server";
import { getHistoryBars, type HistoryBar } from "@/lib/market/historyBars";
import { qualifiesForVision } from "@/lib/intelligence/opportunity-filter";
import { buildSectorComparisonData } from "@/lib/market/sectorComparison";
import {
  calculateSigiScores,
  type SigiScores,
  type ScoreInputs,
} from "@/lib/intelligence/scores";
import { buildVisionHorizonViews } from "@/lib/intelligence/visionHorizons";
import type { VisionOpportunity } from "@/lib/intelligence/visionOverview";
import { getSetupDiscoveryData } from "@/lib/today/setupDiscoveryData";
import type {
  RankedSetupItem,
  SetupDiscoveryCandidate,
} from "@/lib/today/setupDiscovery";

export const dynamic = "force-dynamic";

type VisionOpportunitiesResponse = {
  ok: boolean;
  updatedAt?: string;
  opportunities: VisionOpportunity[];
  error?: string;
};

function normalizeTicker(value: string): string {
  return String(value ?? "").trim().toUpperCase();
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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
  if (riskScore < 40) {
    return "Low";
  }

  if (riskScore < 70) {
    return "Medium";
  }

  return "High";
}

function buildIntelligenceScores(
  item: RankedSetupItem,
  candidate: SetupDiscoveryCandidate,
  context: {
    changeWeek: number;
    changeMonth: number;
    sectorStrength: number;
    drawdown: number;
  }
): SigiScores {
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

  return calculateSigiScores(scoreInputs);
}

function buildReasons(item: RankedSetupItem): string[] {
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

  return [...reasons, ...buildReasons(item)].filter(Boolean).slice(0, 4);
}

function buildWarnings(candidate: SetupDiscoveryCandidate, item: RankedSetupItem): string[] {
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

  return [...risks, ...buildWarnings(candidate, item)].filter(Boolean).slice(0, 3);
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

function toVisionOpportunity(
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
  const scores = buildIntelligenceScores(item, candidate, context);
  const horizons = buildVisionHorizonViews({
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
  });
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
    warnings: buildWarnings(candidate, item),
    dataQuality: getDataQuality(candidate),
    updatedAt,
  };
}

export async function GET() {
  try {
    const updatedAt = new Date().toISOString();
    const [discovery, sectorComparison] = await Promise.all([
      getSetupDiscoveryData(),
      buildSectorComparisonData(),
    ]);
    const candidateMap = new Map(
      discovery.candidates.map((candidate) => [normalizeTicker(candidate.ticker), candidate])
    );
    const sectorStrengthMap = new Map(
      sectorComparison.rows.map((row) => [row.sector.toLowerCase(), row.score])
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

    const opportunities = rankedUniverse
      .map((item) => {
        const candidate = candidateMap.get(item.ticker)!;
        const bars = historyMap.get(item.ticker) ?? [];
        const currentPrice = item.price;
        const weekClose = getCloseOnOrBefore(bars, shiftDays(now, 7));
        const monthClose = getCloseOnOrBefore(bars, shiftDays(now, 30));
        const context = {
          changeWeek: computePercentDelta(currentPrice, weekClose),
          changeMonth: computePercentDelta(currentPrice, monthClose),
          sectorStrength: sectorStrengthMap.get((item.sector ?? "Unclassified").toLowerCase()) ?? 50,
          drawdown: computeDrawdownPercent(currentPrice, bars),
        };

        return toVisionOpportunity(item, candidate, updatedAt, context);
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

    return NextResponse.json({
      ok: true,
      updatedAt,
      opportunities,
    } satisfies VisionOpportunitiesResponse);
  } catch (error) {
    console.error("Vision opportunities error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Highest-conviction opportunities are temporarily unavailable.",
        opportunities: [],
      } satisfies VisionOpportunitiesResponse,
      { status: 500 }
    );
  }
}