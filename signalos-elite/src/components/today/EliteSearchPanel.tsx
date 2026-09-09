"use client";

import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import WatchlistToggleButton from "@/components/watchlist/WatchlistToggleButton";
import type { TodayEliteSearchItem } from "@/lib/today/pageData";

function formatChange(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function EliteSearchPanel({ items }: { items: TodayEliteSearchItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-amber-300/20 bg-[linear-gradient(135deg,rgba(120,53,15,0.24),rgba(2,6,23,0.94)_45%,rgba(8,47,73,0.38))] p-4 shadow-[0_12px_34px_rgba(0,0,0,0.28)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200"><Sparkles className="size-3.5" />Elite Search</div>
          <h2 className="mt-1 text-lg font-semibold text-white">Most researched market attention</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/58">Attention Scan ranks live price activity, relative volume, and fresh catalysts. It is not a Sigi conviction ranking.</p>
        </div>
        <Link href="/stocks" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-200/20 bg-amber-200/8 px-3 text-xs font-semibold text-amber-100 hover:bg-amber-200/14"><Search className="size-3.5" />Search a stock</Link>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {items.map((item, index) => (
          <div key={item.ticker} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/8 bg-black/25 p-3">
            <div className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-amber-200/75">{index + 1}</div>
            <Link href={`/stocks/${item.ticker}/live?source=%2Ftoday`} className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{item.ticker}</div>
              <div className="mt-0.5 truncate text-[11px] text-white/46">{item.reasonLabel}</div>
            </Link>
            <div className="shrink-0 text-right"><div className={`text-xs font-semibold tabular-nums ${item.changePercent != null && item.changePercent < 0 ? "text-rose-300" : "text-emerald-300"}`}>{formatChange(item.changePercent)}</div><div className="mt-0.5 text-[10px] text-white/40">Attention {item.attentionScore}</div></div>
            <WatchlistToggleButton compact ticker={item.ticker} metadata={{ name: item.name, price: item.price, changePercent: item.changePercent, thesis: item.reasonLabel }} />
          </div>
        ))}
      </div>
    </section>
  );
}