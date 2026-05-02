"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo } from "react";
import { useLiveMarket } from "@/components/market/LiveMarketProvider";

const SNAPSHOTS = [
  { label: "S&P 500", ticker: "^GSPC" },
  { label: "Nasdaq", ticker: "^IXIC" },
  { label: "Russell 2000", ticker: "^RUT" },
  { label: "Dow", ticker: "^DJI" },
  { label: "VIX", ticker: "^VIX" },
] as const;

function alignSparklineToQuote(series: number[], price?: number | null) {
  if (!series.length) return [];

  const aligned = [...series];

  if (price != null && Number.isFinite(price) && price > 0) {
    aligned[aligned.length - 1] = Number(price);
  }

  return aligned;
}

function buildSparklinePath(series: number[], width = 120, height = 32) {
  if (!series.length) return "";

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;

  return series
    .map((value, index) => {
      const x = (index / Math.max(series.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function sparklineStroke(changePct?: number | null) {
  if (changePct == null) return "#94a3b8";
  return changePct >= 0 ? "#34d399" : "#fb7185";
}

function pctClass(changePct?: number | null) {
  if (changePct == null) return "text-white/45";
  if (changePct > 0) return "text-emerald-300";
  if (changePct < 0) return "text-rose-300";
  return "text-white/60";
}

function trendLabel(series: number[], changePct?: number | null) {
  if (series.length >= 2) {
    const first = series[0] ?? null;
    const last = series[series.length - 1] ?? null;
    if (first != null && last != null) {
      if (last > first) return "trend up";
      if (last < first) return "trend down";
    }
  }

  if (changePct != null) {
    if (changePct > 0) return "trend up";
    if (changePct < 0) return "trend down";
  }

  return "trend flat";
}

export default function TodayMarketSnapshotStrip(): ReactElement {
  const { ensureQuotes, ensureHistory, quoteMap, historyMap } = useLiveMarket();

  useEffect(() => {
    const tickers = SNAPSHOTS.map((item) => item.ticker);
    ensureQuotes(tickers);
    ensureHistory(tickers);
  }, [ensureHistory, ensureQuotes]);

  const cards = useMemo(
    () =>
      SNAPSHOTS.map((item) => {
        const quote = quoteMap[item.ticker];
        const history = alignSparklineToQuote(historyMap[item.ticker] ?? [], quote?.price);

        return {
          ...item,
          price: quote?.price ?? null,
          changePct: quote?.changePct ?? null,
          path: buildSparklinePath(history, 120, 32),
          stroke: sparklineStroke(quote?.changePct ?? null),
          trend: trendLabel(history, quote?.changePct ?? null),
        };
      }),
    [historyMap, quoteMap]
  );

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-cyan-500/15 bg-slate-950/78 p-4 shadow-[0_8px_22px_rgba(0,0,0,0.28)]"
        >
          <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/70">
            {item.label}
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {item.price != null ? item.price.toFixed(2) : "--"}
          </div>
          <div className={`mt-1 text-sm ${pctClass(item.changePct)}`}>
            {item.changePct != null
              ? `${item.changePct >= 0 ? "+" : ""}${item.changePct.toFixed(2)}%`
              : "--"}
          </div>
          <div className="mt-3 h-10 rounded-xl border border-white/5 bg-white/2">
            {item.path ? (
              <svg
                viewBox="0 0 120 32"
                className="h-full w-full"
                preserveAspectRatio="none"
              >
                <path
                  d={item.path}
                  fill="none"
                  stroke={item.stroke}
                  strokeWidth="2.25"
                  strokeLinecap="round"
                />
              </svg>
            ) : null}
          </div>
          <div className="mt-2 text-[11px] text-white/45">{item.trend}</div>
        </div>
      ))}
    </section>
  );
}