"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RadarStatus = "forming" | "confirmed" | "invalidated";
type RadarBias = "bullish" | "bearish" | "neutral";

export type RadarBoardSignal = {
  id: string;
  ticker: string;
  signal: string;
  status: RadarStatus;
  bias?: RadarBias;
  confidence: number;
  confluence?: number;
  timeframe?: string;
  regime?: string;
  liquidity?: number | string;
  ageLabel?: string;
  aligned?: boolean;
  watchlist?: boolean;
  portfolio?: boolean;
  href?: string;
  signalKey?: string;
  signalType?: string;
  signalTime?: number | string;
};

type Props = {
  signals: RadarBoardSignal[];
  marketRegime?: string;
  sessionPhase?: string;
  spyLabel?: string;
  qqqLabel?: string;
  vixLabel?: string;
  maxRowsPerSection?: number;
  className?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function statusPillClass(status: RadarStatus, bias: RadarBias = "neutral") {
  if (status === "forming") {
    return "border-amber-500/30 bg-amber-500/12 text-amber-300";
  }

  if (status === "confirmed") {
    if (bias === "bullish") {
      return "border-emerald-500/30 bg-emerald-500/12 text-emerald-300";
    }
    if (bias === "bearish") {
      return "border-rose-500/30 bg-rose-500/12 text-rose-300";
    }
    return "border-sky-500/30 bg-sky-500/12 text-sky-300";
  }

  return "border-white/10 bg-white/5 text-white/55";
}

function scoreGlow(score: number) {
  if (score >= 92) {
    return "shadow-[0_0_0_1px_rgba(99,102,241,0.28),0_0_26px_rgba(99,102,241,0.18)]";
  }
  if (score >= 86) {
    return "shadow-[0_0_0_1px_rgba(59,130,246,0.18),0_0_18px_rgba(59,130,246,0.10)]";
  }
  return "shadow-[0_0_0_1px_rgba(255,255,255,0.06)]";
}

function formatLiquidity(liquidity: unknown) {
  if (liquidity == null) return "—";

  if (typeof liquidity === "string") return liquidity;

  if (typeof liquidity === "number" && Number.isFinite(liquidity)) {
    return liquidity.toFixed(2);
  }

  return "—";

}

function SectionHeader({
  title,
  count,
  accentClass,
}: {
  title: string;
  count: number;
  accentClass: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className={cn("h-2 w-2 shrink-0 rounded-full", accentClass)} />
        <div className="truncate text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
          {title}
        </div>
      </div>
      <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/55">
        {count}
      </div>
    </div>
  );
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/3 px-2 py-1 text-[10px] font-medium text-white/55">
      {children}
    </div>
  );
}

function RadarRow({ item }: { item: RadarBoardSignal }) {
  const [live, setLive] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/massive/quote?ticker=${item.ticker}`, {
          cache: "no-store",
        });

        if (!res.ok) return;

        const json = await res.json();

        const price =
          typeof json?.lastPrice === "number"
            ? json.lastPrice
            : typeof json?.price === "number"
              ? json.price
              : typeof json?.last === "number"
                ? json.last
                : typeof json?.value === "number"
                  ? json.value
                  : null;

        if (!cancelled && typeof price === "number" && Number.isFinite(price)) {
          setLive(price);
        }
      } catch {
        // keep fallback liquidity
      }
    }

    load();
    const id = window.setInterval(load, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [item.ticker]);

  const displayScore = item.confluence ?? item.confidence;
  const bias = item.bias ?? "neutral";
  const liquidityDisplay =
    live != null ? live.toFixed(2) : formatLiquidity(item.liquidity);

  const row = (
    <div
      className={cn(
        "group min-w-0 rounded-2xl border border-white/8 bg-white/3 p-3 transition-all duration-200",
        "hover:border-white/16 hover:bg-white/5 hover:-translate-y-px",
        scoreGlow(displayScore)
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-semibold tracking-[0.08em] text-white">
              {item.ticker}
            </div>

            <div
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                statusPillClass(item.status, bias)
              )}
            >
              {item.status}
            </div>

            {item.aligned != null && (
              <div
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                  item.aligned
                    ? "border-sky-500/25 bg-sky-500/10 text-sky-300"
                    : "border-white/10 bg-white/5 text-white/45"
                )}
              >
                {item.aligned ? "Aligned" : "Counter"}
              </div>
            )}
          </div>

          <div className="mt-1 truncate text-sm font-medium text-white/85">
            {item.signal}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-lg font-semibold leading-none text-white">
            {displayScore}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
            score
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <MetaChip>TF {item.timeframe ?? "—"}</MetaChip>
        <MetaChip>Regime {item.regime ?? "—"}</MetaChip>
        <MetaChip>LQ {liquidityDisplay}</MetaChip>
        <MetaChip>{item.ageLabel ?? "now"}</MetaChip>
        {item.watchlist ? <MetaChip>Watchlist</MetaChip> : null}
        {item.portfolio ? <MetaChip>Portfolio</MetaChip> : null}
      </div>
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block focus:outline-none">
        {row}
      </Link>
    );
  }

  return row;
}

function RadarColumn({
  title,
  accentClass,
  items,
}: {
  title: string;
  accentClass: string;
  items: RadarBoardSignal[];
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-sm">
      <SectionHeader title={title} count={items.length} accentClass={accentClass} />
      <div className="space-y-3 p-3">
        {items.length ? (
          items.map((item) => <RadarRow key={item.id} item={item} />)
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/2 px-4 py-6 text-sm text-white/40">
            No signals in this section.
          </div>
        )}
      </div>
    </div>
  );
}

export default function InstitutionalRadarBoard({
  signals,
  marketRegime = "Trend Expansion",
  sessionPhase = "Power Hour",
  spyLabel = "SPY +0.8%",
  qqqLabel = "QQQ +1.2%",
  vixLabel = "VIX -3.1%",
  maxRowsPerSection = 5,
  className,
}: Props) {
  const grouped = useMemo(() => {
    const forming = signals
      .filter((s) => s.status === "forming")
      .sort(
        (a, b) => (b.confluence ?? b.confidence) - (a.confluence ?? a.confidence)
      )
      .slice(0, maxRowsPerSection);

    const confirmed = signals
      .filter((s) => s.status === "confirmed")
      .sort(
        (a, b) => (b.confluence ?? b.confidence) - (a.confluence ?? a.confidence)
      )
      .slice(0, maxRowsPerSection);

    const invalidated = signals
      .filter((s) => s.status === "invalidated")
      .sort(
        (a, b) => (b.confluence ?? b.confidence) - (a.confluence ?? a.confidence)
      )
      .slice(0, maxRowsPerSection);

    const priorityWatch = [...signals]
      .sort((a, b) => {
        const aScore = a.confluence ?? a.confidence;
        const bScore = b.confluence ?? b.confidence;

        const aBoost =
          (a.watchlist ? 4 : 0) +
          (a.portfolio ? 3 : 0) +
          (a.aligned ? 2 : 0) +
          (a.status === "confirmed" ? 3 : 0);

        const bBoost =
          (b.watchlist ? 4 : 0) +
          (b.portfolio ? 3 : 0) +
          (b.aligned ? 2 : 0) +
          (b.status === "confirmed" ? 3 : 0);

        return bScore + bBoost - (aScore + aBoost);
      })
      .slice(0, maxRowsPerSection);

    return { forming, confirmed, invalidated, priorityWatch };
  }, [signals, maxRowsPerSection]);

  const totalActive =
    grouped.forming.length + grouped.confirmed.length + grouped.invalidated.length;

  return (
    <section className={cn("space-y-4", className)}>
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-linear-to-b from-white/5 to-white/2 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="border-b border-white/10 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300/85">
                SignalOS Radar Board
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Institutional Market Scanner
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <MetaChip>Regime {marketRegime}</MetaChip>
                <MetaChip>Session {sessionPhase}</MetaChip>
                <MetaChip>{spyLabel}</MetaChip>
                <MetaChip>{qqqLabel}</MetaChip>
                <MetaChip>{vixLabel}</MetaChip>
                <MetaChip>{totalActive} Active</MetaChip>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:w-[320px]">
              <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                  Forming
                </div>
                <div className="mt-1 text-xl font-semibold text-amber-300">
                  {grouped.forming.length}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                  Confirmed
                </div>
                <div className="mt-1 text-xl font-semibold text-emerald-300">
                  {grouped.confirmed.length}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                  Invalidated
                </div>
                <div className="mt-1 text-xl font-semibold text-white/75">
                  {grouped.invalidated.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 2xl:grid-cols-2">
          <div className="min-w-0 space-y-4">
            <RadarColumn
              title="Forming"
              accentClass="bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.45)]"
              items={grouped.forming}
            />
            <RadarColumn
              title="Confirmed"
              accentClass="bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.45)]"
              items={grouped.confirmed}
            />
          </div>

          <div className="min-w-0 space-y-4">
            <RadarColumn
              title="Invalidated"
              accentClass="bg-white/55 shadow-[0_0_12px_rgba(255,255,255,0.18)]"
              items={grouped.invalidated}
            />
            <RadarColumn
              title="Priority Watch"
              accentClass="bg-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.45)]"
              items={grouped.priorityWatch}
            />
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-3 text-xs text-white/45 sm:px-5">
          Click any row to open the full chart page centered on that ticker.
        </div>
      </div>
    </section>
  );
}