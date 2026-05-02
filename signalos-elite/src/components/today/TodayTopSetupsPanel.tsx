"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { SectionHeader } from "@/components/today/SectionHeader";
import { isPreMarketNow } from "@/lib/today/marketPhase";
import type { TodaySetupItem } from "@/lib/today/pageData";

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

function biasPillClass(label?: string | null) {
  const normalized = String(label ?? "").toLowerCase();

  if (normalized.includes("bull")) {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (normalized.includes("bear")) {
    return "border-rose-400/20 bg-rose-400/10 text-rose-200";
  }

  return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
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

function companyLine(name: string, sector?: string | null) {
  const trimmedSector = String(sector ?? "").trim();
  return trimmedSector ? `${name} • ${trimmedSector}` : name;
}

function pulseBadgeClass(tone?: "positive" | "neutral" | "negative" | null) {
  if (tone === "positive") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (tone === "negative") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-200";
  }

  return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
}

export default function TodayTopSetupsPanel({
  items,
  preMarketItems,
  preMarketRawCandidateCount = 0,
  defaultSession = "regular",
}: {
  items: TodaySetupItem[];
  preMarketItems: TodaySetupItem[];
  preMarketRawCandidateCount?: number;
  defaultSession?: SetupSession;
}) {
  const [sessionView, setSessionView] = useState<SetupSession>(() =>
    isPreMarketNow() ? "pre" : defaultSession
  );

  const preMarketActive = isPreMarketNow();
  const preMarketRows = preMarketActive && preMarketItems.length ? preMarketItems : [];
  const preMarketMessage = preMarketActive
    ? "Pre-market is active. No qualified setups are passing filters yet."
    : "Pre-market opens at 4:00 AM ET.";
  const preMarketFilteredCount = Math.max(
    0,
    preMarketRawCandidateCount - preMarketItems.length
  );

  const activeSetups = useMemo(
    () => (sessionView === "pre" ? preMarketRows : items).slice(0, 4),
    [items, preMarketRows, sessionView]
  );

  const title = sessionView === "pre" ? "Pre-Market Setups" : "Top Setups";
  const subtitle =
    sessionView === "pre"
      ? "Early movers with liquidity, relative volume, and catalyst pressure before the open."
      : "Highest-conviction names worth opening first.";
  const setupsHref = `/screener/setups?view=top&session=${sessionView}`;

  return (
    <section
      id="top-setups"
      className="rounded-2xl border border-cyan-500/20 bg-slate-950/88 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
    >
      <SectionHeader
        eyebrow="Highest Conviction"
        title={title}
        subtitle={subtitle}
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
            <Link
              href={setupsHref}
              className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-200"
            >
              See All Setups
            </Link>
          </div>
        }
      />

      {sessionView === "pre" ? (
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-white/40">
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
            Raw: {preMarketRawCandidateCount}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
            Displayed: {preMarketItems.length}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
            Filtered Out: {preMarketFilteredCount}
          </span>
        </div>
      ) : null}

      <div className="space-y-3">
        {activeSetups.length ? (
          activeSetups.map((item) => (
            <Link
              key={`${sessionView}-${item.ticker}`}
              href={`/stocks/${item.ticker}?source=%2Ftoday&session=${sessionView}`}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/3 px-4 py-3 text-left transition hover:border-cyan-400/25 hover:bg-cyan-400/5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-white">{item.ticker}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${biasPillClass(
                      item.setupBiasLabel
                    )}`}
                  >
                    {item.setupLabel ?? item.setupBiasLabel}
                  </span>
                  {item.pulse?.topLabel ? (
                    <span
                      title={item.pulse.headline}
                      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${pulseBadgeClass(
                        item.pulse.tone
                      )}`}
                    >
                      {item.pulse.topLabel}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-xs text-white/45">
                  {companyLine(item.name, item.sector)}
                </div>
                <div className="mt-2 text-sm text-white/62">{item.whyThisSetup}</div>
              </div>

              <div className="ml-4 shrink-0 text-right">
                <div className="text-sm font-semibold text-white">{item.score}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                  score
                </div>
                <div className={`mt-2 text-sm ${percentClass(item.changePercent)}`}>
                  {formatPercent(item.changePercent)}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 px-4 py-6 text-sm text-white/55">
            {sessionView === "pre"
              ? preMarketMessage
              : "No top setups are available yet."}
          </div>
        )}
      </div>
    </section>
  );
}