"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useLiveMarket } from "@/components/market/LiveMarketProvider";
import StocksHeaderActions from "@/components/stocks/StocksHeaderActions";
import { useSyncedWatchlist } from "@/hooks/useSyncedWatchlist";
import { normalizeTicker } from "@/lib/tickerAliases";

export type StockIdea = {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  price: number | null;
  changePercent: number | null;
  conviction: number;
  thesis: string;
  bucket: "top" | "emerging" | "watch";
  badge: "Priority" | "Scanner" | "Emerging" | "Watch";
  pulse?: {
    label: string;
    count: number;
    age: string;
    tone: "bullish" | "neutral" | "bearish";
  };
};

function formatPrice(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function toneClass(value: number | null) {
  if (value == null || Number.isNaN(value)) return "text-white/45";
  return value >= 0 ? "text-emerald-300" : "text-rose-300";
}

function pulseToneClass(
  tone: NonNullable<StockIdea["pulse"]>["tone"]
) {
  if (tone === "bullish") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  }
  if (tone === "bearish") {
    return "border-rose-400/25 bg-rose-400/10 text-rose-200";
  }
  return "border-cyan-400/25 bg-cyan-400/10 text-cyan-200";
}

function convictionBarClass(conviction: number) {
  if (conviction >= 90) return "bg-emerald-400";
  if (conviction >= 80) return "bg-cyan-400";
  return "bg-amber-400";
}

function StockIdeaCard({
  idea,
  compact = false,
}: {
  idea: StockIdea;
  compact?: boolean;
}) {
  return (
    <article className="group rounded-2xl border border-cyan-500/15 bg-slate-950/80 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.28)] transition hover:border-cyan-400/35 hover:bg-cyan-400/4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-semibold tracking-tight text-white">
              {idea.ticker}
            </h3>
            <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
              {idea.badge}
            </span>
          </div>

          <p className="mt-1 text-sm text-white/45">{idea.name}</p>
          <p className="mt-3 text-sm leading-6 text-white/68">{idea.thesis}</p>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-lg font-semibold text-white">{formatPrice(idea.price)}</div>
          <div className={`mt-1 text-sm font-medium ${toneClass(idea.changePercent)}`}>
            {formatPercent(idea.changePercent)}
          </div>
        </div>
      </div>

      {!compact ? (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/38">
            <span>Conviction</span>
            <span className="text-yellow-300">{idea.conviction}/100</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${convictionBarClass(idea.conviction)}`}
              style={{ width: `${idea.conviction}%` }}
            />
          </div>
        </div>
      ) : null}

      {idea.pulse ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${pulseToneClass(
              idea.pulse.tone
            )}`}
          >
            {idea.pulse.count} fresh headline{idea.pulse.count === 1 ? "" : "s"}
          </span>
          <span className="rounded-full border border-white/10 bg-white/3 px-2.5 py-1 text-[11px] text-white/55">
            {idea.pulse.label}
          </span>
          <span className="text-xs text-white/40">{idea.pulse.age}</span>
        </div>
      ) : null}

      <div className="mt-5 flex items-center gap-3">
        <Link
          href={`/stocks/${idea.ticker}`}
          className="flex-1 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2.5 text-center text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/15"
        >
          Open Chart
        </Link>

        <Link
          href={`/stocks/${idea.ticker}`}
          className="rounded-xl border border-white/10 bg-white/3 px-4 py-2.5 text-sm font-medium text-white/60 transition hover:border-white/20 hover:text-white"
        >
          Details →
        </Link>
      </div>
    </article>
  );
}

export default function StocksPageClient({
  ideas,
}: {
  ideas: StockIdea[];
}) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | StockIdea["bucket"]>("all");
  const router = useRouter();
  const { addTicker, hasTicker } = useSyncedWatchlist();
  const { ensureQuotes, quoteMap } = useLiveMarket();
  const isMobilePreview = searchParams.get("mobilePreview") === "1";

  const normalizedSearchTicker = normalizeTicker(query).toUpperCase();
  const hasSearchTicker = normalizedSearchTicker.length > 0;
  const isTracked = hasSearchTicker && hasTicker(normalizedSearchTicker);

  function openTicker() {
    if (!hasSearchTicker) return;

    router.push(`/stocks/${encodeURIComponent(normalizedSearchTicker)}`);
  }

  function addSearchTickerToWatchlist() {
    if (!hasSearchTicker || isTracked) return;

    addTicker(normalizedSearchTicker);
  }

  useEffect(() => {
    ensureQuotes(ideas.map((idea) => idea.ticker));
  }, [ensureQuotes, ideas]);

  const hydratedIdeas = useMemo(
    () =>
      ideas.map((idea) => {
        const liveQuote = quoteMap[idea.ticker];

        return {
          ...idea,
          price: liveQuote?.price ?? idea.price,
          changePercent: liveQuote?.changePct ?? idea.changePercent,
        };
      }),
    [ideas, quoteMap]
  );

  const filteredIdeas = useMemo(() => {
    return hydratedIdeas
      .filter((idea) => {
        const matchesFilter = filter === "all" || idea.bucket === filter;
        const text = `${idea.ticker} ${idea.name} ${idea.sector} ${idea.thesis}`.toLowerCase();
        const matchesQuery =
          !query.trim() || text.includes(query.trim().toLowerCase());

        return matchesFilter && matchesQuery;
      })
      .sort((a, b) => b.conviction - a.conviction);
  }, [filter, hydratedIdeas, query]);

  const topIdeas = filteredIdeas.filter((idea) => idea.bucket === "top").slice(0, 3);
  const emergingIdeas = filteredIdeas
    .filter((idea) => idea.bucket === "emerging")
    .slice(0, 4);
  const watchIdeas = filteredIdeas.filter((idea) => idea.bucket === "watch").slice(0, 4);
  const stockOptions = useMemo(() => {
    const seen = new Set<string>();

    return ideas.filter((idea) => {
      if (seen.has(idea.ticker)) return false;
      seen.add(idea.ticker);
      return true;
    }).map((idea) => ({
      ticker: idea.ticker,
      company: idea.name,
      sector: idea.sector,
    }));
  }, [ideas]);

  return (
    <main className="mx-auto flex w-full max-w-400 flex-col gap-6 px-3 pb-12 pt-5 sm:px-4 lg:px-5 xl:px-6">
      <section className="rounded-3xl border border-cyan-500/20 bg-[radial-gradient(circle_at_top_left,rgba(8,145,178,0.14),rgba(2,6,23,0.96)_45%,rgba(0,0,0,0.98))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-300/80">
              SignalOS Discovery
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Stocks</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">
              Find high-conviction ideas, understand the catalyst pulse, and open the chart fast.
            </p>
          </div>

          <StocksHeaderActions stocks={stockOptions} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    openTicker();
                  }
                }}
                placeholder="Search ticker or company..."
                className="h-11 flex-1 rounded-2xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none placeholder:text-white/30 transition focus:border-cyan-400/35"
              />

              <div className="grid grid-cols-1 gap-2 sm:contents">
                <button
                  type="button"
                  onClick={openTicker}
                  disabled={!hasSearchTicker}
                  className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/25 disabled:opacity-40"
                >
                  {hasSearchTicker ? `Open ${normalizedSearchTicker}` : "Open Ticker"}
                </button>

                {isMobilePreview ? null : (
                  <button
                    type="button"
                    onClick={addSearchTickerToWatchlist}
                    disabled={!hasSearchTicker || isTracked}
                    aria-label={isTracked ? `${normalizedSearchTicker} already in watchlist` : "Add ticker to watchlist"}
                    className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50 sm:inline-flex sm:items-center sm:justify-center"
                  >
                    {isTracked ? "Tracked ✓" : "+ Watch"}
                  </button>
                )}
              </div>
            </div>

            {isMobilePreview ? (
              <div className="mt-2 text-xs text-white/40">Enter opens ticker</div>
            ) : (
              <div className="mt-2 text-xs text-white/40">
                Enter opens ticker • + Watch tracks instantly
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            {[
              ["all", "All"],
              ["top", "Top Setups"],
              ["emerging", "Emerging"],
              ["watch", "Watch"],
            ].map(([value, label]) => {
              const active = filter === value;

              return (
                <button
                  key={value}
                  onClick={() => setFilter(value as typeof filter)}
                  className={[
                    "w-full whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition sm:w-auto",
                    active
                      ? "border-cyan-400/35 bg-cyan-400/12 text-cyan-200"
                      : "border-white/10 bg-white/3 text-white/55 hover:text-white",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-cyan-500/20 bg-slate-950/80 p-5 shadow-[0_12px_35px_rgba(0,0,0,0.35)]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-300/75">
              Scanner Leaders
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Top Opportunities Right Now
            </h2>
            <p className="mt-1 text-sm text-white/52">
              True top-setup names from the discovery engine, with catalyst pulse and one clear action.
            </p>
          </div>

          <div className="hidden rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs text-white/55 sm:block">
            {filteredIdeas.length} names
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {topIdeas.map((idea) => (
            <StockIdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-cyan-500/15 bg-slate-950/70 p-5">
          <div className="mb-4">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-300/70">
              Scanner Early Read
            </div>
            <h2 className="text-xl font-semibold text-white">Emerging Setups</h2>
            <p className="mt-1 text-sm text-white/50">
              Names the scanner sees building into higher-quality structure.
            </p>
          </div>

          <div className="space-y-3">
            {(emergingIdeas.length ? emergingIdeas : filteredIdeas.slice(0, 3)).map((idea) => (
              <StockIdeaCard key={`forming-${idea.id}`} idea={idea} compact />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-cyan-500/15 bg-slate-950/70 p-5">
          <div className="mb-4">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-300/70">
              Priority Watch
            </div>
            <h2 className="text-xl font-semibold text-white">Watch Candidates</h2>
            <p className="mt-1 text-sm text-white/50">
              Remaining scanner names worth tracking even if they are not in the active buckets yet.
            </p>
          </div>

          <div className="space-y-3">
            {(watchIdeas.length ? watchIdeas : filteredIdeas.slice(0, 3)).map((idea) => (
              <StockIdeaCard key={`watch-${idea.id}`} idea={idea} compact />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}