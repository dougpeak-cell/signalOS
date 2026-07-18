import { NextResponse } from "next/server";
import {
  calculateMarketHealth,
  getMarketRegime,
} from "@/lib/intelligence/market-health";
import { buildSectorComparisonData } from "@/lib/market/sectorComparison";
import { fetchServerQuoteMap } from "@/lib/market/serverQuote";
import { getSetupDiscoveryData } from "@/lib/today/setupDiscoveryData";

export const dynamic = "force-dynamic";

type VisionMarketHealthResponse = {
  ok: boolean;
  updatedAt?: string;
  marketHealth?: number;
  regime?: "Risk-On" | "Balanced" | "Risk-Off";
  inputs?: {
    spyTrend: number;
    qqqTrend: number;
    iwmTrend: number;
    breadthPercent: number;
    sectorsPositivePercent: number;
    volatilityScore: number;
  };
  error?: string;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
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

export async function GET() {
  try {
    const [quoteMap, setupDiscovery, sectorComparison] = await Promise.all([
      fetchServerQuoteMap(["SPY", "QQQ", "IWM", "^VIX"]),
      getSetupDiscoveryData(),
      buildSectorComparisonData(),
    ]);

    const bullishCount = setupDiscovery.candidates.filter(
      (candidate) => candidate.signal?.toLowerCase().includes("bull")
    ).length;
    const candidateCount = setupDiscovery.candidates.length;
    const breadthPercent =
      candidateCount > 0 ? (bullishCount / candidateCount) * 100 : 50;

    const positiveSectors = sectorComparison.rows.filter((row) => row.today > 0).length;
    const sectorsPositivePercent =
      sectorComparison.rows.length > 0
        ? (positiveSectors / sectorComparison.rows.length) * 100
        : 50;

    const inputs = {
      spyTrend: scoreTrendFromChangePercent(quoteMap.SPY?.changePct ?? null),
      qqqTrend: scoreTrendFromChangePercent(quoteMap.QQQ?.changePct ?? null),
      iwmTrend: scoreTrendFromChangePercent(quoteMap.IWM?.changePct ?? null),
      breadthPercent: clampScore(breadthPercent),
      sectorsPositivePercent: clampScore(sectorsPositivePercent),
      volatilityScore: scoreVolatility(
        quoteMap["^VIX"]?.price ?? quoteMap.VIX?.price ?? null,
        quoteMap["^VIX"]?.changePct ?? quoteMap.VIX?.changePct ?? null
      ),
    };

    const marketHealth = calculateMarketHealth(inputs);
    const regime = getMarketRegime(marketHealth);

    return NextResponse.json({
      ok: true,
      updatedAt: new Date().toISOString(),
      marketHealth,
      regime,
      inputs,
    } satisfies VisionMarketHealthResponse);
  } catch (error) {
    console.error("Vision market health error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Market health is temporarily unavailable.",
      } satisfies VisionMarketHealthResponse,
      { status: 500 }
    );
  }
}