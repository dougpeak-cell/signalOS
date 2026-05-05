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
  defaultSession = "regular",
}: {
  items: RankedSetupItem[];
  preMarketItems: RankedSetupItem[];
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

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-slate-950/88 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
      <SectionHeader
        eyebrow="Developing Early"
        title={title}
        subtitle={subtitle}
        action={
          <div className="flex flex-wrap items-center gap-2 justify-end">
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

      <div className="space-y-3">
        {emergingSetups.length ? (
          emergingSetups.map((item) => (
            <Link
              key={`${sessionView}-${item.ticker}`}
              href={`/stocks/${item.ticker}?source=%2Ftoday&session=${sessionView}`}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/3 px-4 py-3 text-left transition hover:border-cyan-400/25 hover:bg-cyan-400/5"
            >
              <div>
                <div className="text-base font-semibold text-white">{item.ticker}</div>
                <div className="mt-1 text-sm text-white/60">{item.whyThisSetup}</div>
              </div>

              <div className="ml-4 shrink-0 text-right">
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-200">
                  {emergingTag(item)}
                </div>
                <div className={`mt-2 text-sm ${percentClass(item.changePercent)}`}>
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