"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import PageHeaderBlock from "@/components/shell/PageHeaderBlock";
import LiveStockChart from "@/components/stocks/LiveStockChart";
import TickerLogo from "@/components/stocks/TickerLogo";
import TechnicalIntelligenceCard from "@/components/stocks/TechnicalIntelligenceCard";
import { useOptionalLiveMarket } from "@/components/market/LiveMarketProvider";
import { useOptionalMarketData } from "@/components/providers/MarketDataProvider";
import { useStoredWatchlistTickers } from "@/hooks/useStoredWatchlistTickers";
import { computeMasterSignalScore } from "@/lib/analysis/masterSignalScore";
import { buildExecutionModel } from "@/lib/engines/executionModel";
import { buildTargetEngine } from "@/lib/engines/targetEngine";
import type { ComputedTechnicals } from "@/lib/market/technicals";
import { addStoredWatchlistTicker } from "@/lib/watchlistStore";

type StockDetailLiveRow = {
  ticker: string;
  company_name: string | null;
  sector: string | null;
  conviction: number | null;
  entry_low: number | null;
  entry_high: number | null;
  stop_loss: number | null;
  target_price: number | null;
  tier: string | null;
  as_of_date: string | null;
};

type StockDetailLivePanelsProps = {
  row: StockDetailLiveRow;
  companyProfile?: {
    name: string | null;
    exchange: string | null;
    currency: string | null;
    logo: string | null;
    weburl: string | null;
  } | null;
  technicals: ComputedTechnicals;
  initialPrice: number | null;
  initialChangePct: number | null;
  fundamentalCompositeScore: number;
  hasLiveData: boolean;
  fallbackMessage: string | null;
};

function money(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return "—";
  return `$${Number(v).toFixed(2)}`;
}

function pct(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return "—";

  const value = Number(v);

  if (value <= 1) {
    return `${Math.round(value * 100)}%`;
  }

  return `${Math.round(value)}%`;
}

function formatUpside(v: number | null) {
  if (v == null || !Number.isFinite(v)) return "—";
  const rounded = Math.round(v * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`;
}

function percentTone(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "text-white/35";
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-white/55";
}

function tierStyles(tier: string | null | undefined) {
  const t = (tier ?? "").toLowerCase();

  if (t === "elite") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  }
  if (t === "strong") {
    return "border-sky-500/25 bg-sky-500/10 text-sky-300";
  }
  if (t === "risk") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  }

  return "border-white/10 bg-white/4 text-white/70";
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="glow-card-soft rounded-2xl p-3 md:p-4">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/40 md:text-[11px] md:tracking-[0.18em]">
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold tracking-tight text-white md:text-2xl">
        {value}
      </div>
      {subtext ? <div className="mt-1 text-[13px] text-white/55 md:text-sm">{subtext}</div> : null}
    </div>
  );
}

function scoreTechnicalModel({
  price,
  sma20,
  sma50,
  atrPct,
  rsi14,
  structure,
}: {
  price: number | null;
  sma20: number | null;
  sma50: number | null;
  atrPct: number | null;
  rsi14: number | null;
  structure?: "breakout" | "above_support" | "pullback" | "below_support" | "range";
}) {
  const trend =
    price != null && sma20 != null && sma50 != null
      ? price > sma20 && sma20 > sma50
        ? 88
        : price < sma20 && sma20 < sma50
          ? 28
          : 60
      : 50;

  const momentum =
    rsi14 != null
      ? rsi14 >= 60 && rsi14 <= 75
        ? 84
        : rsi14 > 75
          ? 52
          : rsi14 < 40
            ? 30
            : 62
      : 50;

  const volatility =
    atrPct != null
      ? atrPct <= 2.5
        ? 82
        : atrPct <= 4.5
          ? 64
          : 42
      : 50;

  const structureScore =
    structure === "breakout"
      ? 90
      : structure === "above_support"
        ? 72
        : structure === "pullback"
          ? 76
          : structure === "below_support"
            ? 18
            : structure === "range"
              ? 55
              : 50;

  return Math.round((trend + momentum + volatility + structureScore) / 4);
}

export default function StockDetailLivePanels({
  row,
  companyProfile,
  technicals,
  initialPrice,
  initialChangePct,
  fundamentalCompositeScore,
  hasLiveData,
  fallbackMessage,
}: StockDetailLivePanelsProps) {
  const searchParams = useSearchParams();
  const liveMarket = useOptionalLiveMarket();
  const marketData = useOptionalMarketData();
  const liveTicker = row.ticker.toUpperCase();
  const marketDataActions = useMemo(
    () =>
      marketData
        ? {
            registerTickers: marketData.registerTickers,
            unregisterTickers: marketData.unregisterTickers,
            refreshNow: marketData.refreshNow,
          }
        : null,
    [
      marketData?.registerTickers,
      marketData?.unregisterTickers,
      marketData?.refreshNow,
    ]
  );
  const { watchlistTickerSet } = useStoredWatchlistTickers();
  const isTracked = watchlistTickerSet.has(liveTicker);

  function buildPreviewHref(href: string) {
    if (searchParams.get("mobilePreview") !== "1") {
      return href;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("mobilePreview", "1");
    const nextQuery = nextParams.toString();
    return nextQuery ? `${href}?${nextQuery}` : href;
  }

  useEffect(() => {
    if (!liveMarket) return;

    liveMarket.ensureQuotes([liveTicker]);
    void liveMarket.refreshQuotesNow([liveTicker]);
  }, [liveMarket, liveTicker]);

  useEffect(() => {
    if (!marketDataActions) return;

    marketDataActions.registerTickers([liveTicker], "critical");
    void marketDataActions.refreshNow();

    return () => {
      marketDataActions.unregisterTickers([liveTicker], "critical");
    };
  }, [liveTicker, marketDataActions]);

  const marketDataQuote = marketData?.getQuote(liveTicker);
  const quote = liveMarket?.quoteMap[liveTicker];
  const lastClose = technicals.lastClose ?? initialPrice;
  const previousClose =
    marketDataQuote?.previousClose ??
    marketDataQuote?.prevClose ??
    initialPrice ??
    lastClose ??
    null;
  const livePrice =
    marketDataQuote?.currentPrice ??
    marketDataQuote?.price ??
    quote?.price ??
    initialPrice ??
    null;
  const safePrice =
    typeof livePrice === "number" && Number.isFinite(livePrice) && livePrice > 0
      ? livePrice
      : typeof quote?.price === "number" && Number.isFinite(quote.price) && quote.price > 0
        ? quote.price
        : typeof lastClose === "number" && Number.isFinite(lastClose) && lastClose > 0
          ? lastClose
          : null;
  const safeChange =
    typeof quote?.change === "number" && Number.isFinite(quote.change)
      ? quote.change
      : safePrice != null && typeof previousClose === "number" && Number.isFinite(previousClose) && previousClose > 0
        ? safePrice - previousClose
        : null;
  const safeChangePct =
    typeof quote?.changePct === "number" && Number.isFinite(quote.changePct)
      ? quote.changePct
      : safeChange != null && typeof previousClose === "number" && Number.isFinite(previousClose) && previousClose > 0
        ? (safeChange / previousClose) * 100
        : null;
  const hasChange =
    safeChange != null &&
    safeChangePct != null &&
    Number.isFinite(safeChange) &&
    Number.isFinite(safeChangePct);
  const changeTone =
    hasChange && safeChange > 0
      ? "text-emerald-300"
      : hasChange && safeChange < 0
        ? "text-rose-300"
        : "text-white/45";
  const analysisPrice = safePrice;
  const analysisChangePct = safeChangePct;
  const technicalAnchorPrice = lastClose;

  const normalizedConviction =
    row.conviction != null && row.conviction <= 1
      ? row.conviction * 100
      : row.conviction;

  const executionModel = buildExecutionModel({
    livePrice: analysisPrice,
    tier: row.tier,
    conviction: normalizedConviction,
    dbEntryLow: row.entry_low,
    dbEntryHigh: row.entry_high,
  });

  const technicalScore = scoreTechnicalModel({
    price: technicalAnchorPrice,
    sma20: technicals.sma20,
    sma50: technicals.sma50,
    atrPct: technicals.atrPct,
    rsi14: technicals.rsi14,
    structure: technicals.structure,
  });

  const atrPct = technicals.atrPct != null ? technicals.atrPct / 100 : 0.025;
  const momentumBias =
    technicals.trend === "bullish"
      ? "bullish"
      : technicals.trend === "bearish"
        ? "bearish"
        : normalizedConviction != null && normalizedConviction >= 85
          ? "bullish"
          : normalizedConviction != null && normalizedConviction <= 50
            ? "bearish"
            : "neutral";

  const targetModel = buildTargetEngine({
    livePrice: analysisPrice,
    tier: row.tier,
    conviction: normalizedConviction,
    entryLow: executionModel.entryLow,
    entryHigh: executionModel.entryHigh,
    nearestResistance: technicals.resistance20,
    nearestLiquidity: technicals.support20,
    atrPct,
    momentumBias,
  });

  const masterSignalScore = computeMasterSignalScore({
    technicalScore,
    fundamentalScore: fundamentalCompositeScore,
    conviction: row.conviction ?? null,
  });

  const entryLow = executionModel.entryLow ?? row.entry_low ?? null;
  const entryHigh = executionModel.entryHigh ?? row.entry_high ?? null;
  const target = targetModel.target ?? row.target_price ?? null;
  const stop = executionModel.stop ?? targetModel.stop ?? row.stop_loss ?? null;
  const upside = targetModel.upsidePct;
  const companyName = companyProfile?.name ?? row.company_name ?? "Company";
  const exchangeBadge = [companyProfile?.exchange, companyProfile?.currency]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" • ");
  const heroMetrics = [
    analysisPrice != null
      ? {
          key: "price",
          label: "Price",
          value: money(analysisPrice),
          subtext: hasChange
            ? `${safeChange > 0 ? "+" : ""}${safeChange.toFixed(2)} (${safeChangePct > 0 ? "+" : ""}${safeChangePct.toFixed(2)}%)`
            : "Live syncing...",
          subtextClassName: changeTone,
        }
      : null,
    target != null
      ? {
          key: "target",
          label: "Target",
          value: money(target),
          subtext: null,
          subtextClassName: "text-white/55",
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    value: string;
    subtext: string | null;
    subtextClassName: string;
  }>;

  const summaryCards = [
    row.conviction != null
      ? {
          key: "conviction",
          label: "Conviction",
          value: pct(row.conviction),
          subtext: "Model-ranked confidence",
        }
      : null,
    upside != null
      ? {
          key: "upside",
          label: "Upside",
          value: formatUpside(upside),
          subtext: "Target vs current price",
        }
      : null,
    entryLow != null || entryHigh != null
      ? {
          key: "entry-range",
          label: "Entry range",
          value: `${money(entryLow)} – ${money(entryHigh)}`,
          subtext: "Preferred accumulation zone",
        }
      : null,
    stop != null
      ? {
          key: "stop-loss",
          label: "Stop loss",
          value: money(stop),
          subtext: "Risk management level",
        }
      : null,
    {
      key: "tier",
      label: "Tier",
      value: row.tier ?? "Signal",
      subtext: "Current internal rating",
    },
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    value: string;
    subtext: string;
  }>;

  const executionCards = [
    analysisPrice != null
      ? {
          key: "current-price",
          label: "Current price",
          value: money(analysisPrice),
        }
      : null,
    entryLow != null || entryHigh != null
      ? {
          key: "accumulation-range",
          label: "Accumulation range",
          value: `${money(entryLow)} – ${money(entryHigh)}`,
        }
      : null,
    target != null || stop != null
      ? {
          key: "target-stop",
          label: "Target / stop",
          value: `${money(target)} / ${money(stop)}`,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    value: string;
  }>;

  return (
    <>
      <section className="glow-panel overflow-hidden rounded-4xl p-0 shadow-[0_0_40px_rgba(16,185,129,0.18)]">
        <div className="px-4 py-4 md:px-8 md:py-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07111f] p-5 md:p-8">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.14]"
              style={{
                backgroundImage: "url('/backgrounds/sigi-grid.png')",
                backgroundSize: "cover",
                backgroundPosition: "right center",
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-[#07111f] via-[#07111f]/85 to-[#07111f]/35" />
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-cyan-400/30 via-cyan-400/10 to-transparent" />

            <div className="relative z-10">
          <PageHeaderBlock
            eyebrow={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/"
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs font-medium text-white/70 transition hover:bg-white/8 hover:text-white"
                >
                  Today
                </Link>
                <div
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tierStyles(
                    row.tier
                  )}`}
                >
                  {row.tier ?? "Signal"}
                </div>
                {exchangeBadge ? (
                  <div className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                    {exchangeBadge}
                  </div>
                ) : null}
              </div>
            }
            title={
              <span className="flex flex-wrap items-center gap-4">
                <TickerLogo ticker={liveTicker} size={56} />
                <span className="flex min-w-0 flex-col">
                  <span>{row.ticker}</span>
                  <span className="mt-1 text-lg font-medium text-white/70 md:text-xl">
                    {companyName}
                  </span>
                </span>
              </span>
            }
            description={`${row.sector ?? "Sector"} • As of ${row.as_of_date ?? "latest signal"}`}
            actions={
              <>
                {companyProfile?.weburl ? (
                  <a
                    href={companyProfile.weburl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                  >
                    {companyProfile.logo ? (
                      <img
                        src={companyProfile.logo}
                        alt=""
                        className="h-5 w-5 rounded-full"
                      />
                    ) : null}

                    Visit {companyProfile.name ?? liveTicker}
                  </a>
                ) : null}
                <Link
                  href={buildPreviewHref(`/stocks/${liveTicker.toLowerCase()}/workspace`)}
                  className="inline-flex min-h-11 items-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/15 hover:text-white"
                >
                  Open Trading Workspace
                </Link>
                <a
                  href="#live-day-chart"
                  className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/75 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
                >
                  Live Day Chart
                </a>
                <button
                  type="button"
                  onClick={() => addStoredWatchlistTicker(liveTicker)}
                  disabled={isTracked}
                  className="min-h-11 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200 transition hover:border-emerald-300/45 hover:bg-emerald-500/20 hover:text-white disabled:cursor-default disabled:opacity-70"
                >
                  {isTracked ? "Tracked ✓" : "+ Add to Watchlist"}
                </button>
              </>
            }
            titleClassName="text-3xl md:text-6xl"
            descriptionClassName="max-w-none text-sm leading-6 text-white/55 md:text-base"
            className="border-white/0 bg-transparent p-0 md:p-0"
          >
            {heroMetrics.length > 0 ? (
              <div className="grid gap-3 md:max-w-[320px] md:grid-cols-2">
                {heroMetrics.map((metric) => (
                  <div key={metric.key} className="glow-card-soft rounded-2xl p-4 text-right">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                      {metric.label}
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {metric.value}
                    </div>
                    {metric.subtext ? (
                      <div className={`mt-1 text-sm font-semibold ${metric.subtextClassName}`}>
                        {metric.subtext}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : fallbackMessage ? (
              <div className="max-w-2xl rounded-2xl border border-amber-400/18 bg-amber-400/6 px-4 py-4 text-sm leading-7 text-white/72">
                {fallbackMessage}
              </div>
            ) : null}
          </PageHeaderBlock>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-6 md:grid-cols-2 md:px-8 xl:grid-cols-5">
          {summaryCards.map((card) => (
            <StatCard
              key={card.key}
              label={card.label}
              value={card.value}
              subtext={card.subtext}
            />
          ))}
        </div>
      </section>

      <section id="live-day-chart" className="glow-card rounded-[28px] p-4 scroll-mt-28 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300/75">
              In-Place Chart
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
              {liveTicker} Live Day Chart
            </h2>
            <p className="mt-1 text-sm text-white/55">
              Intraday chart stays inside the stock detail page so you can keep signal context,
              target levels, and execution guidance in view.
            </p>
          </div>

          <div className="hidden flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] md:flex">
            <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-cyan-200">
              Detail Page Embedded
            </div>
            <Link
              href={buildPreviewHref(`/stocks/${liveTicker.toLowerCase()}/workspace`)}
              className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-cyan-200 transition hover:border-cyan-300/35 hover:bg-cyan-400/16 hover:text-white"
            >
              Open Trading Workspace
            </Link>
            <Link
              href={buildPreviewHref(`/stocks/${liveTicker}/workspace`)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/75 transition hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-white"
            >
              Open Workspace ↗
            </Link>
          </div>
        </div>

        <details className="mt-4 rounded-2xl border border-white/10 bg-white/4 p-4 md:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-left">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/75">
                Chart Controls
              </div>
              <div className="mt-1 text-sm text-white/58">
                Quick workspace, watchlist, and portfolio actions.
              </div>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
              Open
            </span>
          </summary>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addStoredWatchlistTicker(liveTicker)}
              disabled={isTracked}
              className="inline-flex min-h-11 items-center rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200 transition hover:border-emerald-300/45 hover:bg-emerald-500/20 hover:text-white disabled:cursor-default disabled:opacity-70"
            >
              {isTracked ? "Tracked ✓" : "+ Add to Watchlist"}
            </button>

            <Link
              href={`/portfolio?focus=${liveTicker}`}
              className="inline-flex min-h-11 items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200 transition hover:border-amber-300/35 hover:bg-amber-400/16 hover:text-white"
            >
              Open Portfolio
            </Link>

            <Link
              href={buildPreviewHref(`/stocks/${liveTicker.toLowerCase()}/workspace`)}
              className="inline-flex min-h-11 items-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/15 hover:text-white"
            >
              Workspace
            </Link>
          </div>
        </details>

        <div className="mt-5 overflow-hidden rounded-3xl border border-cyan-400/15 bg-[radial-gradient(circle_at_top,rgba(0,160,255,0.08),transparent_28%),linear-gradient(180deg,rgba(5,10,20,0.96),rgba(0,0,0,0.98))] shadow-[0_0_45px_rgba(0,145,255,0.08)]">
          <div className="min-h-220 w-full p-0.5 md:p-3">
            <div className="h-full overflow-hidden rounded-[20px] border border-cyan-400/12 bg-black/70 shadow-[inset_0_0_25px_rgba(0,140,255,0.08)]">
              <div className="min-h-220 w-full">
                <LiveStockChart
                  ticker={liveTicker}
                  expanded
                  showSignalRail={false}
                  signals={[]}
                  currentPrice={analysisPrice}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="glow-card rounded-[28px] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white">
              SignalOS master score
            </div>
            <div className="mt-1 text-sm text-white/45">
              Unified technical, fundamental, and conviction score
            </div>
          </div>

          <div className="text-right">
            <div className={`text-3xl font-semibold ${masterSignalScore.tone}`}>
              {masterSignalScore.score}
            </div>
            <div className={`mt-1 text-sm font-medium ${masterSignalScore.tone}`}>
              {masterSignalScore.label}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/3 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              Technical
            </div>
            <div className="mt-2 text-xl font-semibold text-white">
              {masterSignalScore.breakdown.technical}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/3 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              Fundamental
            </div>
            <div className="mt-2 text-xl font-semibold text-white">
              {masterSignalScore.breakdown.fundamental}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/3 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              Conviction
            </div>
            <div className="mt-2 text-xl font-semibold text-white">
              {masterSignalScore.breakdown.conviction}
            </div>
          </div>
        </div>
      </section>

      <TechnicalIntelligenceCard
        price={technicalAnchorPrice}
        sma20={technicals.sma20}
        sma50={technicals.sma50}
        atrPct={technicals.atrPct}
        rsi14={technicals.rsi14}
        support20={technicals.support20}
        resistance20={technicals.resistance20}
        structure={technicals.structure}
      />

      <div className="glow-card rounded-[28px] p-5">
        <div className="text-lg font-semibold tracking-tight text-white">
          Execution view
        </div>

        {executionCards.length > 0 ? (
          <div className="mt-4 space-y-3">
            {executionCards.map((card) => (
              <div key={card.key} className="glow-card-soft rounded-2xl p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                  {card.label}
                </div>
                <div className="mt-2 text-xl font-semibold text-white">
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        ) : !hasLiveData && fallbackMessage ? (
          <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/3 px-4 py-5 text-sm text-white/55">
            {fallbackMessage}
          </div>
        ) : null}
      </div>
    </>
  );
}