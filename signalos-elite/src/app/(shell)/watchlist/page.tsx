"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLiveMarket } from "@/components/market/LiveMarketProvider";
import { useShellMarketContext } from "@/components/shell/ShellMarketContext";
import TickerActionButton from "@/components/sigi/TickerActionButton";
import SignalOSScoreV2 from "@/components/stocks/SignalOSScoreV2";
import { useSyncedWatchlist } from "@/hooks/useSyncedWatchlist";
import { buildMasterScoreRow } from "@/lib/analysis/buildMasterScoreRow";
import { buildSparklinePath, getSeriesTrend } from "@/lib/market/sparkline";
import {
  getMomentumScore,
  getTradeScore,
} from "@/lib/stocks/signalosScores";
import {
  readPortfolioHoldings,
  replacePortfolioHoldings,
} from "@/lib/portfolio/localPortfolio";
import { removeFromWatchlist } from "@/lib/storage/watchlist";
import { calculateWatchlistScore } from "@/lib/watchlist/calculateWatchlistScore";
import { readHiddenWatchlistTickers } from "@/lib/watchlist/localWatchlist";

type SignalTone = "Bullish" | "Neutral" | "Bearish";

type WatchlistRow = {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  target?: number | null;
  analystTarget?: number | null;
  stop?: number | null;
  changePct: number;
  changePercent?: number | null;
  score?: number;
  signalosScore?: number | null;
  qualityScore?: number;
  momentumScore?: number;
  tradeScore?: number;
  conviction: number;
  masterScore?: number;
  masterLabel?: string;
  masterTone?: string;
  rvol?: number | null;
  relativeVolume?: number | null;
  volume?: number | null;
  avgVolume?: number | null;
  peRatio?: number | null;
  pe?: number | null;
  pegRatio?: number | null;
  peg?: number | null;
  marketCap?: number | null;
  revenue?: number | null;
  netIncome?: number | null;
  cash?: number | null;
  totalCash?: number | null;
  debt?: number | null;
  totalDebt?: number | null;
  dividendYield?: number | null;
  dividend?: number | null;
  sma20?: number | null;
  sma50?: number | null;
  atrPct?: number | null;
  rsi14?: number | null;
  structure?: "breakout" | "above_support" | "pullback" | "below_support" | "range";
  hasNews?: boolean;
  catalyst?: string | null;
  signal: SignalTone;
  thesis: string;
  sparkline: number[];
};

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z.\-]/g, "");
}

function addToPortfolioFromWatchlist(stock: {
  ticker: string;
  name?: string | null;
  currentPrice?: number | null;
  price?: number | null;
  target?: number | null;
  stop?: number | null;
  conviction?: number | null;
  thesis?: string | null;
}) {
  const ticker = normalizeTicker(stock.ticker);

  const livePrice =
    typeof stock.currentPrice === "number" && Number.isFinite(stock.currentPrice) && stock.currentPrice > 0
      ? stock.currentPrice
      : typeof stock.price === "number" && Number.isFinite(stock.price) && stock.price > 0
        ? stock.price
        : 0;

  const current = readPortfolioHoldings();
  if (current.some((holding) => holding.ticker === ticker)) return;

  replacePortfolioHoldings(
    [
      {
        ticker,
        name: stock.name?.trim() || ticker,
        direction: "Long",
        status: "open",
        tag: "Watchlist",
        thesis: stock.thesis?.trim() || "Added from SigiOS watchlist.",
        shares: 1,
        entryPrice: Number(livePrice.toFixed(2)),
        currentPrice: Number(livePrice.toFixed(2)),
        targetPrice: null,
        stopPrice: null,
        conviction:
          typeof stock.conviction === "number" && Number.isFinite(stock.conviction)
            ? Math.max(0, Math.min(100, Math.round(stock.conviction)))
            : 60,
      },
      ...current,
    ],
    { dispatchEvent: true }
  );
}

function withMasterScore(row: WatchlistRow): WatchlistRow {
  const master = buildMasterScoreRow({
    conviction: row.conviction,
    pe: row.pe ?? row.peRatio ?? null,
    peg: row.peg ?? row.pegRatio ?? null,
    marketCap: row.marketCap ?? null,
    revenue: row.revenue ?? null,
    netIncome: row.netIncome ?? null,
    cash: row.cash ?? row.totalCash ?? null,
    debt: row.debt ?? row.totalDebt ?? null,
    dividendYield: row.dividendYield ?? row.dividend ?? null,
    price: row.price,
    sma20: row.sma20 ?? null,
    sma50: row.sma50 ?? null,
    atrPct: row.atrPct ?? null,
    rsi14: row.rsi14 ?? null,
    structure: row.structure,
  });

  const qualityScore = calculateWatchlistScore({
    ...row,
    trend: row.signal.toLowerCase(),
  });
  const momentumScore = getMomentumScore({
    changePct: row.changePct,
    rvol: row.rvol ?? row.relativeVolume ?? undefined,
  });
  const tradeScore = getTradeScore({ qualityScore, momentumScore });

  return {
    ...row,
    score: qualityScore,
    signalosScore: qualityScore,
    qualityScore,
    momentumScore,
    tradeScore,
    masterScore: master.masterScore,
    masterLabel: master.masterLabel,
    masterTone: master.masterTone,
  };
}

function createWatchlistRow(ticker: string): WatchlistRow {
  const normalizedTicker = normalizeTicker(ticker);

  return withMasterScore({
    ticker: normalizedTicker,
    name: normalizedTicker,
    sector: "Unassigned",
    price: 0,
    changePct: 0,
    conviction: 60,
    signal: "Neutral",
    thesis: "Added from SigiOS Command.",
    sparkline: [100, 100],
  });
}

function normalizeWatchlistRow(candidate: unknown): WatchlistRow | null {
  if (!candidate || typeof candidate !== "object") return null;

  const ticker = normalizeTicker(
    typeof (candidate as { ticker?: unknown }).ticker === "string"
      ? (candidate as { ticker: string }).ticker
      : ""
  );

  if (!ticker) return null;

  const sparkline = Array.isArray((candidate as { sparkline?: unknown }).sparkline)
    ? (candidate as { sparkline: unknown[] }).sparkline
        .map((value) => {
          if (typeof value === "number" && Number.isFinite(value)) return value;
          if (typeof value === "string") {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
          }
          return null;
        })
        .filter((value): value is number => value != null)
    : [];

  const signal =
    (candidate as { signal?: unknown }).signal === "Bullish" ||
    (candidate as { signal?: unknown }).signal === "Bearish"
      ? ((candidate as { signal: SignalTone }).signal as SignalTone)
      : "Neutral";

  return withMasterScore({
    ...createWatchlistRow(ticker),
    name:
      typeof (candidate as { name?: unknown }).name === "string"
        ? (candidate as { name: string }).name
        : ticker,
    sector:
      typeof (candidate as { sector?: unknown }).sector === "string"
        ? (candidate as { sector: string }).sector
        : "Unassigned",
    price:
      typeof (candidate as { price?: unknown }).price === "number"
        ? (candidate as { price: number }).price
        : 0,
    changePct:
      typeof (candidate as { changePct?: unknown }).changePct === "number"
        ? (candidate as { changePct: number }).changePct
        : 0,
    changePercent:
      typeof (candidate as { changePercent?: unknown }).changePercent === "number"
        ? (candidate as { changePercent: number }).changePercent
        : null,
    conviction:
      typeof (candidate as { conviction?: unknown }).conviction === "number"
        ? (candidate as { conviction: number }).conviction
        : 60,
    target: typeof (candidate as { target?: unknown }).target === "number" ? (candidate as { target: number }).target : null,
    analystTarget:
      typeof (candidate as { analystTarget?: unknown }).analystTarget === "number"
        ? (candidate as { analystTarget: number }).analystTarget
        : null,
    rvol: typeof (candidate as { rvol?: unknown }).rvol === "number" ? (candidate as { rvol: number }).rvol : null,
    relativeVolume:
      typeof (candidate as { relativeVolume?: unknown }).relativeVolume === "number"
        ? (candidate as { relativeVolume: number }).relativeVolume
        : null,
    volume: typeof (candidate as { volume?: unknown }).volume === "number" ? (candidate as { volume: number }).volume : null,
    avgVolume:
      typeof (candidate as { avgVolume?: unknown }).avgVolume === "number"
        ? (candidate as { avgVolume: number }).avgVolume
        : null,
    peRatio: typeof (candidate as { peRatio?: unknown }).peRatio === "number" ? (candidate as { peRatio: number }).peRatio : null,
    pe: typeof (candidate as { pe?: unknown }).pe === "number" ? (candidate as { pe: number }).pe : null,
    pegRatio: typeof (candidate as { pegRatio?: unknown }).pegRatio === "number" ? (candidate as { pegRatio: number }).pegRatio : null,
    peg: typeof (candidate as { peg?: unknown }).peg === "number" ? (candidate as { peg: number }).peg : null,
    marketCap: typeof (candidate as { marketCap?: unknown }).marketCap === "number" ? (candidate as { marketCap: number }).marketCap : null,
    revenue: typeof (candidate as { revenue?: unknown }).revenue === "number" ? (candidate as { revenue: number }).revenue : null,
    netIncome: typeof (candidate as { netIncome?: unknown }).netIncome === "number" ? (candidate as { netIncome: number }).netIncome : null,
    cash: typeof (candidate as { cash?: unknown }).cash === "number" ? (candidate as { cash: number }).cash : null,
    totalCash: typeof (candidate as { totalCash?: unknown }).totalCash === "number" ? (candidate as { totalCash: number }).totalCash : null,
    debt: typeof (candidate as { debt?: unknown }).debt === "number" ? (candidate as { debt: number }).debt : null,
    totalDebt: typeof (candidate as { totalDebt?: unknown }).totalDebt === "number" ? (candidate as { totalDebt: number }).totalDebt : null,
    dividendYield: typeof (candidate as { dividendYield?: unknown }).dividendYield === "number" ? (candidate as { dividendYield: number }).dividendYield : null,
    dividend: typeof (candidate as { dividend?: unknown }).dividend === "number" ? (candidate as { dividend: number }).dividend : null,
    sma20: typeof (candidate as { sma20?: unknown }).sma20 === "number" ? (candidate as { sma20: number }).sma20 : null,
    sma50: typeof (candidate as { sma50?: unknown }).sma50 === "number" ? (candidate as { sma50: number }).sma50 : null,
    atrPct: typeof (candidate as { atrPct?: unknown }).atrPct === "number" ? (candidate as { atrPct: number }).atrPct : null,
    rsi14: typeof (candidate as { rsi14?: unknown }).rsi14 === "number" ? (candidate as { rsi14: number }).rsi14 : null,
    structure:
      (candidate as { structure?: unknown }).structure === "breakout" ||
      (candidate as { structure?: unknown }).structure === "above_support" ||
      (candidate as { structure?: unknown }).structure === "pullback" ||
      (candidate as { structure?: unknown }).structure === "below_support" ||
      (candidate as { structure?: unknown }).structure === "range"
        ? ((candidate as { structure: WatchlistRow["structure"] }).structure ?? undefined)
        : undefined,
    hasNews: Boolean((candidate as { hasNews?: unknown }).hasNews),
    catalyst:
      typeof (candidate as { catalyst?: unknown }).catalyst === "string"
        ? (candidate as { catalyst: string }).catalyst
        : null,
    signal,
    thesis:
      typeof (candidate as { thesis?: unknown }).thesis === "string"
        ? (candidate as { thesis: string }).thesis
        : "Added from SigiOS Command.",
    sparkline: sparkline.length ? sparkline : createWatchlistRow(ticker).sparkline,
  });
}

const WATCHLIST: WatchlistRow[] = ([
  {
    ticker: "NVDA",
    name: "NVIDIA",
    sector: "Semiconductors",
    price: 183.05,
    changePct: 0.53,
    conviction: 89.6,
    signal: "Bullish",
    thesis: "AI infrastructure demand remains strong.",
    sparkline: [92, 84, 79, 76, 74, 73, 77, 83, 80, 79, 82, 85, 88, 96, 94, 99, 98, 94, 95, 92, 88, 83, 79, 77],
  },
  {
    ticker: "MSFT",
    name: "Microsoft",
    sector: "Software",
    price: 373,
    changePct: -0.36,
    conviction: 86.4,
    signal: "Bullish",
    thesis: "Azure and AI product monetization support upside.",
    sparkline: [74, 74, 74, 74, 86, 79, 74, 80, 88, 84, 78, 77, 73, 71, 72, 66, 60, 56, 56, 59, 66, 70, 70, 73],
  },
  {
    ticker: "AMZN",
    name: "Amazon",
    sector: "Internet",
    price: 232.75,
    changePct: 5.2,
    conviction: 79,
    signal: "Bullish",
    thesis: "AWS margin expansion and advertising growth.",
    sparkline: [65, 63, 62, 62, 63, 68, 67, 67, 69, 70, 70, 79, 74, 78, 81, 82, 89, 89, 93, 91, 92, 91, 91, 90],
  },
  {
    ticker: "META",
    name: "Meta",
    sector: "Internet",
    price: 512.18,
    changePct: 1.21,
    conviction: 82.7,
    signal: "Bullish",
    thesis: "Ad demand and margin discipline remain supportive.",
    sparkline: [58, 60, 61, 63, 62, 65, 68, 72, 71, 74, 76, 79, 81, 80, 82, 83, 87, 90, 89, 92, 94, 95, 96, 98],
  },
  {
    ticker: "AVGO",
    name: "Broadcom",
    sector: "Semiconductors",
    price: 1328.55,
    changePct: 0.96,
    conviction: 81.2,
    signal: "Bullish",
    thesis: "AI networking and custom silicon tailwinds continue.",
    sparkline: [63, 64, 63, 62, 65, 68, 67, 70, 74, 76, 79, 77, 80, 82, 84, 83, 85, 87, 88, 90, 89, 91, 93, 94],
  },
  {
    ticker: "AMD",
    name: "AMD",
    sector: "Semiconductors",
    price: 164.22,
    changePct: 1.08,
    conviction: 77.4,
    signal: "Bullish",
    thesis: "Accelerator narrative improving as product cadence strengthens.",
    sparkline: [52, 54, 55, 56, 57, 58, 57, 59, 63, 64, 65, 67, 69, 71, 72, 74, 73, 75, 77, 76, 78, 79, 82, 84],
  },
] satisfies WatchlistRow[]).map((row) => withMasterScore(row));

const WATCHLIST_STORAGE_KEY = "signalos.watchlist.rows.v1";
const WATCHLIST_QUICK_ADD_KEY = "signalos.watchlist.quick-add.v1";

function mergeWatchlistRows(rows: WatchlistRow[], tickers: string[]) {
  const seen = new Set(rows.map((row) => row.ticker));
  const additions = tickers
    .map((ticker) => normalizeTicker(ticker))
    .filter((ticker) => ticker && !seen.has(ticker))
    .map((ticker) => createWatchlistRow(ticker));

  return additions.length ? [...rows, ...additions] : rows;
}

function formatPrice(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

type FundamentalsResponse = {
  name?: string | null;
  marketCap?: number | null;
  volume?: number | null;
  avgVolume?: number | null;
  pe?: number | null;
  peg?: number | null;
  revenue?: number | null;
  netIncome?: number | null;
  cash?: number | null;
  debt?: number | null;
  dividendYield?: number | null;
};

function applyLiveQuoteToRow(
  row: WatchlistRow,
  quote: {
    price?: number | null;
    changePct?: number | null;
    volume?: number | null;
    avgVolume?: number | null;
    name?: string | null;
  }
): WatchlistRow {
  const nextRow = {
    ...row,
    name:
      typeof quote.name === "string" && quote.name.trim().length > 0
        ? quote.name
        : row.name,
    price:
      typeof quote.price === "number" && Number.isFinite(quote.price)
        ? quote.price
        : row.price,
    changePct:
      typeof quote.changePct === "number" && Number.isFinite(quote.changePct)
        ? quote.changePct
        : row.changePct,
    volume:
      typeof quote.volume === "number" && Number.isFinite(quote.volume)
        ? quote.volume
        : row.volume ?? null,
    avgVolume:
      typeof quote.avgVolume === "number" && Number.isFinite(quote.avgVolume)
        ? quote.avgVolume
        : row.avgVolume ?? null,
  };

  return withMasterScore({
    ...nextRow,
    score: calculateWatchlistScore({
      price: quote?.price,
      changePct: quote?.changePct,
      volume: quote?.volume,
      avgVolume: quote?.avgVolume,
      rvol:
        quote?.volume && quote?.avgVolume
          ? quote.volume / quote.avgVolume
          : null,
      target: row?.target,
      trend: row.signal?.toLowerCase(),
      hasNews: row?.hasNews,
    }),
  });
}

function applyLiveFundamentalsToRow(
  row: WatchlistRow,
  fundamentals: FundamentalsResponse
): WatchlistRow {
  return withMasterScore({
    ...row,
    name:
      typeof fundamentals.name === "string" && fundamentals.name.trim().length > 0
        ? fundamentals.name
        : row.name,

    marketCap:
      typeof fundamentals.marketCap === "number" &&
      Number.isFinite(fundamentals.marketCap)
        ? fundamentals.marketCap
        : row.marketCap ?? null,

    volume:
      typeof fundamentals.volume === "number" && Number.isFinite(fundamentals.volume)
        ? fundamentals.volume
        : row.volume ?? null,

    avgVolume:
      typeof fundamentals.avgVolume === "number" && Number.isFinite(fundamentals.avgVolume)
        ? fundamentals.avgVolume
        : row.avgVolume ?? null,

    revenue:
      typeof fundamentals.revenue === "number" &&
      Number.isFinite(fundamentals.revenue)
        ? fundamentals.revenue
        : row.revenue ?? null,

    netIncome:
      typeof fundamentals.netIncome === "number" &&
      Number.isFinite(fundamentals.netIncome)
        ? fundamentals.netIncome
        : row.netIncome ?? null,

    cash:
      typeof fundamentals.cash === "number" && Number.isFinite(fundamentals.cash)
        ? fundamentals.cash
        : row.cash ?? row.totalCash ?? null,

    debt:
      typeof fundamentals.debt === "number" && Number.isFinite(fundamentals.debt)
        ? fundamentals.debt
        : row.debt ?? row.totalDebt ?? null,

    pe:
      typeof fundamentals.pe === "number" && Number.isFinite(fundamentals.pe)
        ? fundamentals.pe
        : row.pe ?? row.peRatio ?? null,

    peg:
      typeof fundamentals.peg === "number" && Number.isFinite(fundamentals.peg)
        ? fundamentals.peg
        : row.peg ?? row.pegRatio ?? null,

    dividendYield:
      typeof fundamentals.dividendYield === "number" &&
      Number.isFinite(fundamentals.dividendYield)
        ? fundamentals.dividendYield
        : row.dividendYield ?? row.dividend ?? null,
  });
}

function signalBadgeClasses(signal: SignalTone) {
  if (signal === "Bullish") {
    return "border-emerald-500/30 bg-emerald-500/12 text-emerald-300";
  }

  if (signal === "Bearish") {
    return "border-rose-500/30 bg-rose-500/12 text-rose-300";
  }

  return "border-white/10 bg-white/5 text-white/65";
}

function changeClasses(changePct: number) {
  return changePct >= 0 ? "text-emerald-400" : "text-rose-400";
}

function isUsableHistorySeries(values: number[]): boolean {
  if (!Array.isArray(values)) return false;
  if (values.length < 2) return false;
  return values.some((value) => Number.isFinite(value) && value > 0);
}

function Sparkline({
  data,
  trend,
  loading,
  stale,
}: {
  data: number[];
  trend: "up" | "down" | "flat";
  loading: boolean;
  stale: boolean;
}) {
  const width = 120;
  const height = 36;
  const path = buildSparklinePath(data, width, height);

  return (
    <div className="mt-3 w-30" aria-hidden="true">
      {path ? (
        <div className="relative">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className={`h-9 w-full overflow-visible transition-opacity ${
              loading ? "opacity-80" : stale ? "opacity-55" : "opacity-100"
            }`}
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={
                trend === "up"
                  ? "text-emerald-400"
                  : trend === "down"
                    ? "text-rose-400"
                    : "text-white/40"
              }
            />
          </svg>

          {loading ? (
            <div className="pointer-events-none absolute inset-0 animate-pulse rounded-xl bg-white/2" />
          ) : null}
        </div>
      ) : (
        <div className="h-9 rounded-xl bg-white/3" />
      )}
    </div>
  );
}

function WatchlistRowItem({
  row,
  sparklineData,
  sparklineTrend,
  sparklineLoading,
  sparklineStale,
  isTop,
  portfolioAddHref,
  portfolioHref,
  openChartHref,
  stockHref,
  onRemove,
}: {
  row: WatchlistRow;
  sparklineData: number[];
  sparklineTrend: "up" | "down" | "flat";
  sparklineLoading: boolean;
  sparklineStale: boolean;
  isTop: boolean;
  portfolioAddHref: string;
  portfolioHref: string;
  openChartHref: string;
  stockHref: string;
  onRemove: (ticker: string) => void;
}) {
  return (
    <div
      className={`group relative rounded-xl bg-white/1.5 px-4 py-3 transition duration-200 hover:border-cyan-400/20 hover:bg-cyan-400/4 ${
        isTop
          ? "border border-cyan-400/30 shadow-[0_0_35px_rgba(34,211,238,0.25)]"
          : "border border-white/5"
      }`}
    >
      {isTop ? (
        <div className="absolute -right-2 -top-2 rounded-full bg-cyan-400 px-3 py-1 text-[10px] font-black text-black shadow-lg">
          SIGI TOP PICK
        </div>
      ) : null}
      <div className="grid gap-3">
        <div className="grid gap-3 xl:grid-cols-[140px_92px_minmax(240px,1fr)_76px] xl:items-center">
          <div className="min-w-0 pr-2">
            <div className="flex flex-wrap items-center gap-2">
              <TickerActionButton
                ticker={row.ticker}
                className="text-lg font-semibold tracking-tight text-white no-underline hover:text-cyan-200"
              >
                {row.ticker}
              </TickerActionButton>

              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${signalBadgeClasses(
                  row.signal
                )}`}
              >
                {row.signal}
              </span>

              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/70">
                {row.masterLabel ?? "Neutral"}
              </span>
            </div>

            <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-cyan-300/80">
              {row.sector}
            </div>

            <div className="mt-1 text-sm text-white/60">{row.name}</div>
          </div>

          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
              Price
            </div>
            <div className="mt-1 text-lg font-semibold text-white">
              {formatPrice(row.price)}
            </div>
            <div className={`mt-1 text-sm font-medium ${changeClasses(row.changePct)}`}>
              {formatPct(row.changePct)}
            </div>
          </div>

          <div className="min-w-0">
            <SignalOSScoreV2
              qualityScore={row.signalosScore ?? row.score}
              changePct={row.changePct ?? row.changePercent}
              rvol={row.rvol}
            />
          </div>

          <div className="hidden xl:flex items-center justify-end">
            <Sparkline
              data={sparklineData}
              trend={sparklineTrend}
              loading={sparklineLoading}
              stale={sparklineStale}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/6 pt-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="max-w-136 text-sm leading-6 text-white/72">
              {row.thesis}
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {typeof row.marketCap === "number" && Number.isFinite(row.marketCap) ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/70">
                  Mkt Cap {formatCompactCurrency(row.marketCap)}
                </span>
              ) : null}

              {typeof row.price === "number" && Number.isFinite(row.price) ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/70">
                  Price {formatPrice(row.price)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
            <a
              href={portfolioHref}
              onClick={() =>
                addToPortfolioFromWatchlist({
                  ticker: row.ticker,
                  name: row.name,
                  currentPrice: row.price,
                  price: row.price,
                  conviction: row.conviction,
                  thesis: row.thesis,
                })
              }
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/85 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              + Portfolio
            </a>

            <div className="relative">
              <button
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onRemove(row.ticker);
                }}
                className="relative z-10 rounded-lg border border-red-500/30 bg-red-500/8 px-3 py-1 text-xs text-red-300 opacity-100 transition hover:bg-red-500/12 md:opacity-0 md:group-hover:opacity-100"
                aria-label={`Remove ${row.ticker} from watchlist`}
                type="button"
              >
                X
              </button>
            </div>

            <Link
              href={openChartHref}
              className="inline-flex h-7 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-2 text-[11px] font-medium text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/16 hover:text-cyan-100"
            >
              Open Chart
            </Link>

            <a
              href={portfolioHref}
              className="inline-flex h-7 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-400/10 px-2 text-[11px] font-medium text-amber-200 transition hover:border-amber-300/35 hover:bg-amber-400/16 hover:text-amber-100"
            >
              Portfolio
            </a>

            <Link
              href={stockHref}
              className="inline-flex h-7 items-center justify-center rounded-lg border border-white/10 bg-white/4 px-2 text-[11px] font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
            >
              Stock
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyWatchlistRowItem() {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/2 px-4 py-4">
      <div className="grid gap-3 xl:grid-cols-[220px_120px_140px_1fr_140px] xl:items-center xl:gap-4">
        <div className="min-w-0 pr-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-lg font-semibold tracking-tight text-white/70">—</div>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
              Neutral
            </span>
          </div>

          <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-cyan-300/55">
            Empty Watchlist
          </div>

          <div className="mt-1 text-sm text-white/50">No saved stock</div>
        </div>

        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Price</div>
          <div className="mt-1 text-lg font-semibold text-white/70">Awaiting quote</div>
          <div className="mt-1 text-sm font-medium text-white/40">—</div>
        </div>

        <div className="min-w-0">
          <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-sm text-white/55">
            No active signals
          </div>
        </div>

        <div className="min-w-0 text-sm leading-6 text-white/58 xl:pr-4">
          Reset complete. Add a stock when you want to start tracking names again.
        </div>

        <div className="hidden xl:flex items-center justify-end">
          <div className="h-9 w-30 rounded-xl bg-white/3" />
        </div>
      </div>
    </div>
  );
}

export default function WatchlistPage() {
  const searchParams = useSearchParams();
  const { watchlistTickers: accountWatchlistTickers } = useShellMarketContext();
  const {
    quoteMap,
    historyMap,
    historyLoadingMap,
    ensureQuotes,
    ensureHistory,
    refreshQuotesNow,
    refreshHistoryNow,
  } = useLiveMarket();
  const { tickers: syncedWatchlistTickers } = useSyncedWatchlist();
  const [watchlistRows, setWatchlistRows] = useState<WatchlistRow[]>([]);
  const [hasLoadedWatchlist, setHasLoadedWatchlist] = useState(false);

  function buildPreviewHref(href: string) {
    if (searchParams.get("mobilePreview") !== "1") {
      return href;
    }

    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}mobilePreview=1`;
  }

  function handleRemoveFromWatchlist(ticker: string) {
    removeFromWatchlist(ticker);
    setWatchlistRows((prev) =>
      prev.filter(
        (row) => normalizeTicker(row.ticker) !== normalizeTicker(ticker)
      )
    );
  }

  const watchlistTickers = useMemo(
    () => watchlistRows.map((item) => normalizeTicker(item.ticker)).filter(Boolean),
    [watchlistRows]
  );

  const watchlistTickersKey = [...watchlistTickers].sort().join("|");
  const accountWatchlistTickersKey = [...accountWatchlistTickers]
    .map((ticker) => normalizeTicker(ticker))
    .filter(Boolean)
    .sort()
    .join("|");
  const syncedWatchlistTickersKey = [...syncedWatchlistTickers]
    .map((ticker) => normalizeTicker(ticker))
    .filter(Boolean)
    .sort()
    .join("|");

  useEffect(() => {
    try {
      const rawRows = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
      const parsedRows = rawRows ? JSON.parse(rawRows) : null;
      const storedRows = Array.isArray(parsedRows)
        ? (parsedRows.map(normalizeWatchlistRow).filter(Boolean) as WatchlistRow[])
        : [];

      const rawQuickAdds = window.localStorage.getItem(WATCHLIST_QUICK_ADD_KEY);
      const parsedQuickAdds = rawQuickAdds ? JSON.parse(rawQuickAdds) : [];
      const quickAdds = Array.isArray(parsedQuickAdds)
        ? parsedQuickAdds.filter((value): value is string => typeof value === "string")
        : [];

      const normalizedAccountTickers = accountWatchlistTickers
        .map((ticker) => normalizeTicker(ticker))
        .filter(Boolean);

      const normalizedSyncedTickers = syncedWatchlistTickers
        .map((ticker) => normalizeTicker(ticker))
        .filter(Boolean);

      const fallbackLegacyTickers = Array.from(
        new Set([
          ...quickAdds.map((ticker) => normalizeTicker(ticker)).filter(Boolean),
          ...storedRows.map((row) => normalizeTicker(row.ticker)).filter(Boolean),
        ])
      );

      const hiddenTickers = new Set(readHiddenWatchlistTickers());
      const sourceTickers = normalizedSyncedTickers.length
        ? Array.from(
            new Set(
              [...normalizedSyncedTickers, ...fallbackLegacyTickers].filter(
                (ticker) => !hiddenTickers.has(ticker)
              )
            )
          )
        : normalizedAccountTickers.length
          ? Array.from(
              new Set(
                [...normalizedAccountTickers, ...fallbackLegacyTickers].filter(
                  (ticker) => !hiddenTickers.has(ticker)
                )
              )
            )
          : fallbackLegacyTickers.filter((ticker) => !hiddenTickers.has(ticker));

      const baseRows = storedRows.filter((row) =>
        sourceTickers.includes(normalizeTicker(row.ticker))
      );

      const mergedRows = mergeWatchlistRows(baseRows, sourceTickers);

      setWatchlistRows(mergedRows);

      if (quickAdds.length) {
        window.localStorage.removeItem(WATCHLIST_QUICK_ADD_KEY);
      }
    } catch {
      setWatchlistRows([]);
    } finally {
      setHasLoadedWatchlist(true);
    }
  }, [accountWatchlistTickersKey, syncedWatchlistTickersKey]);

  useEffect(() => {
    if (!hasLoadedWatchlist || watchlistRows.length === 0) return;

    let cancelled = false;

    async function refreshFundamentals() {
      const results = await Promise.all(
        watchlistRows.map(async (row) => {
          try {
            const res = await fetch(
              `/api/massive/fundamentals?ticker=${encodeURIComponent(row.ticker)}`,
              { cache: "no-store" }
            );

            if (!res.ok) return null;

            const data: FundamentalsResponse = await res.json();

            return {
              ticker: row.ticker,
              fundamentals: data,
            };
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;

      setWatchlistRows((prev) =>
        prev.map((row) => {
          const match = results.find((item) => item?.ticker === row.ticker);
          if (!match) return row;
          return applyLiveFundamentalsToRow(row, match.fundamentals);
        })
      );
    }

    refreshFundamentals();

    const interval = window.setInterval(refreshFundamentals, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [hasLoadedWatchlist]);

  useEffect(() => {
    if (!hasLoadedWatchlist) return;

    try {
      window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlistRows));
      window.dispatchEvent(new Event("signalos:watchlist-updated"));
    } catch {
      // ignore storage write failures
    }
  }, [hasLoadedWatchlist, watchlistRows]);

  useEffect(() => {
    if (!hasLoadedWatchlist || watchlistTickers.length === 0) return;

    ensureQuotes(watchlistTickers);
    ensureHistory(watchlistTickers);
    void refreshQuotesNow(watchlistTickers);
    void refreshHistoryNow(watchlistTickers);
  }, [
    ensureHistory,
    ensureQuotes,
    hasLoadedWatchlist,
    refreshHistoryNow,
    refreshQuotesNow,
    watchlistTickers,
    watchlistTickersKey,
  ]);

  const scoredRows = useMemo(
    () =>
      [...watchlistRows]
        .map((row) => {
          const symbol = normalizeTicker(row.ticker);
          const quote = quoteMap[symbol];

          return quote ? applyLiveQuoteToRow(row, quote) : row;
        })
        .sort((a, b) => Number(b.tradeScore ?? b.qualityScore ?? b.score ?? 0) - Number(a.tradeScore ?? a.qualityScore ?? a.score ?? 0)),
    [quoteMap, watchlistRows]
  );

  const averageScore = useMemo(() => {
    if (!scoredRows.length) return 0;
    const total = scoredRows.reduce((sum, row) => {
      return sum + Number(row.tradeScore ?? row.qualityScore ?? row.score ?? 0);
    }, 0);
    return Math.round(total / scoredRows.length);
  }, [scoredRows]);

  const topRated = useMemo(() => {
    return [...scoredRows].sort(
      (a, b) =>
        Number(b.tradeScore ?? b.qualityScore ?? b.score ?? 0) -
        Number(a.tradeScore ?? a.qualityScore ?? a.score ?? 0)
    )[0];
  }, [scoredRows]);

  const eliteCount = useMemo(() => {
    return scoredRows.filter(
      (row) => Number(row.tradeScore ?? row.qualityScore ?? row.score ?? 0) >= 70
    ).length;
  }, [scoredRows]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="w-full pb-10 pt-4">
        <div className="min-w-0 space-y-6">
          <div className="overflow-hidden rounded-[28px] border border-cyan-400/14 bg-linear-to-b from-cyan-500/5 via-black to-black shadow-[0_0_0_1px_rgba(34,211,238,0.04)]">
            <div className="border-b border-white/6 px-4 py-4 md:px-5">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={buildPreviewHref("/stocks")}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-orange-400/24 bg-orange-400/10 px-4 text-sm font-medium text-orange-100 transition hover:border-orange-300/40 hover:bg-orange-400/16 hover:text-white"
                >
                  Browse Stocks
                </Link>

                <Link
                  href={buildPreviewHref("/news")}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-cyan-400/22 bg-cyan-400/10 px-4 text-sm font-medium text-cyan-200 transition hover:border-cyan-300/38 hover:bg-cyan-400/16 hover:text-cyan-100"
                >
                  Watchlist News
                </Link>

                <a
                  href={buildPreviewHref("/portfolio")}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 text-sm font-medium text-amber-200 transition hover:border-amber-300/35 hover:bg-amber-400/16 hover:text-amber-100"
                >
                  Open Portfolio
                </a>

                <div className="ml-auto hidden text-[11px] uppercase tracking-[0.22em] text-white/34 md:block">
                  Watchlist Workspace
                </div>
              </div>
            </div>

            <div className="px-4 py-4 md:px-5 md:py-5">
              <section className="relative mb-5 overflow-hidden rounded-3xl border border-cyan-400/15 p-4 shadow-[0_0_45px_rgba(34,211,238,0.08)] md:p-6">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-60"
                  style={{
                    backgroundImage: "url('/Images/sigi-hero-bg.png')",
                  }}
                />

                <div className="absolute inset-0 bg-cyan-400/15 mix-blend-overlay" />

                <div className="absolute inset-0 opacity-20 bg-[linear-gradient(120deg,transparent,rgba(34,211,238,0.3),transparent)] animate-[pulse_6s_ease-in-out_infinite]" />

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(34,211,238,0.25),transparent_60%)]" />

                <div className="absolute inset-0 bg-linear-to-r from-black/70 via-black/40 to-transparent" />

                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />

                <div className="pointer-events-none absolute inset-0 rounded-3xl border border-cyan-400/20 shadow-[0_0_40px_rgba(34,211,238,0.15)]" />

                <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />

                <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
                  <div className="max-w-3xl">
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">
                      SigiOS Watchlist
                    </div>

                    <h1 className="mt-3 text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] md:text-4xl">
                      Track What Matters
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62 md:leading-7">
                      Monitor your selected stocks with live pricing, SigiOS
                      scoring, momentum context, and quick access to charts,
                      portfolio tracking, and workspaces.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/8 px-3 py-1 text-xs font-bold text-cyan-100">
                        Live Scores
                      </span>
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/8 px-3 py-1 text-xs font-bold text-emerald-100">
                        Real-Time Quotes
                      </span>
                      <span className="rounded-full border border-white/8 bg-white/3.5 px-3 py-1 text-xs font-bold text-white/60">
                        Chart + Workspace Ready
                      </span>
                    </div>
                  </div>

                  <div className="relative z-10 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-right backdrop-blur-sm">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                      Active List
                    </div>
                    <div className="mt-1 text-lg font-black text-white">
                      {scoredRows.length} saved
                    </div>
                  </div>
                </div>
              </section>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-cyan-400/14 bg-cyan-400/5 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                    Average Trade Score
                  </div>
                  <div className="text-2xl font-black text-white">
                    {averageScore}/100
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-400/14 bg-cyan-400/5 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                    SIGI Top Trade Setup
                  </div>
                  <div className="text-2xl font-black text-white">
                    {topRated?.ticker ?? "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-400/14 bg-cyan-400/5 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                    Elite Names
                  </div>
                  <div className="text-2xl font-black text-white">
                    {eliteCount}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-white/6 bg-white/2 p-3 md:p-4">
                <div className="flex flex-col gap-3">
                  <div className="hidden xl:grid xl:grid-cols-[220px_120px_140px_1fr_140px] xl:items-center xl:gap-4 xl:px-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/32">
                      Ticker
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/32">
                      Price
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/32">
                      SigiOS Score v2
                    </div>
                    <div className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-white/32">
                      Chart
                    </div>
                  </div>

                  {hasLoadedWatchlist && scoredRows.length === 0 ? (
                    <EmptyWatchlistRowItem />
                  ) : (
                    scoredRows.map((item, index) => {
                      const symbol = normalizeTicker(item.ticker);
                      const history = historyMap[symbol] ?? [];
                      const historyLoading = historyLoadingMap[symbol] ?? false;
                      const trend = getSeriesTrend(history);

                      return (
                        <WatchlistRowItem
                          key={symbol}
                          isTop={index === 0}
                          portfolioAddHref={buildPreviewHref(`/portfolio?focus=${symbol}`)}
                          portfolioHref={buildPreviewHref(`/portfolio?focus=${symbol}`)}
                          openChartHref={buildPreviewHref(`/stocks/${symbol}`)}
                          stockHref={buildPreviewHref(`/stocks/${symbol}`)}
                          sparklineData={history}
                          sparklineLoading={historyLoading}
                          sparklineStale={false}
                          sparklineTrend={trend}
                          onRemove={handleRemoveFromWatchlist}
                          row={{
                            ...item,
                            ticker: symbol,
                          }}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
