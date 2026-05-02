"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo } from "react";
import { useLiveMarket } from "@/components/market/LiveMarketProvider";
import TodayLiveBootstrap from "@/components/today/TodayLiveBootstrap";

const MARKET_CHIPS = [
  { label: "SPY", ticker: "SPY" },
  { label: "QQQ", ticker: "QQQ" },
  { label: "IWM", ticker: "IWM" },
  { label: "DIA", ticker: "DIA" },
  { label: "VIX", ticker: "^VIX" },
];

function formatChipValue(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "--";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function changeTone(changePct: number | null | undefined) {
  if (changePct == null || !Number.isFinite(changePct)) {
    return "text-white/72";
  }

  if (changePct > 0) {
    return "text-emerald-300";
  }

  if (changePct < 0) {
    return "text-rose-300";
  }

  return "text-white/72";
}

export default function TodayStickyMarketStrip(): ReactElement {
  const { ensureQuotes, quoteMap, quoteLoadingMap } = useLiveMarket();

  useEffect(() => {
    ensureQuotes(MARKET_CHIPS.map((chip) => chip.ticker));
  }, [ensureQuotes]);

  const status = useMemo(() => {
    const trackedQuotes = MARKET_CHIPS.map((chip) => quoteMap[chip.ticker]).filter(Boolean);
    const isLoading = MARKET_CHIPS.some((chip) => quoteLoadingMap[chip.ticker]);
    const latestUpdate = trackedQuotes.reduce<number>(
      (max, quote) => Math.max(max, quote?.updatedAt ?? 0),
      0
    );

    if (isLoading && trackedQuotes.length === 0) {
      return { label: "Loading", tone: "text-amber-300" };
    }

    if (!latestUpdate) {
      return { label: "Waiting", tone: "text-white/65" };
    }

    const ageMs = Date.now() - latestUpdate;
    if (ageMs <= 90_000) {
      return { label: "Live", tone: "text-emerald-300" };
    }

    return { label: "Delayed", tone: "text-amber-300" };
  }, [quoteLoadingMap, quoteMap]);

  return (
    <div className="sticky top-0 z-40 border-b border-cyan-500/10 bg-black/85 backdrop-blur-xl">
      <TodayLiveBootstrap />
      <div className="mx-auto flex w-full max-w-400 items-center gap-2 overflow-x-auto px-3 py-2 sm:px-4 lg:px-5 xl:px-6">
        <div className="mr-3 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
          Market Pulse
        </div>

        <div className="flex min-w-max items-center gap-2">
          {MARKET_CHIPS.map((chip) => {
            const quote = quoteMap[chip.ticker];
            const changePct = quote?.changePct ?? null;

            return (
              <div
                key={chip.ticker}
                className="flex min-w-27 items-center justify-between gap-3 rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs"
              >
                <span className="font-semibold tracking-[0.14em] text-white/80">
                  {chip.label}
                </span>
                <span className={changeTone(changePct)}>
                  {formatChipValue(changePct)}
                </span>
              </div>
            );
          })}

          <div className="flex min-w-27 items-center justify-between gap-3 rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs">
            <span className="font-semibold tracking-[0.14em] text-white/80">Status</span>
            <span className={status.tone}>{status.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}