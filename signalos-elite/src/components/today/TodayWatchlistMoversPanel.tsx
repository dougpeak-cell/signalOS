"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useLiveMarket } from "@/components/market/LiveMarketProvider";
import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import { SectionHeader } from "@/components/today/SectionHeader";
import {
  internalCardStackClass,
  rowListItemClass,
  supportSectionClass,
} from "@/components/today/TodayLayoutPrimitives";
import { useSyncedWatchlist } from "@/hooks/useSyncedWatchlist";
import { readWatchlistEntries } from "@/lib/watchlist/localWatchlist";
import type { TodayWatchlistMoverRow } from "@/lib/today/pageData";

function normalizeTicker(value: string) {
  return value.trim().toUpperCase();
}

function percentClass(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "text-white/45";
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-white/45";
}

function formatPercent(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function pulseBadgeClass(tone?: "positive" | "neutral" | "negative" | null) {
  if (tone === "positive") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  if (tone === "negative") return "border-rose-400/20 bg-rose-400/10 text-rose-200";
  return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
}

export default function TodayWatchlistMoversPanel({
  rows,
}: {
  rows: TodayWatchlistMoverRow[];
}) {
  const { setActiveTicker } = useSelectedTicker();
  const { quoteMap, ensureQuotes } = useLiveMarket();
  const { tickers: syncedWatchlistTickers } = useSyncedWatchlist();

  const syncedWatchlistRows = useMemo(() => {
    const storedEntries = new Map(
      readWatchlistEntries().map((entry) => [normalizeTicker(entry.ticker), entry])
    );

    return syncedWatchlistTickers
      .map((ticker) => normalizeTicker(ticker))
      .filter(Boolean)
      .flatMap((ticker) => {
        const quote = quoteMap[ticker];
        const storedEntry = storedEntries.get(ticker);
        const changePct = quote?.changePct ?? storedEntry?.changePercent ?? null;

        if (changePct == null || changePct <= 0) {
          return [];
        }

        const fallbackRow = rows.find((row) => normalizeTicker(row.ticker) === ticker);

        return [
          {
            ticker,
            name: quote?.name ?? storedEntry?.name ?? fallbackRow?.name ?? ticker,
            price: quote?.price ?? storedEntry?.currentPrice ?? storedEntry?.price ?? fallbackRow?.price ?? null,
            changePct,
            pulse: fallbackRow?.pulse ?? null,
          } satisfies TodayWatchlistMoverRow,
        ];
      })
      .sort((left, right) => (right.changePct ?? 0) - (left.changePct ?? 0));
  }, [quoteMap, rows, syncedWatchlistTickers]);

  const watchlistQuoteSignature = useMemo(
    () => syncedWatchlistTickers.map((ticker) => normalizeTicker(ticker)).filter(Boolean).join(","),
    [syncedWatchlistTickers]
  );

  useEffect(() => {
    if (syncedWatchlistTickers.length) {
      ensureQuotes(syncedWatchlistTickers);
    }
  }, [ensureQuotes, syncedWatchlistTickers, watchlistQuoteSignature]);

  const visibleRows = useMemo(() => {
    const seenTickers = new Set<string>();

    const sourceRows = syncedWatchlistRows.length ? syncedWatchlistRows : rows;

    return sourceRows.filter((row) => {
      const ticker = row.ticker.trim().toUpperCase();
      if (!ticker || seenTickers.has(ticker)) {
        return false;
      }

      seenTickers.add(ticker);
      return true;
    }).slice(0, 4);
  }, [rows, syncedWatchlistRows]);

  return (
    <section className={supportSectionClass}>
      <SectionHeader
        eyebrow="Watchlist Movers"
        title="Saved names moving"
        subtitle="Fast read on the names you already care about."
        action={
          <Link href="/watchlist" className="text-xs text-white/70 hover:text-white">
            Open Watchlist
          </Link>
        }
      />

      <div className={internalCardStackClass}>
        {visibleRows.length ? (
          visibleRows.map((row) => (
            <Link
              key={row.ticker}
              href={`/stocks/${row.ticker}`}
              onClick={() => setActiveTicker(row.ticker)}
              className={`flex items-center justify-between rounded-2xl border border-white/10 bg-white/3 transition hover:border-cyan-400/25 hover:bg-cyan-400/5 ${rowListItemClass}`}
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">{row.ticker}</div>
                <div className="truncate text-xs text-white/45">{row.name}</div>
                {row.pulse?.topLabel ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      title={row.pulse.headline}
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${pulseBadgeClass(
                        row.pulse.tone
                      )}`}
                    >
                      {row.pulse.topLabel}
                    </span>
                    {row.pulse.newestAgeLabel ? (
                      <span className="text-[10px] text-white/38">{row.pulse.newestAgeLabel}</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="text-right">
                <div className="text-sm text-white">
                  {row.price != null ? `$${row.price.toFixed(2)}` : "--"}
                </div>
                <div className={`text-xs ${percentClass(row.changePct)}`}>
                  {formatPercent(row.changePct)}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 px-3 py-5 text-sm text-white/50">
            Save names to your watchlist to see server-backed movers here.
          </div>
        )}
      </div>
    </section>
  );
}