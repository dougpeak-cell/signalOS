"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLiveMarket } from "@/components/market/LiveMarketProvider";
import { SectionHeader } from "@/components/today/SectionHeader";
import type { TickerNewsPulse } from "@/lib/news/tickerNewsPulse";
import { isPreMarketNow } from "@/lib/today/marketPhase";

type MostTradedRow = {
  ticker: string;
  name?: string | null;
  price?: number | null;
  changePct?: number;
  changePercent?: number;
  volume?: number | null;
  rvol?: number | null;
  pulse?: TickerNewsPulse | null;
};

function formatCompactNumber(v?: number | null) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "—";

  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function formatPrice(price?: number | null) {
  if (price == null || Number.isNaN(price)) return "—";
  return `$${Number(price).toFixed(2)}`;
}

function formatPct(value?: number | null) {
  const n = Number(value ?? 0);
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function pctClass(value?: number | null) {
  const n = Number(value ?? 0);
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-red-400";
  return "text-white/45";
}

function pulseBadgeClass(tone?: TickerNewsPulse["tone"]) {
  if (tone === "positive") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  if (tone === "negative") return "border-rose-400/20 bg-rose-400/10 text-rose-200";
  return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
}

const MAX_MOST_TRADED_ROWS = 8;

function SessionToggleButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
        active
          ? "border-cyan-400/30 bg-cyan-400/12 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.08)]"
          : "border-white/10 bg-white/3 text-white/55 hover:border-white/16 hover:text-white/75"
      }`}
    >
      {children}
    </button>
  );
}

export default function MostTradedPanel({
  regularRows,
  preMarketRows,
}: {
  regularRows: MostTradedRow[];
  preMarketRows: MostTradedRow[];
}) {
  const [sessionView, setSessionView] = useState<"regular" | "pre">(() =>
    isPreMarketNow() ? "pre" : "regular"
  );
  const { ensureQuotes, quoteMap } = useLiveMarket();
  const regularMostTraded = regularRows.map((row) => ({
    ...row,
    changePct: row.changePct ?? row.changePercent ?? null,
  }));
  const preMarketMostTraded = preMarketRows.map((row) => ({
    ...row,
    changePct: row.changePct ?? row.changePercent ?? null,
  }));
  const preMarketActive = isPreMarketNow();
  const filteredPreMarketRows = preMarketActive && preMarketMostTraded.length ? preMarketMostTraded : [];
  const preMarketMessage = preMarketActive
    ? "Pre-market is active. No qualified setups are passing filters yet."
    : "Pre-market opens at 4:00 AM ET.";

  useEffect(() => {
    const syncSessionView = () => {
      setSessionView((current) => {
        const expected = isPreMarketNow() ? "pre" : "regular";
        return current === expected ? current : expected;
      });
    };

    syncSessionView();

    const intervalId = window.setInterval(syncSessionView, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const activeMostTradedRows = useMemo(() => {
    return sessionView === "pre" ? filteredPreMarketRows : regularMostTraded;
  }, [sessionView, filteredPreMarketRows, regularMostTraded]);

  useEffect(() => {
    ensureQuotes(activeMostTradedRows.map((row) => row.ticker));
  }, [activeMostTradedRows, ensureQuotes]);

  const displayedRows = useMemo(
    () =>
      activeMostTradedRows.map((row) => {
        const liveQuote = quoteMap[row.ticker];

        return {
          ...row,
          price: liveQuote?.price ?? row.price,
          changePct: liveQuote?.changePct ?? row.changePct ?? row.changePercent ?? null,
        };
      }),
    [activeMostTradedRows, quoteMap]
  );

  const mostTradedTitle =
    sessionView === "pre" ? "Pre-Market Leaders" : "Most Traded Stocks";

  const mostTradedSubtitle =
    sessionView === "pre"
      ? "Early session activity and gap leaders"
      : "Highest activity on the tape right now";

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-black p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
      <SectionHeader
        eyebrow="Most Traded"
        title={mostTradedTitle}
        subtitle={mostTradedSubtitle}
        action={
          <div className="flex items-center gap-2">
            <SessionToggleButton
              active={sessionView === "regular"}
              onClick={() => setSessionView("regular")}
            >
              Regular
            </SessionToggleButton>
            <SessionToggleButton
              active={sessionView === "pre"}
              onClick={() => setSessionView("pre")}
            >
              Pre-Market
            </SessionToggleButton>
          </div>
        }
      />

      <div className="space-y-1.5">
        {displayedRows.length ? (
          displayedRows.slice(0, MAX_MOST_TRADED_ROWS).map((row) => (
            <button
              type="button"
              key={`${sessionView}-${row.ticker}`}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-transparent px-3.5 py-1.5 text-left transition hover:border-cyan-400/20 hover:bg-cyan-400/3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-[15px] font-semibold leading-none tracking-tight text-white sm:text-[22px]">
                    {row.ticker}
                  </div>

                  {sessionView === "pre" ? (
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-200/80">
                      PRE
                    </span>
                  ) : null}
                </div>

                <div className="mt-0.5 truncate text-[11px] leading-tight text-white/56">
                  {row.name ?? row.ticker}
                </div>
                {row.pulse?.topLabel ? (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span
                      title={row.pulse.headline}
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${pulseBadgeClass(
                        row.pulse.tone
                      )}`}
                    >
                      {row.pulse.topLabel}
                    </span>
                    {row.pulse.newestAgeLabel ? (
                      <span className="text-[11px] text-white/38">{row.pulse.newestAgeLabel}</span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="ml-3 shrink-0 text-right">
                <div className="text-sm font-semibold leading-none tracking-tight text-white sm:text-[18px]">
                  {formatPrice(row.price)}
                </div>
                <div className={`mt-0.5 text-[11px] font-medium leading-none ${pctClass(row.changePct)}`}>
                  {formatPct(row.changePct)}
                </div>
                <div className="mt-0.5 text-[10px] leading-none text-white/42">
                  {formatCompactNumber(row.volume)}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white/45">
            {sessionView === "pre"
              ? preMarketMessage
              : "No regular-session leaders right now."}
          </div>
        )}
      </div>
    </section>
  );
}