"use client";

import { useEffect, useMemo, useState } from "react";

type PulseRow = {
  ticker: string;
  label: string;
  price: number | null;
  changePercent: number | null;
};

type MarketStatus = "live" | "last-close";

const INDEX_LABELS: Record<string, string> = {
  SPY: "S&P 500",
  QQQ: "Nasdaq 100",
  IWM: "Russell 2000",
  DIA: "Dow Jones",
  VIX: "Volatility Index",
};

const DEFAULT_ROWS = Object.entries(INDEX_LABELS).map(([ticker, label]) => ({
  ticker,
  label,
  price: null,
  changePercent: null,
}));

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function changeTone(value: number | null) {
  if (value == null) return "neutral";
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

function pct(value: number | null) {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatPrice(ticker: string, price?: number | null) {
  if (price == null) return "—";

  if (ticker === "VIX") return price.toFixed(2);
  return `$${price.toFixed(2)}`;
}

function MiniPulseLine({ positive }: { positive: boolean }) {
  const points = positive
    ? "0,22 12,18 24,20 36,12 48,15 60,8 72,10 84,4 96,6"
    : "0,6 12,9 24,7 36,14 48,12 60,18 72,16 84,23 96,20";

  return (
    <svg viewBox="0 0 96 28" className="h-3.5 w-10 shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-90"
      />
    </svg>
  );
}

export default function MarketPulseStrip() {
  const [rows, setRows] = useState<PulseRow[]>(DEFAULT_ROWS);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>("last-close");

  useEffect(() => {
    async function load() {
      const tickers = DEFAULT_ROWS.map((row) => row.ticker).join(",");

      try {
        const res = await fetch(`/api/quotes?tickers=${tickers}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          return;
        }

        const json = await res.json();
        const quoteRows = Array.isArray(json?.quotes)
          ? json.quotes
          : Array.isArray(json?.rows)
            ? json.rows
            : [];

        const mapped = DEFAULT_ROWS.map((base) => {
          const match = quoteRows.find((quote: any) => quote.ticker === base.ticker);

          return {
            ticker: base.ticker,
            label: base.label,
            price: match?.price ?? match?.currentPrice ?? null,
            changePercent: match?.changePercent ?? match?.changePct ?? null,
          };
        });

        setRows(mapped);
        setMarketStatus(json?.marketStatus === "live" ? "live" : "last-close");
      } catch {
        // Ignore transient fetch failures during reloads and hot updates.
      }
    }

    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  const marketTone = useMemo(() => {
    const spyChange = rows.find((row) => row.ticker === "SPY")?.changePercent ?? 0;
    const vix = rows.find((row) => row.ticker === "VIX")?.price ?? 0;

    return vix < 15 && spyChange > 0
      ? "Risk-On"
      : vix > 20
        ? "Risk-Off"
        : "Balanced";
  }, [rows]);

  const marketToneClassName = useMemo(() => {
    if (marketTone === "Risk-On") {
      return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
    }

    if (marketTone === "Risk-Off") {
      return "border-rose-400/25 bg-rose-400/10 text-rose-200";
    }

    return "border-cyan-400/25 bg-cyan-400/10 text-cyan-200";
  }, [marketTone]);

  const loopRows = useMemo(() => [...rows, ...rows], [rows]);

  return (
    <div className="sticky top-12 z-40 border-y border-cyan-500/10 bg-black/85 backdrop-blur-xl md:top-13">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-linear-to-r from-black to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-linear-to-l from-black to-transparent" />
        <div className="signalos-thin-scrollbar overflow-x-auto touch-pan-x">
          <div className="ticker-track flex h-10 w-max items-center gap-3 px-3 md:h-10.5 md:px-4">
          <div
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]",
              marketToneClassName
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                marketStatus === "live"
                  ? "bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                  : "bg-white/40"
              )}
            />
            {marketTone}
          </div>
        {loopRows.map((row, index) => {
          const tone = changeTone(row.changePercent);
          const positive = tone === "positive";
          const negative = tone === "negative";

          return (
            <div
              key={`${row.ticker}-${index}`}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3 py-1.5",
                positive && "border-emerald-400/20",
                negative && "border-rose-400/20",
                tone === "neutral" && "border-cyan-400/15"
              )}
            >
              <span className="text-[11px] font-bold text-white">{row.ticker}</span>
              <span className="text-[11px] text-white/65">{formatPrice(row.ticker, row.price)}</span>
              <span
                className={cn(
                  "text-[11px] font-semibold",
                  positive && "text-emerald-300",
                  negative && "text-rose-300",
                  tone === "neutral" && "text-cyan-200"
                )}
              >
                {pct(row.changePercent)}
              </span>
              <MiniPulseLine positive={positive || tone === "neutral"} />
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  positive && "bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.8)]",
                  negative && "bg-rose-300 shadow-[0_0_10px_rgba(251,113,133,0.8)]",
                  tone === "neutral" && "bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                )}
              />
            </div>
          );
        })}
          </div>
        </div>
      </div>
    </div>
  );
}