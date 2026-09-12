"use client";

import { ExternalLink, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  buildAnalystNewsSummary,
  type AnalystNewsSummary,
} from "@/lib/news/analystNewsSummary";
import type { SignalNewsItem } from "@/lib/news/scoreNewsHeaderItems";

type TickerNewsApiResponse = {
  ok: boolean;
  ticker: string;
  items: SignalNewsItem[];
};

type StockAnalystNewsRailCardProps = {
  ticker: string;
  className?: string;
};

function toneClasses(state: AnalystNewsSummary["state"] | null): string {
  if (state === "supportive") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  }
  if (state === "cautious") {
    return "border-rose-400/25 bg-rose-400/10 text-rose-200";
  }
  if (state === "neutral") {
    return "border-cyan-400/25 bg-cyan-400/10 text-cyan-200";
  }
  return "border-white/10 bg-white/4 text-white/60";
}

export default function StockAnalystNewsRailCard({
  ticker,
  className,
}: StockAnalystNewsRailCardProps) {
  const normalizedTicker = ticker.trim().toUpperCase();
  const [summary, setSummary] = useState<AnalystNewsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!normalizedTicker) {
        if (!cancelled) {
          setSummary(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(
          `/api/news/ticker/${encodeURIComponent(normalizedTicker)}?lookbackHours=72`,
          {
            method: "GET",
            headers: { accept: "application/json" },
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const data = (await response.json()) as TickerNewsApiResponse;

        if (!cancelled) {
          setSummary(
            buildAnalystNewsSummary(data.items ?? [], normalizedTicker, new Date(), 72)
          );
        }
      } catch {
        if (!cancelled) {
          setSummary(buildAnalystNewsSummary([], normalizedTicker, new Date(), 72));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    setSummary(null);
    setIsLoading(true);
    void load();

    const intervalId = window.setInterval(() => {
      void load();
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [normalizedTicker]);

  return (
    <section
      aria-label={`${normalizedTicker || "Stock"} analyst coverage`}
      className={[
        "rounded-2xl border border-white/10 bg-white/3 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/75">
            Latest Analyst & News
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {normalizedTicker || "Stock"} coverage
          </div>
        </div>

        {isLoading ? (
          <LoaderCircle className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-cyan-300/60" aria-label="Loading analyst coverage" />
        ) : (
          <span
            className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${toneClasses(
              summary?.state ?? null
            )}`}
          >
            {summary?.state === "supportive"
              ? "Supportive"
              : summary?.state === "cautious"
                ? "Cautious"
                : summary?.state === "neutral"
                  ? "Neutral"
                  : "No update"}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-2">
          <div className="h-4 animate-pulse rounded bg-white/8" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-white/6" />
          <div className="h-10 animate-pulse rounded-2xl bg-white/4" />
        </div>
      ) : summary ? (
        <div className="mt-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
            {summary.label}
          </div>

          {summary.headline ? (
            <div className="mt-1.5 text-sm font-semibold leading-5 text-white">{summary.headline}</div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-[0.13em] text-white/40">
            {summary.source ? <span>{summary.source}</span> : null}
            {summary.source && summary.ageLabel ? <span aria-hidden="true">•</span> : null}
            {summary.ageLabel ? <span>{summary.ageLabel}</span> : null}
          </div>

          <p className="mt-2 text-xs leading-5 text-white/60">{summary.summary}</p>

          {summary.href ? (
            <a
              href={summary.href}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-200 transition hover:text-cyan-100"
            >
              View source
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}