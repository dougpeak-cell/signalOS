"use client";

import { useEffect } from "react";
import IndexSparkline from "@/components/market/IndexSparkline";
import { useLiveMarket } from "@/components/market/LiveMarketProvider";

const MARKET_INDEX_TICKERS = ["^GSPC", "^IXIC", "^DJI", "^RUT", "^VIX", "^TNX"];

type LiveIndexQuote = {
  price?: number | null;
  change?: number | null;
  changePct?: number | null;
  changePercent?: number | null;
};

type MarketIndexCard = {
  ticker: string;
  label: string;
  priceDisplay: string;
  changeDisplay: string;
  changePercentDisplay: string;
  change?: number | null;
  changePercent?: number | null;
};

function getQuoteByTicker(
  quoteMap: Record<string, LiveIndexQuote | undefined>,
  ticker: string
) {
  if (ticker === "^VIX") {
    return quoteMap["^VIX"] ?? quoteMap["VIX"];
  }

  if (ticker === "^TNX") {
    return quoteMap["^TNX"] ?? quoteMap["TNX"];
  }

  return quoteMap[ticker];
}

function getChangePercent(quote: LiveIndexQuote | undefined): number {
  return Number(quote?.changePercent ?? quote?.changePct ?? 0);
}

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.00";
}

function formatSignedNumber(value: number, digits = 2) {
  const normalized = Number.isFinite(value) ? value : 0;
  return `${normalized >= 0 ? "+" : ""}${normalized.toFixed(digits)}`;
}

function formatLocaleNumber(value: number) {
  return Number.isFinite(value) ? value.toLocaleString() : "0";
}

function getHistoryByTicker(
  historyMap: Record<string, number[] | undefined>,
  ticker: string
) {
  if (ticker === "^VIX") {
    return historyMap["^VIX"] ?? historyMap["VIX"];
  }

  if (ticker === "^TNX") {
    return historyMap["^TNX"] ?? historyMap["TNX"];
  }

  return historyMap[ticker];
}

function alignSparklineToQuote(
  series: number[] | undefined,
  price?: number | null
) {
  if (!Array.isArray(series) || !series.length) return [];

  const aligned = [...series];

  if (price != null && Number.isFinite(price) && price > 0) {
    aligned[aligned.length - 1] = Number(price);
  }

  return aligned;
}

export default function TodayIndexBar() {
  const { quoteMap, historyMap, ensureQuotes, ensureHistory } = useLiveMarket();

  useEffect(() => {
    ensureQuotes(MARKET_INDEX_TICKERS);
    ensureHistory(MARKET_INDEX_TICKERS);
  }, [ensureHistory, ensureQuotes]);

  const indices: MarketIndexCard[] = [
    {
      ticker: "^GSPC",
      label: "S&P 500",
      priceDisplay: formatLocaleNumber(Number(getQuoteByTicker(quoteMap, "^GSPC")?.price ?? 0)),
      changeDisplay: formatSignedNumber(Number(getQuoteByTicker(quoteMap, "^GSPC")?.change ?? 0)),
      changePercentDisplay: `${formatSignedNumber(getChangePercent(getQuoteByTicker(quoteMap, "^GSPC")))}%`,
      change: getQuoteByTicker(quoteMap, "^GSPC")?.change ?? 0,
      changePercent: getChangePercent(getQuoteByTicker(quoteMap, "^GSPC")),
    },
    {
      ticker: "^IXIC",
      label: "Nasdaq",
      priceDisplay: formatLocaleNumber(Number(getQuoteByTicker(quoteMap, "^IXIC")?.price ?? 0)),
      changeDisplay: formatSignedNumber(Number(getQuoteByTicker(quoteMap, "^IXIC")?.change ?? 0)),
      changePercentDisplay: `${formatSignedNumber(getChangePercent(getQuoteByTicker(quoteMap, "^IXIC")))}%`,
      change: getQuoteByTicker(quoteMap, "^IXIC")?.change ?? 0,
      changePercent: getChangePercent(getQuoteByTicker(quoteMap, "^IXIC")),
    },
    {
      ticker: "^DJI",
      label: "Dow",
      priceDisplay: formatLocaleNumber(Number(getQuoteByTicker(quoteMap, "^DJI")?.price ?? 0)),
      changeDisplay: formatSignedNumber(Number(getQuoteByTicker(quoteMap, "^DJI")?.change ?? 0)),
      changePercentDisplay: `${formatSignedNumber(getChangePercent(getQuoteByTicker(quoteMap, "^DJI")))}%`,
      change: getQuoteByTicker(quoteMap, "^DJI")?.change ?? 0,
      changePercent: getChangePercent(getQuoteByTicker(quoteMap, "^DJI")),
    },
    {
      ticker: "^RUT",
      label: "Russell 2000",
      priceDisplay: formatLocaleNumber(Number(getQuoteByTicker(quoteMap, "^RUT")?.price ?? 0)),
      changeDisplay: formatSignedNumber(Number(getQuoteByTicker(quoteMap, "^RUT")?.change ?? 0)),
      changePercentDisplay: `${formatSignedNumber(getChangePercent(getQuoteByTicker(quoteMap, "^RUT")))}%`,
      change: getQuoteByTicker(quoteMap, "^RUT")?.change ?? 0,
      changePercent: getChangePercent(getQuoteByTicker(quoteMap, "^RUT")),
    },
    {
      ticker: "^VIX",
      label: "VIX",
      priceDisplay: formatNumber(Number(getQuoteByTicker(quoteMap, "^VIX")?.price ?? 0)),
      changeDisplay: formatSignedNumber(Number(getQuoteByTicker(quoteMap, "^VIX")?.change ?? 0)),
      changePercentDisplay: `${formatSignedNumber(getChangePercent(getQuoteByTicker(quoteMap, "^VIX")))}%`,
      change: getQuoteByTicker(quoteMap, "^VIX")?.change ?? 0,
      changePercent: getChangePercent(getQuoteByTicker(quoteMap, "^VIX")),
    },
    {
      ticker: "^TNX",
      label: "10Y Yield",
      priceDisplay: formatNumber(Number(getQuoteByTicker(quoteMap, "^TNX")?.price ?? 0)),
      changeDisplay: formatSignedNumber(Number(getQuoteByTicker(quoteMap, "^TNX")?.change ?? 0)),
      changePercentDisplay: `${formatSignedNumber(getChangePercent(getQuoteByTicker(quoteMap, "^TNX")))}%`,
      change: getQuoteByTicker(quoteMap, "^TNX")?.change ?? 0,
      changePercent: getChangePercent(getQuoteByTicker(quoteMap, "^TNX")),
    },
  ];

  return (
    <section className="rounded-[28px] border border-white/10 bg-black/40 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
            Market Indices
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
            Live market strip
          </h2>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {indices.map((index) => {
          const symbol = index.ticker;
          const quote = getQuoteByTicker(quoteMap, symbol);
          const changePercent = index.changePercent ?? 0;
          const isVix = symbol === "VIX" || symbol === "^VIX";
          const isPositive = changePercent >= 0;
          const sparklinePoints = alignSparklineToQuote(
            getHistoryByTicker(historyMap, symbol),
            quote?.price ?? null
          );

          let visualPositive = isPositive;

          if (isVix) {
            visualPositive = !isPositive;
          }

          const lineColor = visualPositive
            ? "text-emerald-400"
            : "text-rose-400";

          const percentColor = visualPositive
            ? "text-emerald-300"
            : "text-rose-300";

        return (
            <div
              key={index.ticker}
              className="rounded-3xl border border-white/10 bg-white/3 p-4 backdrop-blur-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                    {index.label}
                  </div>

                  <div className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    {index.priceDisplay}
                  </div>
                </div>

                <div
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    visualPositive
                      ? `bg-emerald-500/15 ${percentColor}`
                      : `bg-rose-500/15 ${percentColor}`
                  }`}
                >
                  {index.changePercentDisplay}
                </div>
              </div>

              <div className={`mt-2 text-sm ${lineColor}`}>
                {index.changeDisplay}
              </div>

              <div className="mt-6">
                <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/35">
                  Intraday
                </div>

                <div className="overflow-hidden rounded-2xl bg-white/3 px-1 py-1">
                {isVix ? (
                  <IndexSparkline
                    points={sparklinePoints}
                    positive={changePercent < 0}
                    variant="risk"
                  />
                ) : (
                  <IndexSparkline
                    points={sparklinePoints}
                    positive={changePercent >= 0}
                  />
                )}
                </div>
              </div>
            </div>
        );
        })}
      </div>
    </section>
  );
}
