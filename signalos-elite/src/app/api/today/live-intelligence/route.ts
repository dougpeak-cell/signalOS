import { NextResponse } from "next/server";
import {
  fetchLatestSignalRows,
  fetchSignalsForTickers,
  type SignalDetailRow,
} from "@/lib/queries/signals";
import { getQuotePrice } from "@/lib/market/quotes";
import { getMarketSetupUniverse } from "@/lib/market/movers";
import { buildTodayActionRowMetrics } from "@/lib/today/actionRow";
import { getCurrentMarketPhase } from "@/lib/today/marketPhase";
import { rankTopSetups } from "@/lib/today/topSetups";
import type { TodayLiveIntelligenceInput } from "@/lib/today/todayIntelligence";
import { convictionToPct, signalToneFromRow } from "@/lib/signalUtils";

export const dynamic = "force-dynamic";

type LiveSetupCandidate = {
  row: SignalDetailRow;
  ticker: string;
  symbol?: string;
  name: string | null;
  sector: string | null;
  theme?: string | null;
  signal: string;
  conviction: number | null;
  compositeScore?: number | null;
  score: number | null;
  rankScore?: number | null;
  targetPrice?: number | null;
  target: number | null;
  currentPrice: number | null;
  price: number | null;
  changePercent: number | null;
  changePct: number | null;
  volume?: number | null;
  avgVolume?: number | null;
  hasNews?: boolean;
  hasEarnings?: boolean;
};

export async function GET() {
  try {
    const currentPhase = getCurrentMarketPhase();
    const rows = await fetchLatestSignalRows(40);
    const marketSetupUniverse = await getMarketSetupUniverse(12);
    const marketSetupSignalRows = await fetchSignalsForTickers(
      marketSetupUniverse.map((item) => item.ticker)
    );
    const marketSetupSignalMap = new Map(
      marketSetupSignalRows.map((row) => [row.ticker, row])
    );

    const signalRows = rows.map((row) => {
      const currentPrice = getQuotePrice(row.ticker);
      const tone = signalToneFromRow(row, currentPrice);

      return {
        ticker: row.ticker,
        symbol: row.ticker,
        name: row.company_name,
        sector: row.sector,
        theme: null,
        signal:
          tone === "bullish"
            ? "Bullish"
            : tone === "bearish"
              ? "Bearish"
              : "Neutral",
        conviction: convictionToPct(row.conviction),
        compositeScore: convictionToPct(row.conviction),
        score: convictionToPct(row.conviction),
        rankScore: convictionToPct(row.conviction),
        targetPrice: row.target_price,
        target: row.target_price,
        currentPrice,
        price: row.price,
        changePercent: null,
        changePct: null,
      };
    });

    const rankedSetups = rankTopSetups<LiveSetupCandidate>(
      signalRows.map((item, index) => ({
        ...item,
        row: rows[index],
        changePercent: item.changePercent,
        target: rows[index]?.target_price ?? null,
      })),
      currentPhase
    );

    const marketWideSetupCandidates: LiveSetupCandidate[] = marketSetupUniverse.map((item) => {
      const signalRow = marketSetupSignalMap.get(item.ticker);
      const signedChangePct = item.changePct ?? 0;
      const absoluteMove = Math.abs(signedChangePct);
      const livePrice = item.price ?? getQuotePrice(item.ticker);
      const tone = signalRow ? signalToneFromRow(signalRow, livePrice) : "neutral";
      const signal =
        tone === "bullish"
          ? "Bullish"
          : tone === "bearish"
            ? "Bearish"
            : "Neutral";
      const confidence = signalRow ? convictionToPct(signalRow.conviction) : null;
      const fallbackRow: SignalDetailRow = signalRow ?? {
        ticker: item.ticker,
        company_name: item.name,
        sector: item.sector ?? null,
        price: livePrice ?? null,
        conviction: confidence,
        entry_low: null,
        entry_high: null,
        stop_loss: null,
        target_price: null,
        thesis: null,
        catalysts: [],
        risks: [],
        tier: null,
        as_of_date: null,
        created_at: null,
      };

      return {
        row: fallbackRow,
        ticker: item.ticker,
        name: item.name,
        signal,
        sector: signalRow?.sector ?? item.sector ?? null,
        price: livePrice ?? null,
        currentPrice: livePrice ?? null,
        changePct: item.changePct ?? null,
        changePercent: absoluteMove,
        volume: null,
        avgVolume: null,
        score:
          confidence ?? Math.min(96, Math.max(32, Math.round(absoluteMove * 8))),
        conviction:
          confidence ?? Math.min(96, Math.max(32, Math.round(absoluteMove * 7))),
        target: signalRow?.target_price ?? null,
        hasNews: false,
        hasEarnings: false,
      };
    });

    const marketWideRankedSetups = rankTopSetups<LiveSetupCandidate>(
      marketWideSetupCandidates.length ? marketWideSetupCandidates : rankedSetups,
      currentPhase
    );

    const bullishCount = signalRows.filter((row) => row.signal === "Bullish").length;
    const bearishCount = signalRows.filter((row) => row.signal === "Bearish").length;
    const neutralCount = signalRows.length - bullishCount - bearishCount;
    const liveRegime =
      bullishCount > bearishCount
        ? "Bullish"
        : bearishCount > bullishCount
          ? "Risk Off"
          : "Neutral";

    const liveData: TodayLiveIntelligenceInput = {
      signals: signalRows,
      leadershipSignals: marketWideRankedSetups.slice(0, 36).map((item) => ({
        ticker: String(item.ticker ?? "").toUpperCase(),
        name: item.name ?? "",
        sector: item.sector ?? "",
        theme: item.sector ?? "",
        signal: item.signal ?? "",
        conviction: item.conviction ?? item.score ?? null,
        score: item.score ?? item.conviction ?? null,
        target: item.target ?? null,
        currentPrice: item.currentPrice ?? item.price ?? null,
        price: item.currentPrice ?? item.price ?? null,
        changePercent: item.changePercent ?? item.changePct ?? null,
      })),
      portfolio: [],
      marketStats: {
        bullishCount,
        bearishCount,
        neutralCount,
        breadthLabel: `${bullishCount} bullish / ${bearishCount} bearish`,
        regime: liveRegime,
      },
    };

    const actionRowMetrics = buildTodayActionRowMetrics(rows, marketSetupUniverse);

    return NextResponse.json({
      ok: true,
      liveData,
      actionRowMetrics,
      updatedAt: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load today live intelligence",
      },
      { status: 500 }
    );
  }
}