"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { SectionHeader } from "@/components/today/SectionHeader";
import type { RankedSetupItem } from "@/lib/today/setupDiscovery";

type SetupSession = "regular" | "pre";

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

function percentClass(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "text-white";
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-white";
}

function formatPercent(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function emergingTag(item: {
  shortReasonTag?: string | null;
  structureLabel?: string | null;
  rvol?: number | null;
}) {
  if (item.shortReasonTag) return item.shortReasonTag.toLowerCase();
  if (item.structureLabel) return item.structureLabel.toLowerCase();
  if (typeof item.rvol === "number" && Number.isFinite(item.rvol) && item.rvol >= 1.5) {
    return "volume building";
  }
  return "expansion forming";
}

export default function TodayEmergingSetupsPanel({
  items,
  preMarketItems,
  preMarketSourceRowCount = 0,
  preMarketQualifiedCount = 0,
  preMarketFallbackUsed = false,
  defaultSession = "regular",
}: {
  items: RankedSetupItem[];
  preMarketItems: RankedSetupItem[];
  preMarketSourceRowCount?: number;
  preMarketQualifiedCount?: number;
  preMarketFallbackUsed?: boolean;
  defaultSession?: SetupSession;
}) {
  const [sessionView, setSessionView] = useState<SetupSession>(defaultSession);

  const emergingSetups = useMemo(
    () => (sessionView === "pre" ? preMarketItems : items).slice(0, 4),
    [items, preMarketItems, sessionView]
  );

  const title = sessionView === "pre" ? "Pre-Market Emerging" : "Emerging Setups";
  const subtitle =
    sessionView === "pre"
      ? "Early expansion names showing speculative flow and unusual pre-market activity."
      : "Higher-energy names showing expansion and unusual activity.";
  const emergingHref = `/screener/setups?view=emerging&session=${sessionView}`;
  const preMarketHealthLabel =
    preMarketSourceRowCount === 0
      ? "Source empty"
      : preMarketFallbackUsed
        ? "Fallback movers"
        : preMarketQualifiedCount === 0
          ? "Filtered"
          : "Live feed";
  const preMarketHealthTone =
    preMarketSourceRowCount === 0
      ? "border-rose-400/20 bg-rose-400/10 text-rose-200"
      : preMarketFallbackUsed
        ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
        : preMarketQualifiedCount === 0
          ? "border-white/10 bg-white/5 text-white/70"
          : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-slate-950/88 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
      <SectionHeader
        eyebrow="Developing Early"
        title={title}
        subtitle={subtitle}
        layoutClassName="mb-4 flex flex-col gap-3"
        actionClassName="w-full"
        action={
          <div className="flex w-full flex-wrap items-center gap-2 justify-start sm:justify-end">
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
            <Link
              href={emergingHref}
              className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs text-white/70"
            >
              Emerging
            </Link>
          </div>
        }
      />

      {sessionView === "pre" ? (
        <>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-white/40">
            <span className={`rounded-full border px-2 py-1 ${preMarketHealthTone}`}>
              {preMarketHealthLabel}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
              Source: {preMarketSourceRowCount}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
              Qualified: {preMarketQualifiedCount}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
              Rendered: {preMarketItems.length}
            </span>
          </div>
          <div className="mt-2 text-xs text-white/45">
            {preMarketSourceRowCount === 0
              ? "No pre-market rows have reached Today from the mover source yet."
              : preMarketFallbackUsed
                ? "Using direct pre-market mover rows because emerging qualification returned zero names."
                : preMarketQualifiedCount === 0
                  ? "Source rows are present, but none qualified for the emerging panel."
                  : "Pre-market emerging names are qualifying normally."}
          </div>
        </>
      ) : null}

      <div className="space-y-3">
        {emergingSetups.length ? (
          emergingSetups.map((item) => (
            <Link
              key={`${sessionView}-${item.ticker}`}
              href={`/stocks/${item.ticker}?source=%2Ftoday&session=${sessionView}`}
              className="flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/3 px-4 py-3 text-left transition hover:border-cyan-400/25 hover:bg-cyan-400/5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-white">{item.ticker}</div>
                <div className="mt-1 text-sm text-white/60">{item.whyThisSetup}</div>
              </div>

              <div className="flex items-center justify-between gap-3 sm:ml-4 sm:shrink-0 sm:flex-col sm:items-end sm:text-right">
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-200">
                  {emergingTag(item)}
                </div>
                <div className={`text-sm sm:mt-2 ${percentClass(item.changePercent)}`}>
                  {formatPercent(item.changePercent)}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 px-4 py-6 text-sm text-white/55">
            No {sessionView === "pre" ? "pre-market emerging" : "emerging"} setups are available yet.
          </div>
        )}
      </div>
    </section>
  );
}