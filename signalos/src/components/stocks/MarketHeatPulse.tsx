"use client";

import { useEffect, useState } from "react";

type MarketHeatItem = {
  symbol: string;
  quoteTicker?: string;
  fallbackChangePct: number;
};

type QuoteResponse = {
  changePct?: number | null;
};

function heatTone(changePct: number) {
  if (changePct > 0) {
    return "text-emerald-300 border-emerald-500/20 bg-emerald-500/10";
  }

  if (changePct < 0) {
    return "text-rose-300 border-rose-500/20 bg-rose-500/10";
  }

  return "text-white/70 border-white/10 bg-white/[0.04]";
}

function formatHeatPct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "--";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function MarketHeatPulse({
  items,
}: {
  items: MarketHeatItem[];
}) {
  const [changes, setChanges] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((item) => [item.symbol, item.fallbackChangePct]))
  );

  useEffect(() => {
    let cancelled = false;

    async function loadChanges() {
      const results = await Promise.all(
        items.map(async (item) => {
          try {
            const res = await fetch(
              `/api/massive/quote?ticker=${encodeURIComponent(item.quoteTicker ?? item.symbol)}&ts=${Date.now()}`,
              { cache: "no-store" }
            );

            if (!res.ok) {
              return [item.symbol, item.fallbackChangePct] as const;
            }

            const json = (await res.json()) as QuoteResponse;

            return [
              item.symbol,
              typeof json.changePct === "number"
                ? json.changePct
                : item.fallbackChangePct,
            ] as const;
          } catch {
            return [item.symbol, item.fallbackChangePct] as const;
          }
        })
      );

      if (cancelled) return;

      setChanges(Object.fromEntries(results));
    }

    loadChanges();
    const intervalId = window.setInterval(loadChanges, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [items]);

  const loopItems = [...items, ...items];

  return (
    <section className="overflow-hidden rounded-[18px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(7,12,24,0.96),rgba(5,8,18,0.98))] shadow-[0_0_0_1px_rgba(0,255,200,0.03),0_0_16px_rgba(0,255,200,0.04)]">
      <div className="flex items-center gap-3 border-b border-white/8 px-4 py-2.5">
        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-300/85">
          Market Heat Pulse
        </div>
      </div>

      <div className="relative overflow-hidden">
        <div className="market-heat-marquee flex w-max items-center gap-3 px-4 py-3">
          {loopItems.map((item, index) => {
            const changePct = changes[item.symbol] ?? item.fallbackChangePct;

            return (
              <div
                key={`${item.symbol}-${index}`}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${heatTone(
                  changePct
                )}`}
              >
                <span className="tracking-[0.14em]">{item.symbol}</span>
                <span>{formatHeatPct(changePct)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}