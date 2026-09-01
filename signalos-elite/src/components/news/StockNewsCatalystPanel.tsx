"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildNewsCatalystLabel,
  buildNewsCatalystSummary,
  formatNewsAgeLabel,
} from "@/lib/news/normalizeBenzingaNews";
import type { SignalNewsItem } from "@/lib/news/scoreNewsHeaderItems";

type StockNewsCatalystPanelProps = {
  ticker: string;
  maxItems?: number;
  refreshEveryMs?: number;
  className?: string;
  positiveOnly?: boolean;
  lookbackHours?: number;
};

type TickerNewsApiResponse = {
  ok: boolean;
  ticker: string;
  asOf: string;
  items: SignalNewsItem[];
};

function toneClasses(tone: SignalNewsItem["sentiment"]) {
  switch (tone) {
    case "positive":
      return {
        dot: "bg-emerald-400",
        chip: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
      };
    case "negative":
      return {
        dot: "bg-rose-400",
        chip: "border-rose-400/25 bg-rose-400/10 text-rose-200",
      };
    default:
      return {
        dot: "bg-cyan-400",
        chip: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
      };
  }
}

function sortTickerNews(items: SignalNewsItem[], focusedTicker: string): SignalNewsItem[] {
  const ticker = focusedTicker.trim().toUpperCase();

  return [...items].sort((a, b) => {
    const aPrimary = a.primaryTicker === ticker ? 1 : 0;
    const bPrimary = b.primaryTicker === ticker ? 1 : 0;
    if (bPrimary !== aPrimary) return bPrimary - aPrimary;

    const aTickerMatch = a.tickers.includes(ticker) ? 1 : 0;
    const bTickerMatch = b.tickers.includes(ticker) ? 1 : 0;
    if (bTickerMatch !== aTickerMatch) return bTickerMatch - aTickerMatch;

    const aImportance = a.importance ?? 0;
    const bImportance = b.importance ?? 0;
    if (bImportance !== aImportance) return bImportance - aImportance;

    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

export default function StockNewsCatalystPanel({
  ticker,
  maxItems = 6,
  refreshEveryMs = 30000,
  className,
  positiveOnly = false,
  lookbackHours = 24,
}: StockNewsCatalystPanelProps) {
  const normalizedTicker = ticker.trim().toUpperCase();
  const [items, setItems] = useState<SignalNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const search = new URLSearchParams({
      ticker: normalizedTicker,
      lookbackHours: String(lookbackHours),
    });
    return search.toString();
  }, [lookbackHours, normalizedTicker]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError(null);

        const response = await fetch(`/api/news/ticker/${normalizedTicker}?${query}`, {
          method: "GET",
          headers: {
            accept: "application/json",
          },
          cache: "no-store",
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `Request failed with ${response.status}`);
        }

        const data = (await response.json()) as TickerNewsApiResponse;

        if (!cancelled) {
          const sortedItems = sortTickerNews(data.items ?? [], normalizedTicker);
          setItems(
            positiveOnly
              ? sortedItems.filter((item) => item.sentiment === "positive")
              : sortedItems
          );
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load news");
          setIsLoading(false);
        }
      }
    }

    load();
    const intervalId = window.setInterval(load, refreshEveryMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [normalizedTicker, positiveOnly, query, refreshEveryMs]);

  const displayedItems = isExpanded ? items : items.slice(0, maxItems);
  const leadItem = items[0] ?? null;
  const leadLabel = leadItem ? buildNewsCatalystLabel(leadItem) : null;
  const leadSummary = leadItem
    ? buildNewsCatalystSummary(leadItem, normalizedTicker)
    : null;

  return (
    <section
      className={[
        "rounded-2xl border border-cyan-500/20 bg-slate-950/88 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            {positiveOnly ? "Current Positive Reports" : "News Catalyst"}
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-white">
            {positiveOnly ? `Positive ${normalizedTicker} Coverage` : `${normalizedTicker} News Catalyst`}
          </h2>
          <p className="mt-1 text-sm text-white/55">
            {positiveOnly
              ? "Recent favorable coverage from the live ticker-news feed."
              : "Real-time narrative context tied to the current tape."}
          </p>
        </div>

        <div className="shrink-0 rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs text-white/65">
          {items.length} item{items.length === 1 ? "" : "s"}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/3" />
          <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/3" />
          <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/3" />
        </div>
      ) : null}

      {!isLoading && error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          Unable to load catalyst news right now.
        </div>
      ) : null}

      {!isLoading && !error && leadItem ? (
        <div className="mb-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/6 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Lead Catalyst
            </div>

            {leadLabel ? (
              <div className="rounded-full border border-white/10 bg-white/3 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/70">
                {leadLabel}
              </div>
            ) : null}

            <div className="text-xs text-white/45">
              {formatNewsAgeLabel(leadItem.publishedAt)}
            </div>
          </div>

          <div className="mt-3 text-base font-semibold leading-6 text-white">
            {leadItem.headline}
          </div>

          {leadSummary ? (
            <p className="mt-2 text-sm leading-6 text-white/68">{leadSummary}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {leadItem.tickers.slice(0, 4).map((itemTicker) => (
              <div
                key={itemTicker}
                className="rounded-full border border-white/10 bg-white/3 px-2.5 py-1 text-[11px] text-white/65"
              >
                {itemTicker}
              </div>
            ))}

            {leadItem.tags.slice(0, 3).map((tag) => (
              <div
                key={tag}
                className="rounded-full border border-white/10 bg-white/3 px-2.5 py-1 text-[11px] text-white/55"
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!isLoading && !error && displayedItems.length > 0 ? (
        <div className="space-y-3">
          {displayedItems.map((item, index) => {
            const label = buildNewsCatalystLabel(item);
            const tone = toneClasses(item.sentiment);

            return (
              <Link
                key={`${item.url ?? item.id}-${index}`}
                href={item.url ?? "#"}
                target={item.url ? "_blank" : undefined}
                rel={item.url ? "noreferrer noopener" : undefined}
                className="block rounded-2xl border border-white/10 bg-white/3 px-4 py-3 transition hover:border-cyan-400/25 hover:bg-cyan-400/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />

                      <div
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${tone.chip}`}
                      >
                        {label}
                      </div>

                      <div className="text-[11px] text-white/45">
                        {formatNewsAgeLabel(item.publishedAt)}
                      </div>
                    </div>

                    <div className="text-sm font-medium leading-6 text-white">
                      {item.headline}
                    </div>

                    {item.summary ? (
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/58">
                        {item.summary}
                      </p>
                    ) : null}

                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.tickers.slice(0, 4).map((itemTicker) => (
                        <div
                          key={itemTicker}
                          className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[11px] text-white/55"
                        >
                          {itemTicker}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {item.source ? (
                      <div className="text-[11px] text-white/45">{item.source}</div>
                    ) : null}
                    {item.author ? (
                      <div className="mt-1 text-[11px] text-white/35">{item.author}</div>
                    ) : null}
                  </div>
                </div>

              </Link>
            );
          })}
        </div>
      ) : null}

      {!isLoading && !error && items.length > maxItems ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setIsExpanded((value) => !value)}
            className="rounded-full border border-white/10 bg-white/3 px-4 py-2 text-sm font-medium text-white/70 transition hover:border-cyan-400/25 hover:bg-cyan-400/6 hover:text-cyan-200"
          >
            {isExpanded ? "Show less" : `Show all ${items.length} headlines`}
          </button>
        </div>
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-4 text-sm text-white/55">
          {positiveOnly
            ? `No positive ${normalizedTicker} reports were found in the last ${lookbackHours === 168 ? "7 days" : `${lookbackHours} hours`}.`
            : `No fresh catalyst headlines were returned for ${normalizedTicker}.`}
        </div>
      ) : null}
    </section>
  );
}