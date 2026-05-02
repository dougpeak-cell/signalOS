"use client";

import { useEffect, useMemo, useState } from "react";

type MacroItemSeed = {
  label: string;
  quoteTicker: string;
  fallbackValue: number;
  fallbackChangePercent: number;
  valueSuffix?: string;
};

type BatchQuoteItem = {
  ticker: string;
  price: number | null;
  currentPrice: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
};

type BatchQuoteResponse = {
  quotes?: BatchQuoteItem[];
};

const MACRO_POLL_MS = 30_000;

function parseMacroValue(value: string): number | null {
  const parsed = Number(value.replace(/[$,%]/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function getVixLevel(price: number | null): string | null {
  if (price == null) return null;
  return price < 15 ? "Low Vol" : price < 25 ? "Normal" : "High Risk";
}

function toneClasses(tone: MacroItem["tone"]) {
  switch (tone) {
    case "bullish":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
    case "bearish":
      return "border-rose-500/25 bg-rose-500/10 text-rose-300";
    default:
      return "border-white/10 bg-white/[0.04] text-white/75";
  }
}

type MacroItem = {
  label: string;
  ticker: string;
  value: string;
  change: string;
  tone: "bullish" | "bearish" | "neutral";
};

const macroTapeSeeds: MacroItemSeed[] = [
  { label: "SPY", quoteTicker: "SPY", fallbackValue: 598.42, fallbackChangePercent: 0.82 },
  { label: "QQQ", quoteTicker: "QQQ", fallbackValue: 521.18, fallbackChangePercent: 1.21 },
  { label: "VIX", quoteTicker: "^VIX", fallbackValue: 14.92, fallbackChangePercent: -4.2 },
  { label: "DXY", quoteTicker: "UUP", fallbackValue: 103.84, fallbackChangePercent: -0.31 },
  { label: "TNX", quoteTicker: "^TNX", fallbackValue: 4.11, fallbackChangePercent: 0.06, valueSuffix: "%" },
];

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

function formatMacroValue(value: number, suffix = ""): string {
  const digits = suffix === "%" ? 2 : value >= 100 ? 2 : 2;
  return `${value.toFixed(digits)}${suffix}`;
}

function formatChangePercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function toneFromChange(label: string, changePercent: number): MacroItem["tone"] {
  if (label === "VIX" || label === "TNX") {
    if (changePercent > 0) return "bearish";
    if (changePercent < 0) return "bullish";
    return "neutral";
  }

  if (changePercent > 0) return "bullish";
  if (changePercent < 0) return "bearish";
  return "neutral";
}

export default function StickyMacroStrip() {
  const [quoteMap, setQuoteMap] = useState<Record<string, BatchQuoteItem>>({});

  const requestedTickers = useMemo(
    () => macroTapeSeeds.map((item) => item.quoteTicker).join(","),
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function loadQuotes() {
      try {
        const response = await fetch(`/api/quotes?tickers=${encodeURIComponent(requestedTickers)}`, {
          method: "GET",
          headers: {
            accept: "application/json",
          },
          cache: "no-store",
        });

        if (!response.ok) return;

        const payload = (await response.json()) as BatchQuoteResponse;
        const nextMap = Object.fromEntries(
          (payload.quotes ?? []).map((item) => [normalizeTicker(item.ticker), item])
        ) as Record<string, BatchQuoteItem>;

        if (!cancelled) {
          setQuoteMap(nextMap);
        }
      } catch {
        // Keep seeded fallback values visible when live quotes fail.
      }
    }

    void loadQuotes();
    const intervalId = window.setInterval(() => {
      void loadQuotes();
    }, MACRO_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [requestedTickers]);

  const macroTape: MacroItem[] = useMemo(
    () =>
      macroTapeSeeds.map((item) => {
        const liveQuote = quoteMap[normalizeTicker(item.quoteTicker)];
        const value = liveQuote?.price ?? liveQuote?.currentPrice ?? item.fallbackValue;
        const changePercent = liveQuote?.changePercent ?? item.fallbackChangePercent;

        return {
          label: item.label,
          ticker: item.quoteTicker,
          value: formatMacroValue(value, item.valueSuffix),
          change: formatChangePercent(changePercent),
          tone: toneFromChange(item.label, changePercent),
        };
      }),
    [quoteMap]
  );

  return (
    <div className="sticky top-13 z-30 border-b border-cyan-400/10 bg-black/75 backdrop-blur-xl">
      <div className="signalos-thin-scrollbar mx-auto flex w-full max-w-430 items-center overflow-x-auto px-5 py-2.5">
        <div className="macro-strip-marquee flex min-w-0 items-center gap-2 pr-2">
          {[0, 1].map((copyIndex) => (
            <div key={copyIndex} className="flex shrink-0 items-center gap-2">
              {macroTape.map((item) => {
                const price = parseMacroValue(item.value);
                const vixLevel = item.label === "VIX" ? getVixLevel(price) : null;

                return (
                  <div
                    key={`${copyIndex}-${item.label}`}
                    className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-[11px] ${toneClasses(item.tone)}`}
                  >
                    <span className="font-semibold tracking-[0.16em] text-white/55">
                      {item.label}
                    </span>
                    <span className="font-semibold text-white">{item.value}</span>
                    <span className="text-[10px] font-semibold">{item.change}</span>
                    {item.label === "VIX" && vixLevel ? (
                      <div className="text-[10px] text-white/40">{vixLevel}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Regime/Risk block removed as requested */}
      </div>
    </div>
  );
}