"use client";

import { ArrowUpRight, Eye, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLiveMarket } from "@/components/market/LiveMarketProvider";
import { SectionHeader } from "@/components/today/SectionHeader";
import { formatMarketClockTimeMs } from "@/lib/marketTime";
import { readPortfolioHoldings, type LocalPortfolioHolding } from "@/lib/portfolio/localPortfolio";
import { buildActionableRead } from "@/lib/sigi/actionableRead";
import { buildTodayPersonalBrief } from "@/lib/today/personalBrief";
import {
  majorSectionClass,
  multiCardRowClass,
  supportSectionClass,
} from "@/components/today/TodayLayoutPrimitives";
import type { TodaySetupItem, TodayWatchlistMoverRow } from "@/lib/today/pageData";

const ACTIONABLE_READ_REFRESH_MS = 15 * 60 * 1000;

type ActionableReadSetup = {
  ticker: string;
  sector?: string;
  score?: number;
  direction?: "bullish" | "bearish" | "neutral";
  changePct?: number;
};

function toDirection(signal?: string | null): ActionableReadSetup["direction"] {
  const normalized = String(signal ?? "").trim().toLowerCase();

  if (normalized.includes("bull")) return "bullish";
  if (normalized.includes("bear")) return "bearish";
  return "neutral";
}

function toSetup(item: TodaySetupItem): ActionableReadSetup {
  return {
    ticker: item.ticker,
    sector: item.sector ?? undefined,
    score: item.score,
    direction: item.bias,
    changePct: item.changePercent ?? undefined,
  };
}

function fromLiveSetup(item: {
  ticker: string;
  sector?: string;
  signal?: string;
  score?: number | null;
  changePercent?: number | null;
}): ActionableReadSetup {
  return {
    ticker: item.ticker,
    sector: item.sector,
    score: item.score ?? undefined,
    direction: toDirection(item.signal),
    changePct: item.changePercent ?? undefined,
  };
}

export default function TodayActionRowClient({
  initialSetups,
  initialUpdatedAt,
  watchlistMovers = [],
}: {
  initialSetups: TodaySetupItem[];
  initialUpdatedAt: number;
  watchlistMovers?: TodayWatchlistMoverRow[];
}) {
  const { quoteMap, ensureQuotes, refreshQuotesNow } = useLiveMarket();
  const [setups, setSetups] = useState<ActionableReadSetup[]>(() =>
    initialSetups.map(toSetup)
  );
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [portfolioHoldings, setPortfolioHoldings] = useState<LocalPortfolioHolding[]>([]);
  const trackedPortfolioHoldings = portfolioHoldings.filter(
    (holding) => holding.shares > 0 && holding.entryPrice > 0
  );
  const personalTickerSignature = Array.from(
    new Set([
      ...watchlistMovers.map((row) => row.ticker.trim().toUpperCase()),
      ...trackedPortfolioHoldings.map((holding) => holding.ticker.trim().toUpperCase()),
    ].filter(Boolean))
  )
    .sort()
    .join(",");

  useEffect(() => {
    const syncPortfolio = () => {
      setPortfolioHoldings(readPortfolioHoldings());
    };

    syncPortfolio();
    window.addEventListener("storage", syncPortfolio);
    window.addEventListener("focus", syncPortfolio);
    window.addEventListener("signalos:portfolio-updated", syncPortfolio);

    return () => {
      window.removeEventListener("storage", syncPortfolio);
      window.removeEventListener("focus", syncPortfolio);
      window.removeEventListener("signalos:portfolio-updated", syncPortfolio);
    };
  }, []);

  useEffect(() => {
    const tickers = personalTickerSignature ? personalTickerSignature.split(",") : [];
    if (!tickers.length) return;

    ensureQuotes(tickers);
    void refreshQuotesNow(tickers);
  }, [ensureQuotes, personalTickerSignature, refreshQuotesNow]);

  useEffect(() => {
    let cancelled = false;

    function shouldRefresh() {
      return Date.now() - updatedAt >= ACTIONABLE_READ_REFRESH_MS;
    }

    async function refreshLiveSnapshot() {
      try {
        const response = await fetch("/api/today/live-intelligence", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const json = (await response.json()) as {
          updatedAt?: number;
          liveData?: {
            leadershipSignals?: Array<{
              ticker: string;
              sector?: string;
              signal?: string;
              score?: number | null;
              changePercent?: number | null;
            }> | null;
          } | null;
        };

        const liveSetups = json.liveData?.leadershipSignals?.map(fromLiveSetup) ?? [];

        if (cancelled || liveSetups.length === 0) return;
        setSetups(liveSetups);
        setUpdatedAt(
          typeof json.updatedAt === "number" && Number.isFinite(json.updatedAt)
            ? json.updatedAt
            : Date.now()
        );
      } catch {}
    }

    const onFocus = () => {
      if (document.visibilityState === "visible" && shouldRefresh()) {
        void refreshLiveSnapshot();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && shouldRefresh()) {
        void refreshLiveSnapshot();
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible" && shouldRefresh()) {
        void refreshLiveSnapshot();
      }
    }, 60000);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [updatedAt]);

  const actionableRead = buildActionableRead(setups);
  const personalBrief = buildTodayPersonalBrief({
    watchlist: watchlistMovers.map((row) => ({
      ticker: row.ticker,
      name: row.name,
      changePercent: quoteMap[row.ticker.trim().toUpperCase()]?.changePct ?? row.changePct,
      catalystLabel: row.pulse?.topLabel ?? null,
    })),
    portfolio: trackedPortfolioHoldings.map((holding) => {
      const quote = quoteMap[holding.ticker.trim().toUpperCase()];

      return {
        ticker: holding.ticker,
        name: holding.name,
        changePercent: quote?.changePct ?? null,
        price: quote?.price ?? holding.currentPrice,
        stopPrice: holding.stopPrice,
      };
    }),
    setups,
  });
  const updatedLabel = formatMarketClockTimeMs(updatedAt, { includeZone: true });
  const nextUpdateLabel = formatMarketClockTimeMs(updatedAt + ACTIONABLE_READ_REFRESH_MS, {
    includeZone: true,
  });

  return (
    <section className={majorSectionClass}>
      <SectionHeader
        eyebrow="Actionable Read"
        title="What matters now"
        subtitle="Fast market context without the clutter."
      />

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
          Source: Top Setups + Screener Signals + Market Pulse
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
          Updated live from current session data
        </span>
        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/8 px-2 py-1 text-cyan-100/80">
          Updated: {updatedLabel}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
          Next update: {nextUpdateLabel}
        </span>
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl border border-cyan-400/18 bg-[linear-gradient(112deg,rgba(8,47,73,0.52),rgba(10,20,34,0.92)_48%,rgba(20,38,30,0.62))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/80">
              <Eye className="size-3.5" aria-hidden="true" />
              Your market brief
            </div>
            <h3 className="mt-2 text-lg font-semibold text-white">{personalBrief.title}</h3>
            <p className="mt-1 text-sm leading-6 text-white/68">{personalBrief.summary}</p>
          </div>
          {!personalBrief.hasWatchlist ? (
            <Link
              href="/watchlist"
              className="inline-flex shrink-0 items-center gap-1.5 self-start text-sm font-semibold text-cyan-100 transition hover:text-white"
            >
              Build Watchlist
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>

        {personalBrief.priorities.length ? (
          <div className="mt-4 grid gap-2 lg:grid-cols-3">
            {personalBrief.priorities.map((priority) => {
              const isPressure = priority.status === "pressure";
              const isConfirmed = priority.status === "confirmed";
              const statusLabel = priority.source === "portfolio"
                ? isPressure
                  ? "Holding risk"
                  : isConfirmed
                    ? "Holding in play"
                    : "Holding watch"
                : isPressure
                  ? "Risk attention"
                  : isConfirmed
                    ? "In play"
                    : "Watch";
              const statusClass = isPressure
                ? "border-rose-400/25 bg-rose-400/10 text-rose-100"
                : isConfirmed
                  ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
                  : "border-white/12 bg-white/5 text-white/70";
              const priorityHref = priority.source === "portfolio"
                ? `/stocks/${priority.ticker}?source=%2Ftoday&focus=portfolio&view=risk`
                : `/stocks/${priority.ticker}?source=%2Ftoday&focus=${priority.status}`;

              return (
                <Link
                  key={priority.ticker}
                  href={priorityHref}
                  className="group min-w-0 rounded-xl border border-white/10 bg-black/18 p-3 transition hover:border-cyan-300/35 hover:bg-cyan-300/6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {isPressure ? (
                          <ShieldAlert className="size-4 shrink-0 text-rose-200" aria-hidden="true" />
                        ) : null}
                        <span className="text-sm font-bold text-white">{priority.ticker}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-white/45">{priority.name}</p>
                    </div>
                    <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-white/35 transition group-hover:text-cyan-100" aria-hidden="true" />
                  </div>
                  <p className="mt-3 text-xs font-medium leading-5 text-white/76">{priority.evidence}</p>
                  <p className="mt-1 text-xs leading-5 text-white/48">{priority.nextCondition}</p>
                </Link>
              );
            })}
          </div>
        ) : null}
      </section>

      <div className={`${multiCardRowClass} grid-cols-1 lg:grid-cols-3`}>
        <div className={supportSectionClass}>
          <div className="text-sm font-medium text-white">{actionableRead.breadth.title}</div>
          <p className="mt-3 text-sm leading-6 text-white/70">{actionableRead.breadth.body}</p>
        </div>

        <div className={supportSectionClass}>
          <div className="text-sm font-medium text-white">{actionableRead.leaders.title}</div>
          <p className="mt-2 text-sm text-white/60">{actionableRead.leaders.body}</p>
        </div>

        <div className={supportSectionClass}>
          <div className="text-sm font-medium text-white">{actionableRead.action.title}</div>
          <p className="mt-2 text-sm text-white/60">{actionableRead.action.body}</p>
        </div>
      </div>
    </section>
  );
}