import { computeFundamentalScore } from "@/lib/analysis/fundamentalScore";
import { computePegFromGrowth } from "@/lib/analysis/computePeg";
import { getMassiveFundamentals } from "@/lib/market/massiveFundamentals";
import { fetchServerQuoteState } from "@/lib/market/serverQuote";
import {
  computeTechnicalsFromHistory,
  type ComputedTechnicals,
} from "@/lib/market/technicals";
import {
  fetchSignalByTicker,
  type SignalDetailRow,
} from "@/lib/queries/signals";

type WorkspaceFundamentals = {
  pe: number | null;
  peg: number | null;
  marketCap: number | null;
  volume: number | null;
  avgVolume: number | null;
  revenue: number | null;
  netIncome: number | null;
  cash: number | null;
  debt: number | null;
  dividendYield: number | null;
};

export type StockWorkspaceData = {
  row: SignalDetailRow;
  liveTicker: string;
  technicals: ComputedTechnicals;
  fundamentals: WorkspaceFundamentals;
  fundamentalCompositeScore: number;
  initialPrice: number | null;
  initialChangePct: number | null;
};

function buildFallbackRow(ticker: string): SignalDetailRow {
  return {
    ticker,
    company_name: null,
    sector: null,
    price: null,
    conviction: 60,
    entry_low: null,
    entry_high: null,
    stop_loss: null,
    target_price: null,
    thesis:
      "No internal signal row yet. This workspace is rendering from live market data fallback.",
    catalysts: null,
    risks: null,
    tier: "Signal",
    as_of_date: null,
    created_at: null,
  };
}

async function getPriceHistory(ticker: string) {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const res = await fetch(
      `${baseUrl}/api/history?ticker=${encodeURIComponent(
        ticker
      )}&range=6mo&interval=1day`,
      { cache: "no-store" }
    );

    if (!res.ok) return [];

    const data = await res.json();

    if (Array.isArray(data?.bars)) return data.bars;
    if (Array.isArray(data?.history)) return data.history;
    if (Array.isArray(data?.prices)) return data.prices;

    return [];
  } catch {
    return [];
  }
}

function computePercentChange(price: number | null, prevClose: number | null) {
  if (
    price == null ||
    prevClose == null ||
    !Number.isFinite(price) ||
    !Number.isFinite(prevClose) ||
    prevClose <= 0
  ) {
    return null;
  }

  return ((price - prevClose) / prevClose) * 100;
}

export async function getStockWorkspaceData(
  rawTicker: string
): Promise<StockWorkspaceData> {
  const ticker = String(rawTicker ?? "").trim().toUpperCase();
  const dbRow = await fetchSignalByTicker(ticker);

  const row = dbRow ?? buildFallbackRow(ticker);
  const liveTicker = row.ticker.toUpperCase();

  const [priceHistory, quoteState, massiveFundamentals] = await Promise.all([
    getPriceHistory(liveTicker),
    fetchServerQuoteState(liveTicker),
    getMassiveFundamentals(liveTicker),
  ]);

  const technicals = computeTechnicalsFromHistory(priceHistory);

  const fundamentalsBase = {
    pe: massiveFundamentals.pe ?? null,
    peg: massiveFundamentals.peg ?? null,
    marketCap: massiveFundamentals.marketCap ?? null,
    volume: massiveFundamentals.volume ?? null,
    avgVolume: massiveFundamentals.avgVolume ?? null,
    revenue:
      typeof massiveFundamentals.revenue === "number"
        ? massiveFundamentals.revenue
        : null,
    netIncome:
      typeof massiveFundamentals.netIncome === "number"
        ? massiveFundamentals.netIncome
        : null,
    cash:
      typeof massiveFundamentals.cash === "number"
        ? massiveFundamentals.cash
        : null,
    debt:
      typeof massiveFundamentals.debt === "number"
        ? massiveFundamentals.debt
        : null,
    dividendYield: massiveFundamentals.dividendYield ?? null,
  };

  const computedPeg = computePegFromGrowth({
    pe: fundamentalsBase.pe,
    currentRevenue: fundamentalsBase.revenue,
    previousRevenue: massiveFundamentals.previousRevenue ?? null,
    twoYearsAgoRevenue: massiveFundamentals.twoYearsAgoRevenue ?? null,
  });

  const fundamentals: WorkspaceFundamentals = {
    ...fundamentalsBase,
    peg: fundamentalsBase.peg ?? computedPeg,
  };

  const initialPrice =
    row.price ??
    technicals.lastClose ??
    (quoteState.source === "api" ? quoteState.price : null) ??
    quoteState.price ??
    null;

  const initialChangePct =
    quoteState.source === "api"
      ? computePercentChange(quoteState.price, quoteState.prevClose)
      : null;

  const fundamentalScore = computeFundamentalScore({
    pe: fundamentals.pe,
    peg: fundamentals.peg,
    marketCap: fundamentals.marketCap,
    revenue: fundamentals.revenue,
    netIncome: fundamentals.netIncome,
    cash: fundamentals.cash,
    debt: fundamentals.debt,
    dividendYield: fundamentals.dividendYield,
  });

  return {
    row,
    liveTicker,
    technicals,
    fundamentals,
    fundamentalCompositeScore: fundamentalScore.composite,
    initialPrice,
    initialChangePct,
  };
}