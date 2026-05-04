"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOptionalLiveMarket } from "@/components/market/LiveMarketProvider";
import MiniSparkline from "@/components/stocks/MiniSparkline";
import PageHeaderBlock from "@/components/shell/PageHeaderBlock";
import ReturnToContextButton from "@/components/shared/ReturnToContextButton";
import TickerHover from "@/components/sigi/TickerHover";
import {
  isOpportunitiesView,
  normalizeQueryValue,
} from "@/lib/routing/queryContext";
import { useMarketData } from "@/components/providers/MarketDataProvider";
import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import { useTickerNewsPulse, type TickerNewsPulse } from "@/hooks/useTickerNewsPulse";
import { prefetchCompanyProfile } from "@/lib/companyCache";
import {
  clearWatchlist,
  readWatchlist,
  readWatchlistEntries,
  removeFromWatchlist as removeStoredWatchlistTicker,
} from "@/lib/watchlist/localWatchlist";
import { useVisibleTickerRegistration } from "@/hooks/useVisibleTickerRegistration";

type WatchlistStock = {
  ticker: string;
  company: string;
  sector: string;
  price: number | null;
  currentPrice?: number | null;
  changePercent?: number | null;
  target?: number | null;
  targetPrice?: number | null;
  conviction: number;
  score?: number | null;
  compositeScore?: number | null;
  signal: "Bullish" | "Neutral" | "Bearish";
  thesis: string;
  href: string;
  liveHref: string;
};

type WatchlistRowLike = {
  ticker?: string;
  symbol?: string;
  target?: number | null;
  targetPrice?: number | null;
  price?: number | null;
  currentPrice?: number | null;
  conviction?: number | null;
  score?: number | null;
  compositeScore?: number | null;
};

function getNumericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getDistanceToTarget(row: WatchlistRowLike): number | null {
  const price =
    getNumericValue(row.currentPrice) ??
    getNumericValue(row.price);

  const target =
    getNumericValue(row.targetPrice) ??
    getNumericValue(row.target);

  if (price == null || target == null || price <= 0 || target <= 0) return null;
  return ((target - price) / price) * 100;
}

function getWatchlistStrength(row: WatchlistRowLike): number {
  const conviction = getNumericValue(row.conviction) ?? 0;
  const score =
    getNumericValue(row.score) ??
    getNumericValue(row.compositeScore) ??
    0;

  return conviction * 10 + score;
}

function signalClasses(signal: WatchlistStock["signal"]) {
  if (signal === "Bullish") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }
  if (signal === "Bearish") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  }
  return "border-white/10 bg-white/5 text-white/70";
}

function convictionBarClasses(conviction: number) {
  if (conviction >= 85) return "bg-emerald-400";
  if (conviction >= 70) return "bg-cyan-400";
  return "bg-amber-400";
}

function pulseToneDotClass(tone?: TickerNewsPulse["tone"]) {
  if (tone === "positive") return "bg-emerald-400";
  if (tone === "negative") return "bg-rose-400";
  return "bg-cyan-400";
}

function pulseToneTextClass(tone?: TickerNewsPulse["tone"]) {
  if (tone === "positive") return "text-emerald-200";
  if (tone === "negative") return "text-rose-200";
  return "text-cyan-200";
}

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z.\-]/g, "");
}

function createFallbackWatchlistStock(
  ticker: string,
  withPreviewParam: (href: string) => string,
  metadata?: {
    name?: string | null;
    sector?: string | null;
    conviction?: number | null;
    score?: number | null;
    signal?: "Bullish" | "Neutral" | "Bearish" | null;
    thesis?: string | null;
    target?: number | null;
    currentPrice?: number | null;
    price?: number | null;
    changePercent?: number | null;
  }
): WatchlistStock {
  const normalizedTicker = normalizeTicker(ticker);

  return {
    ticker: normalizedTicker,
    company: metadata?.name?.trim() || normalizedTicker,
    sector: metadata?.sector?.trim() || "Unassigned",
    price: metadata?.currentPrice ?? metadata?.price ?? null,
    currentPrice: metadata?.currentPrice ?? metadata?.price ?? null,
    changePercent: metadata?.changePercent ?? null,
    target: metadata?.target ?? null,
    targetPrice: metadata?.target ?? null,
    conviction: metadata?.conviction ?? 60,
    score: metadata?.score ?? null,
    compositeScore: metadata?.score ?? null,
    signal: metadata?.signal ?? "Neutral",
    thesis: metadata?.thesis?.trim() || "Added from SigiOS watchlist.",
    href: withPreviewParam(`/stocks/${normalizedTicker}`),
    liveHref: withPreviewParam(`/stocks/${normalizedTicker}/live`),
  };
}

function WatchlistStockCard({
  stock,
  opportunitiesMode,
  onRemove,
  pulse,
}: {
  stock: WatchlistStock;
  opportunitiesMode: boolean;
  onRemove: (ticker: string) => void;
  pulse?: TickerNewsPulse;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const { setActiveTicker } = useSelectedTicker();
  const liveMarket = useOptionalLiveMarket();
  const normalizedTicker = normalizeTicker(stock.ticker);
  const liveQuote =
    liveMarket?.quoteMap[normalizedTicker] ?? liveMarket?.quoteMap[stock.ticker] ?? null;

  useVisibleTickerRegistration(rowRef, [stock.ticker], {
    rootMargin: "500px 0px",
    threshold: 0.01,
  });

  useEffect(() => {
    if (!liveMarket) return;

    liveMarket.ensureQuotes([normalizedTicker]);
    void liveMarket.refreshQuotesNow([normalizedTicker]);
  }, [liveMarket, normalizedTicker]);

  const storedPrice =
    typeof stock.currentPrice === "number" && Number.isFinite(stock.currentPrice) && stock.currentPrice > 0
      ? stock.currentPrice
      : typeof stock.price === "number" && Number.isFinite(stock.price) && stock.price > 0
        ? stock.price
        : null;
  const displayPrice =
    typeof liveQuote?.price === "number" && Number.isFinite(liveQuote.price) && liveQuote.price > 0
      ? liveQuote.price
      : storedPrice;
  const displayChange = liveQuote?.changePct ?? stock.changePercent ?? null;
  const displayChangeClass =
    displayChange == null
      ? "text-white/35"
      : displayChange > 0
        ? "text-emerald-300"
        : displayChange < 0
          ? "text-rose-300"
          : "text-white/55";

  const targetDistance = getDistanceToTarget(stock);
  const isNearTarget =
    opportunitiesMode &&
    targetDistance != null &&
    targetDistance >= 0 &&
    targetDistance <= 5;

  return (
    <div
      ref={rowRef}
      onClick={() => {
        setActiveTicker(stock.ticker);
        prefetchCompanyProfile(stock.ticker);
      }}
      onMouseEnter={() => prefetchCompanyProfile(stock.ticker)}
      onFocusCapture={() => prefetchCompanyProfile(stock.ticker)}
      className={[
        "group overflow-visible rounded-3xl border bg-linear-to-b p-4 transition",
        isNearTarget
          ? "ring-1 ring-emerald-400/30 border-emerald-400/25 bg-emerald-400/6 from-emerald-400/10 to-white/3 hover:border-emerald-400/35 hover:bg-emerald-400/12 hover:shadow-[0_0_40px_rgba(16,185,129,0.10)]"
          : "border-white/10 from-white/6 to-white/3 hover:border-cyan-400/20 hover:bg-white/7 hover:shadow-[0_0_40px_rgba(34,211,238,0.06)]",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/75">
            {stock.sector}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <TickerHover ticker={stock.ticker}>
              <h2 className="cursor-help text-2xl font-semibold tracking-tight text-white">
                {stock.ticker}
              </h2>
            </TickerHover>
            {isNearTarget ? (
              <span className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/12 px-2 py-1 text-[11px] font-semibold text-emerald-200">
                Near Target
              </span>
            ) : null}
            <span
              className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${signalClasses(
                stock.signal
              )}`}
            >
              {stock.signal}
            </span>
          </div>

          <div className="mt-1 truncate text-sm text-white/65">
            {stock.company}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemove(stock.ticker)}
          className="inline-flex items-center justify-center rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200 transition hover:border-rose-400/30 hover:bg-rose-500/15"
        >
          Remove
        </button>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Price
              </div>
              <div className="mt-2 whitespace-nowrap text-[20px] font-semibold tracking-tight text-white">
                {displayPrice != null
                  ? `$${displayPrice.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : "Awaiting quote"}
              </div>
              <div className={`mt-1 whitespace-nowrap text-sm font-semibold ${displayChangeClass}`}>
                {displayChange != null
                  ? `${displayChange > 0 ? "+" : ""}${displayChange.toFixed(2)}%`
                  : "—"}
              </div>
            </div>

            <div className="min-w-0 text-right">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Conviction
              </div>
              <div className="mt-2 whitespace-nowrap text-[20px] font-semibold tracking-tight text-white">
                {stock.conviction}/100
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
            <MiniSparkline
              ticker={stock.ticker}
              className="block h-10 w-full"
              height={40}
            />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/45">
          <span>Signal Strength</span>
          <span>{stock.conviction}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${convictionBarClasses(stock.conviction)}`}
            style={{ width: `${stock.conviction}%` }}
          />
        </div>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/68">
        {stock.thesis}
      </p>

      {pulse ? (
        <div
          title={pulse.headline}
          className={[
            "mt-4 flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-2 text-xs",
            pulse.hasBreaking
              ? "border-amber-400/20 bg-amber-400/10"
              : "border-white/10 bg-black/20",
          ].join(" ")}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${pulseToneDotClass(pulse.tone)}`} />
          <span className="text-white/65">
            {pulse.freshCount} fresh headline{pulse.freshCount === 1 ? "" : "s"}
          </span>
          {pulse.topLabel ? (
            <span className={`font-semibold ${pulseToneTextClass(pulse.tone)}`}>
              {pulse.topLabel}
            </span>
          ) : null}
          {pulse.newestAgeLabel ? (
            <span className="text-white/45">{pulse.newestAgeLabel}</span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={stock.href}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/85 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          View Stock
        </Link>

        <Link
          href={stock.liveHref}
          className="inline-flex items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/15"
        >
          Open Chart
        </Link>
      </div>
    </div>
  );
}

function EmptyWatchlistPlaceholder() {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-white/3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
            Empty Watchlist
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-white/70">—</h2>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/50">
              Neutral
            </span>
          </div>
          <div className="mt-1 truncate text-sm text-white/45">No saved stock</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Price</div>
              <div className="mt-2 whitespace-nowrap text-[20px] font-semibold tracking-tight text-white/70">
                Awaiting quote
              </div>
              <div className="mt-1 whitespace-nowrap text-sm font-semibold text-white/35">—</div>
            </div>

            <div className="min-w-0 text-right">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Conviction
              </div>
              <div className="mt-2 whitespace-nowrap text-[20px] font-semibold tracking-tight text-white/70">
                0/100
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 px-3 py-6 text-center text-sm text-white/45">
            Reset complete. Add a stock when you want to start tracking names again.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WatchlistPageClient({
  allStocks,
}: {
  allStocks: WatchlistStock[];
}) {
  const searchParams = useSearchParams();
  const withPreviewParam = useMemo(() => {
    return (href: string) => {
      if (searchParams.get("mobilePreview") !== "1") {
        return href;
      }

      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("mobilePreview", "1");
      const nextQuery = nextParams.toString();
      return nextQuery ? `${href}?${nextQuery}` : href;
    };
  }, [searchParams]);
  const routeView = normalizeQueryValue(searchParams.get("view"));
  const opportunitiesMode = isOpportunitiesView(routeView);
  const [watchlist, setWatchlist] = useState<Array<string | { ticker: string }>>([]);
  const [mounted, setMounted] = useState(false);
  const { registerTickers, unregisterTickers } = useMarketData();

  useEffect(() => {
    const sync = () => {
      setWatchlist(readWatchlist());
    };

    sync();
    setMounted(true);

    const onStorage = () => sync();
    const onCustomUpdate = () => sync();

    window.addEventListener("storage", onStorage);
    window.addEventListener(
      "signalos-watchlist-updated",
      onCustomUpdate as EventListener
    );

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "signalos-watchlist-updated",
        onCustomUpdate as EventListener
      );
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const tickers = readWatchlist();

    window.dispatchEvent(new Event("signalos:watchlist-updated"));
    window.dispatchEvent(
      new CustomEvent("signalos-watchlist-updated", {
        detail: {
          tickers,
          count: tickers.length,
          source: "watchlist-page-load",
        },
      })
    );
  }, [mounted]);

  function removeFromWatchlist(tickerToRemove: string) {
    const target = normalizeTicker(tickerToRemove);
    removeStoredWatchlistTicker(target);
    setWatchlist((prev) =>
      prev.filter(
        (item) => normalizeTicker(typeof item === "string" ? item : item.ticker) !== target
      )
    );
  }

  function resetWatchlist() {
    const confirmed = window.confirm(
      "Reset your watchlist and remove all saved stocks from this page?"
    );

    if (!confirmed) return;

    clearWatchlist();
    setWatchlist([]);
  }

  const savedStocks = useMemo(() => {
    const savedTickers = watchlist
      .map((item) => normalizeTicker(typeof item === "string" ? item : item.ticker))
      .filter(Boolean);
    const stockMap = new Map(
      allStocks.map((stock) => [normalizeTicker(stock.ticker), stock])
    );
    const storedEntryMap = new Map(
      readWatchlistEntries().map((entry) => [normalizeTicker(entry.ticker), entry])
    );

    return savedTickers.map((ticker) => {
      const existing = stockMap.get(ticker);

      if (existing) {
        return existing;
      }

      const metadata = storedEntryMap.get(ticker);
      return createFallbackWatchlistStock(ticker, withPreviewParam, metadata);
    });
  }, [allStocks, watchlist, withPreviewParam]);

  const opportunityAwareRows = useMemo(() => {
    const filteredRows = savedStocks;
    const baseRows = Array.isArray(filteredRows)
      ? filteredRows
      : [];

    if (!opportunitiesMode) return baseRows;

    const ranked = [...baseRows];

    ranked.sort((a, b) => {
      const aDist = getDistanceToTarget(a as WatchlistRowLike);
      const bDist = getDistanceToTarget(b as WatchlistRowLike);

      const aSafe = aDist == null || aDist < 0 ? Number.POSITIVE_INFINITY : aDist;
      const bSafe = bDist == null || bDist < 0 ? Number.POSITIVE_INFINITY : bDist;

      if (aSafe !== bSafe) return aSafe - bSafe;

      return (
        getWatchlistStrength(b as WatchlistRowLike) -
        getWatchlistStrength(a as WatchlistRowLike)
      );
    });

    return ranked;
  }, [opportunitiesMode, savedStocks]);

  useEffect(() => {
    const tickers = opportunityAwareRows
      .slice(0, 25)
      .map((item) => String(item.ticker ?? ""))
      .filter(Boolean);

    if (!tickers.length) return;

    registerTickers(tickers, "background");

    return () => {
      unregisterTickers(tickers, "background");
    };
  }, [opportunityAwareRows, registerTickers, unregisterTickers]);

  const pulseMap = useTickerNewsPulse(
    opportunityAwareRows.map((stock) => stock.ticker),
    {
      refreshEveryMs: 30000,
      limit: 18,
      maxAgeHours: 12,
    }
  );

  const bullishCount = savedStocks.filter((s) => s.signal === "Bullish").length;

  const avgConviction =
    savedStocks.length > 0
      ? Math.round(
          savedStocks.reduce((sum, stock) => sum + stock.conviction, 0) /
            savedStocks.length
        )
      : 0;

  const topName =
    [...savedStocks].sort((a, b) => b.conviction - a.conviction)[0]?.ticker ?? "—";

  if (!mounted) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="space-y-6">
          <PageHeaderBlock
            title="Watchlist"
            description="Loading your saved watchlist..."
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="space-y-6">
        <PageHeaderBlock
          title="Watchlist"
          description="Track your selected names, monitor conviction, and jump directly into live charts."
          actions={
            <>
              <button
                type="button"
                onClick={resetWatchlist}
                disabled={savedStocks.length === 0}
                className="inline-flex items-center justify-center rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:border-rose-400/30 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset Watchlist
              </button>
              <Link
                href={withPreviewParam("/stocks")}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Browse Stocks
              </Link>
              <Link
                href={withPreviewParam("/news")}
                className="inline-flex items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/15"
              >
                Watchlist News
              </Link>
            </>
          }
        />

        {savedStocks.length === 0 ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
                      Saved Stocks
                    </div>
                    <div className="mt-1 text-sm text-white/55">
                      Your watchlist is currently clear.
                    </div>
                  </div>

                  <div className="text-xs text-white/45">0 saved</div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  <EmptyWatchlistPlaceholder />
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
                  Watchlist Stats
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    { label: "Saved Names", value: "0" },
                    { label: "Bullish Setups", value: "0" },
                    { label: "Average Conviction", value: "0/100" },
                    { label: "Top Conviction", value: "—" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-3 py-3"
                    >
                      <div className="text-sm text-white/60">{item.label}</div>
                      <div className="text-sm font-semibold text-white">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
                  Quick Actions
                </div>

                <div className="mt-4 space-y-3">
                  <Link
                    href={withPreviewParam("/stocks")}
                    className="block w-full rounded-2xl border border-orange-400/20 bg-orange-500/10 px-4 py-3 text-left text-sm font-medium text-orange-200 transition hover:bg-orange-500/15"
                  >
                    + Add More Stocks
                  </Link>

                  <Link
                    href={withPreviewParam("/news")}
                    className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white/80 transition hover:bg-white/10"
                  >
                    Open News
                  </Link>

                  <Link
                    href="/experts"
                    className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white/80 transition hover:bg-white/10"
                  >
                    View Experts
                  </Link>
                </div>
              </div>
            </aside>
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
                      Saved Stocks
                    </div>
                    <div className="mt-1 text-sm text-white/55">
                      Your personal list of names to monitor closely.
                    </div>
                  </div>

                  <div className="text-xs text-white/45">
                    {opportunityAwareRows.length} saved
                  </div>
                </div>

                {opportunitiesMode ? (
                  <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-emerald-100">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/70">
                          Opportunities Mode
                        </div>
                        <div className="mt-1 text-sm font-semibold">
                          Watchlist sorted by closest targets
                        </div>
                        <div className="mt-1 text-xs text-emerald-100/80">
                          Near-target setups are prioritized first, then ranked by conviction and score.
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <ReturnToContextButton fallbackHref="/" label="Back to Today context" />
                        <Link
                          href={withPreviewParam("/watchlist")}
                          className="inline-flex rounded-2xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/85 transition hover:bg-black/30"
                        >
                          Clear Mode
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {opportunityAwareRows.map((stock) => {
                    return (
                      <WatchlistStockCard
                        key={stock.ticker}
                        stock={stock}
                        opportunitiesMode={opportunitiesMode}
                        onRemove={removeFromWatchlist}
                        pulse={pulseMap[stock.ticker]}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
                  Watchlist Stats
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    { label: "Saved Names", value: String(opportunityAwareRows.length) },
                    { label: "Bullish Setups", value: String(bullishCount) },
                    { label: "Average Conviction", value: `${avgConviction}/100` },
                    { label: "Top Conviction", value: topName },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-3 py-3"
                    >
                      <div className="text-sm text-white/60">{item.label}</div>
                      <div className="text-sm font-semibold text-white">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
                  Quick Actions
                </div>

                <div className="mt-4 space-y-3">
                  <Link
                    href={withPreviewParam("/stocks")}
                    className="block w-full rounded-2xl border border-orange-400/20 bg-orange-500/10 px-4 py-3 text-left text-sm font-medium text-orange-200 transition hover:bg-orange-500/15"
                  >
                    + Add More Stocks
                  </Link>

                  <Link
                    href={withPreviewParam("/news")}
                    className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white/80 transition hover:bg-white/10"
                  >
                    Open News
                  </Link>

                  <Link
                    href="/experts"
                    className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white/80 transition hover:bg-white/10"
                  >
                    View Experts
                  </Link>
                </div>
              </div>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}