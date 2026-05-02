"use client";

import { useMemo } from "react";
import { useLiveMarket } from "@/components/market/LiveMarketProvider";

type MarketStripSeed = {
  ticker: string;
  label: string;
  shortLabel?: string;
};

function normalizeTicker(value: string) {
  return value.trim().toUpperCase();
}

function pctClass(v?: number | null) {
  if (v == null) return "text-white/45";
  if (v > 0) return "text-emerald-400";
  if (v < 0) return "text-rose-400";
  return "text-white/45";
}

function alignSparklineToQuote(
  series: number[],
  price?: number | null
) {
  if (!series.length) return [];

  const aligned = [...series];

  if (price != null && Number.isFinite(price) && price > 0) {
    aligned[aligned.length - 1] = Number(price);
  }

  return aligned;
}

function sparklineStroke(changePct?: number | null) {
  if (changePct == null) return "#94a3b8";
  return changePct >= 0 ? "#34d399" : "#fb7185";
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

export default function TopMarketStrip({
  items,
}: {
  items: MarketStripSeed[];
}) {
  const { quoteMap, historyMap } = useLiveMarket();

  const rows = useMemo(
    () =>
      items.map((item) => {
        const ticker = normalizeTicker(item.ticker);
        const quote = quoteMap[ticker];
        const history = alignSparklineToQuote(historyMap[ticker] ?? [], quote?.price);
        const isUp = (quote?.changePct ?? 0) >= 0;

        return {
          ...item,
          ticker,
          price: quote?.price ?? null,
          changePct: quote?.changePct ?? null,
          history,
          path: buildSparklinePath(history, 120, 32),
          sparklineStroke: sparklineStroke(quote?.changePct ?? null),
          isUp,
        };
      }),
    [items, quoteMap, historyMap]
  );

  return (
    <section id="macro" className="rounded-[28px] border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] p-4 shadow-[0_0_0_1px_rgba(0,255,255,0.05),0_0_30px_rgba(0,255,255,0.08)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
            Market Indices
          </div>
          <div className="mt-1 text-sm text-white/50">
            One quick read on the tape.
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {rows.map((row) => (
          <div
            key={row.ticker}
            className="rounded-3xl border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] p-4 shadow-[0_0_0_1px_rgba(0,255,255,0.05),0_0_18px_rgba(0,255,255,0.06)]"
          >
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">
              {row.label}
            </div>

            <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
              {row.price != null ? row.price.toFixed(2) : "--"}
            </div>

            <div className={`mt-1 text-sm font-medium ${pctClass(row.changePct)}`}>
              {row.changePct != null
                ? `${row.changePct >= 0 ? "+" : ""}${row.changePct.toFixed(2)}%`
                : "--"}
            </div>

            <div className="mt-4 h-10">
              {row.path ? (
                <svg
                  viewBox="0 0 120 32"
                  className="h-full w-full"
                  preserveAspectRatio="none"
                >
                  <path
                    d={row.path}
                    fill="none"
                    stroke={row.sparklineStroke}
                    strokeWidth="2.25"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <div className="h-full w-full rounded-xl bg-cyan-400/6" />
              )}
            </div>

            <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-white/28">
              {row.shortLabel ?? row.ticker}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}