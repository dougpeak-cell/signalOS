"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import TickerLogo from "@/components/stocks/TickerLogo";
import type {
  NewsHeaderMode,
  ScoredHeaderNewsItem,
} from "@/lib/news/scoreNewsHeaderItems";

type BreakingNewsTickerProps = {
  mode?: NewsHeaderMode;
  focusedTicker?: string;
  watchlistTickers?: string[];
  portfolioTickers?: string[];
  topSetupTickers?: string[];
  mostTradedTickers?: string[];
  rotateEveryMs?: number;
  refreshEveryMs?: number;
};

type HeaderApiResponse = {
  ok: boolean;
  mode: NewsHeaderMode;
  asOf: string;
  items: {
    primary: ScoredHeaderNewsItem | null;
    secondary: ScoredHeaderNewsItem[];
    queue: ScoredHeaderNewsItem[];
  };
};

function buildQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  return search.toString();
}

function joinCsv(values?: string[]) {
  if (!values?.length) return undefined;

  const unique = Array.from(
    new Set(values.map((value) => value.trim().toUpperCase()).filter(Boolean))
  );

  return unique.length ? unique.join(",") : undefined;
}

function toneClasses(tone: ScoredHeaderNewsItem["tone"]) {
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

function tonePulseClasses(tone: ScoredHeaderNewsItem["tone"]) {
  switch (tone) {
    case "positive":
      return {
        pulse: "bg-emerald-400/20",
        ring: "border-emerald-400/30 shadow-[0_0_24px_rgba(52,211,153,0.18)]",
        flash: "from-emerald-400/20",
      };
    case "negative":
      return {
        pulse: "bg-rose-400/20",
        ring: "border-rose-400/30 shadow-[0_0_24px_rgba(251,113,133,0.18)]",
        flash: "from-rose-400/20",
      };
    default:
      return {
        pulse: "bg-cyan-400/20",
        ring: "border-cyan-400/30 shadow-[0_0_24px_rgba(34,211,238,0.18)]",
        flash: "from-cyan-400/20",
      };
  }
}

export default function BreakingNewsTicker({
  mode = "market",
  focusedTicker,
  watchlistTickers,
  portfolioTickers,
  topSetupTickers,
  mostTradedTickers,
  rotateEveryMs = 7000,
  refreshEveryMs = 20000,
}: BreakingNewsTickerProps): React.ReactElement | null {
  const [items, setItems] = useState<ScoredHeaderNewsItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastPrimaryId, setLastPrimaryId] = useState<string | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const updatedSinceRef = useRef<string | null>(null);

  const requestParams = useMemo(
    () => ({
      mode,
      ticker: focusedTicker?.trim().toUpperCase(),
      watchlist: joinCsv(watchlistTickers),
      portfolio: joinCsv(portfolioTickers),
      topSetups: joinCsv(topSetupTickers),
      mostTraded: joinCsv(mostTradedTickers),
    }),
    [
      mode,
      focusedTicker,
      watchlistTickers,
      portfolioTickers,
      topSetupTickers,
      mostTradedTickers,
    ]
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setError(null);

        const query = buildQuery({
          ...requestParams,
          updatedSince: updatedSinceRef.current ?? undefined,
        });

        const response = await fetch(`/api/news/header?${query}`, {
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

        const data = (await response.json()) as HeaderApiResponse;

        if (!data.ok) {
          throw new Error("Header API returned ok=false");
        }

        const merged = [
          ...(data.items.primary ? [data.items.primary] : []),
          ...data.items.secondary,
          ...data.items.queue,
        ];

        if (cancelled) return;

        setItems((previous) => {
          const byId = new Map<string, ScoredHeaderNewsItem>();

          for (const item of previous) byId.set(item.id, item);
          for (const item of merged) byId.set(item.id, item);

          const next = Array.from(byId.values()).sort(
            (left, right) => right.headerScore - left.headerScore
          );

          return next.slice(0, 12);
        });

        updatedSinceRef.current = data.asOf;
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;

        setError(err instanceof Error ? err.message : "Failed to load news");
        setIsLoading(false);
      }
    };

    load();
    const intervalId = window.setInterval(load, refreshEveryMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [requestParams, refreshEveryMs]);

  useEffect(() => {
    if (isPaused || items.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, rotateEveryMs);

    return () => window.clearInterval(intervalId);
  }, [isPaused, items.length, rotateEveryMs]);

  useEffect(() => {
    if (activeIndex >= items.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, items.length]);

  const highScoreIndex = useMemo(() => {
    if (!items.length) return 0;

    let bestIndex = 0;
    let bestScore = -Infinity;

    items.forEach((item, index) => {
      if (item.headerScore > bestScore) {
        bestScore = item.headerScore;
        bestIndex = index;
      }
    });

    return bestIndex;
  }, [items]);

  useEffect(() => {
    if (!items.length) return;

    const strongest = items[highScoreIndex];

    if (!strongest) return;

    const shouldAutoFocus =
      strongest.headerScore >= 75 || (strongest.importance ?? 0) >= 70;

    if (shouldAutoFocus && activeIndex !== highScoreIndex) {
      setActiveIndex(highScoreIndex);
    }
  }, [items, highScoreIndex, activeIndex]);

  const primary = items[activeIndex] ?? items[highScoreIndex] ?? null;
  const secondary = items.filter((_, index) => index !== activeIndex).slice(0, 3);

  useEffect(() => {
    if (!primary?.id) return;

    if (lastPrimaryId && lastPrimaryId !== primary.id) {
      setFlashKey((current) => current + 1);
    }

    setLastPrimaryId(primary.id);
  }, [primary?.id, lastPrimaryId]);

  if (isLoading) {
    return (
      <div className="border-b border-cyan-500/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-400 items-center gap-3 px-3 py-2 sm:px-4 lg:px-5 xl:px-6">
          <div className="h-8 w-full animate-pulse rounded-2xl border border-white/10 bg-white/4" />
        </div>
      </div>
    );
  }

  if (error && !primary) {
    return null;
  }

  if (!primary) {
    return null;
  }

  const primaryTone = toneClasses(primary.tone);
  const primaryPulse = tonePulseClasses(primary.tone);
  const marqueeItems = [
    primary.headline,
    primary.chip,
    primary.whyMatters,
  ].filter((value): value is string => Boolean(value?.trim()));

  return (
    <div className="relative overflow-hidden border-b border-cyan-500/20 bg-black/85 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(34,211,238,0.18),transparent_60%)]" />

      <div
        className="mx-auto grid w-full max-w-400 grid-cols-1 gap-2 px-3 py-2 sm:px-4 lg:grid-cols-[1.4fr_0.9fr] lg:px-5 xl:px-6"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className={`relative flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border bg-slate-950/80 px-3 py-2 transition hover:bg-cyan-400/10 ${primaryPulse.ring}`}
        >
          <div
            key={flashKey}
            className={`pointer-events-none absolute inset-0 animate-pulse bg-linear-to-r ${primaryPulse.flash} via-transparent to-transparent opacity-70`}
          />

          {primary.image ? (
            <img
              src={primary.image}
              alt={primary.headline}
              className="absolute inset-0 h-full w-full scale-105 object-cover opacity-20 blur-[1px]"
            />
          ) : null}

          <div className="absolute inset-0 bg-linear-to-r from-black via-black/80 to-black/40" />
          <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />
          <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-cyan-400/20 opacity-20 blur-xl" />

          <div className="relative z-10 flex min-w-0 w-full items-center gap-3 md:pr-14">
            <div className="relative shrink-0">
              <div
                className={`absolute inset-0 h-2.5 w-2.5 animate-ping rounded-full ${primaryPulse.pulse}`}
              />
              <div className={`relative h-2.5 w-2.5 rounded-full ${primaryTone.dot}`} />
            </div>

            {primary.primaryTicker ? (
              <Link
                href={`/stocks/${primary.primaryTicker}`}
                onClick={(event) => event.stopPropagation()}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${primaryTone.chip}`}
              >
                {primary.primaryTicker}
              </Link>
            ) : (
              <div
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${primaryTone.chip}`}
              >
                NEWS
              </div>
            )}

            <a
              href={primary.url ?? "#"}
              target={primary.url ? "_blank" : undefined}
              rel={primary.url ? "noreferrer noopener" : undefined}
              className="min-w-0 flex flex-1 items-center gap-3 overflow-hidden"
            >
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="ticker-track flex items-center gap-6 pr-6">
                  {[0, 1].map((copyIndex) => (
                    <div key={copyIndex} className="flex shrink-0 items-center gap-3">
                      <span className="shrink-0 text-sm font-semibold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
                        {primary.headline}
                      </span>
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/3 px-2 py-0.5 text-[10px] font-medium text-white/60">
                        {primary.chip}
                      </span>
                      {primary.whyMatters ? (
                        <span className="shrink-0 text-xs text-white/45">
                          {primary.whyMatters}
                        </span>
                      ) : null}
                      {marqueeItems.length > 1 ? (
                        <span className="text-white/18">•</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </a>

            <div className="shrink-0 text-xs font-medium text-white/55">
              {primary.ageLabel}
            </div>
          </div>

          {primary.primaryTicker ? (
            <div className="absolute right-2 top-1/2 hidden -translate-y-1/2 md:block">
              <div className="rounded-xl border border-cyan-300/30 bg-black/50 p-1 shadow-[0_0_15px_rgba(34,211,238,0.25)] backdrop-blur">
                <TickerLogo ticker={primary.primaryTicker} size={28} />
              </div>
            </div>
          ) : null}
        </div>

        <div className="hidden min-w-0 items-center gap-2 lg:flex">
          {secondary.map((item, index) => {
            const tone = toneClasses(item.tone);

            return (
              <a
                key={`${item.url ?? item.id}-${index}`}
                href={item.url ?? "#"}
                target={item.url ? "_blank" : undefined}
                rel={item.url ? "noreferrer noopener" : undefined}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/4 px-3 py-2 transition hover:border-cyan-300/30 hover:bg-cyan-400/10 backdrop-blur"
              >
                <div className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-white/80">
                    {item.primaryTicker ?? "NEWS"} • {item.headline}
                  </div>
                </div>
                <div className="shrink-0 text-[11px] text-white/45">{item.ageLabel}</div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
