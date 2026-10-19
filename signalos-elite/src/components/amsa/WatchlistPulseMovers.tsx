"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { AMSAPulseSnapshot } from "@/lib/amsa/types";
import { distinctVerifiedStockReadings } from "@/lib/amsa/evolution/mobilePulse";
import { detectPulseChanges } from "@/lib/amsa/evolution/changeDetection";
import { ArrowRight } from "lucide-react";

export default function WatchlistPulseMovers({
  symbols,
}: {
  symbols: string[];
}) {
  const symbolKey = Array.from(new Set(symbols.map((symbol) => symbol.trim().toUpperCase())))
    .filter((symbol) => /^[A-Z0-9.\^-]{1,12}$/.test(symbol)).slice(0, 8).join(",");
  const [readings, setReadings] = useState<Array<{
    symbol: string;
    current: AMSAPulseSnapshot | null;
    previous: AMSAPulseSnapshot | null;
  }>>([]);

  useEffect(() => {
    if (!symbolKey) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);

    async function load() {
      try {
        const next = await Promise.all(symbolKey.split(",").map(async (symbol) => {
          try {
            const response = await fetch(
              `/api/amsa/evolution/stock/${encodeURIComponent(symbol)}?frequency=daily&limit=4`,
              { cache: "no-store", signal: controller.signal },
            );
            if (!response.ok) throw new Error("History unavailable");
            const payload = await response.json() as { snapshots?: AMSAPulseSnapshot[] };
            const verified = distinctVerifiedStockReadings(payload.snapshots ?? []).filter((point) => point.entityKey === symbol);
            return { symbol, current: verified.at(-1) ?? null, previous: verified.at(-2) ?? null };
          } catch {
            return { symbol, current: null, previous: null };
          }
        }));
        if (!cancelled) setReadings(next);
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [symbolKey]);

  if (!symbolKey) {
    return null;
  }

  return (
    <section aria-label="Watchlist Pulse changes" className="mb-5 border-y border-teal-300/15 py-4">
      <h2 className="text-sm font-semibold text-teal-200">Watchlist Pulse</h2>
      <p className="mt-1 text-[10px] text-white/45">Saved verified readings &middot; First 8 watched companies</p>
      <div className="mt-3 divide-y divide-white/10">
        {symbolKey.split(",").map((symbol) => {
          const row = readings.find((reading) => reading.symbol === symbol);
          const current = row?.current;
          const previous = row?.previous;
          const change = current && previous ? current.score! - previous.score! : null;
          const evidence = current && previous ? detectPulseChanges(current, previous).componentChanges
            .filter((component) => component.change !== null && component.change !== 0)
            .sort((first, second) => Math.abs(second.change!) - Math.abs(first.change!))[0]?.message : null;
          return <Link key={symbol} href={`/pulse?symbol=${encodeURIComponent(symbol)}`} className="flex min-h-20 items-center gap-3 py-3">
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">{symbol}</p><p className="mt-1 text-xs leading-5 text-white/50">{evidence ?? (row ? current ? "Awaiting a distinct comparison reading." : "Verified history unavailable." : "Loading verified history...")}</p>{current && <p className="mt-1 text-[10px] text-white/35">As of {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(current.sourceUpdatedAt!))}</p>}</div>
            <div className="shrink-0 text-right"><p className="font-mono text-xl text-teal-200">{current ? Math.round(current.score!) : "--"}</p><p className={`mt-1 text-[10px] ${change === null || change === 0 ? "text-white/40" : change > 0 ? "text-emerald-300" : "text-rose-300"}`}>{change === null ? "No comparison" : `${change > 0 ? "+" : ""}${change.toFixed(1)} Pulse`}</p></div><ArrowRight className="size-4 shrink-0 text-white/40" />
          </Link>;
        })}
      </div>
    </section>
  );
}
