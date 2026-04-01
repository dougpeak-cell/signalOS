"use client";

import Link from "next/link";

import { useSelectedSignal } from "@/components/chart/SelectedSignalContext";
import SigiRightRail from "@/components/shell/SigiRightRail";

type Props = {
  stock: {
    ticker?: string;
    price?: number | null;
    [key: string]: unknown;
  };
  currentPrice?: number | null;
  signalSummary?: {
    label?: string;
    score?: number | null;
    confidence?: number | null;
    [key: string]: unknown;
  } | null;
  nearestLiquidity?: {
    vwap?: number | null;
    [key: string]: unknown;
  } | null;
  sessionLevels?: {
    premarketHigh?: number | null;
    premarketLow?: number | null;
    sessionHigh?: number | null;
    sessionLow?: number | null;
    previousDayHigh?: number | null;
    previousDayLow?: number | null;
  } | null;
  priorityZones?: {
    label: string;
    top: number;
    bottom: number;
    mid: number;
    strength: number;
    touches: number;
    kind: "supply" | "demand";
  }[];
  confluenceState?: {
    buySideSweep?: boolean;
    upsideExhaustion?: boolean;
    equalHighs?: boolean;
    bullishAbsorption?: boolean;
    confluenceShort?: boolean;
  };
};

function statTone(label: string) {
  if (label.toLowerCase().includes("bull")) return "text-emerald-300";
  if (label.toLowerCase().includes("bear")) return "text-rose-300";
  if (label.toLowerCase().includes("vwap")) return "text-sky-300";
  return "text-white";
}

function formatLevel(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return Number(value).toFixed(2);
}

export default function RightRailLiveChart({
  confluenceState,
  stock,
  currentPrice,
  signalSummary,
  nearestLiquidity,
  sessionLevels,
  priorityZones = [],
}: Props) {
  const {
    sessionLevels: liveSessionLevels,
    liveVwap,
  } = useSelectedSignal();

  const resolvedSessionLevels = liveSessionLevels ?? sessionLevels ?? null;
  const resolvedVwap = liveVwap ?? nearestLiquidity?.vwap ?? null;

  const referencePrice =
    typeof currentPrice === "number" && Number.isFinite(currentPrice)
      ? currentPrice
      : typeof stock?.price === "number" && Number.isFinite(stock.price)
        ? stock.price
        : null;

  const candidateLevels = [
    resolvedSessionLevels?.premarketHigh,
    resolvedSessionLevels?.premarketLow,
    resolvedSessionLevels?.sessionHigh,
    resolvedSessionLevels?.sessionLow,
    resolvedSessionLevels?.previousDayHigh,
    resolvedSessionLevels?.previousDayLow,
  ].filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  const uniqueLevels = Array.from(new Set(candidateLevels)).sort((a, b) => a - b);

  const validZones = (priorityZones ?? []).filter(
    (zone) =>
      zone &&
      Number.isFinite(zone.top) &&
      Number.isFinite(zone.bottom) &&
      Number.isFinite(zone.mid) &&
      Number.isFinite(zone.strength)
  );

  const zonesContainingPrice =
    referencePrice == null
      ? []
      : validZones.filter(
          (zone) =>
            referencePrice >= Math.min(zone.bottom, zone.top) &&
            referencePrice <= Math.max(zone.bottom, zone.top)
        );

  const activeZone =
    zonesContainingPrice.sort((a, b) => b.strength - a.strength)[0] ?? null;

  const nearestSupplyZone =
    activeZone?.kind === "supply"
      ? activeZone
      : referencePrice == null
        ? null
        : validZones
            .filter((zone) => zone.kind === "supply" && zone.mid > referencePrice)
            .sort((a, b) => a.mid - b.mid)[0] ?? null;

  const nearestDemandZone =
    activeZone?.kind === "demand"
      ? activeZone
      : referencePrice == null
        ? null
        : validZones
            .filter((zone) => zone.kind === "demand" && zone.mid < referencePrice)
            .sort((a, b) => b.mid - a.mid)[0] ?? null;

  const fallbackNearestUpside =
    referencePrice == null
      ? null
      : uniqueLevels.find((level) => level > referencePrice) ?? null;

  const fallbackNearestDownside =
    referencePrice == null
      ? null
      : [...uniqueLevels].reverse().find((level) => level < referencePrice) ?? null;

  const displayNearestUpside =
    nearestSupplyZone?.mid ?? fallbackNearestUpside;

  const displayNearestDownside =
    nearestDemandZone?.mid ?? fallbackNearestDownside;

  const displayNearestUpsideLabel =
    nearestSupplyZone
      ? `Supply (${nearestSupplyZone.strength.toFixed(2)})`
      : "Nearest Upside";

  const displayNearestDownsideLabel =
    nearestDemandZone
      ? `Demand (${nearestDemandZone.strength.toFixed(2)})`
      : "Nearest Downside";

  const displayVwap =
    typeof resolvedVwap === "number" && Number.isFinite(resolvedVwap)
      ? resolvedVwap
      : null;

  const setupLabel = signalSummary?.label ?? `${stock?.ticker ?? "Stock"} Setup`;
  const setupScore = signalSummary?.score != null ? signalSummary.score : "—";
  const setupConfidence =
    signalSummary?.confidence != null ? signalSummary.confidence : "—";

  const activeTicker = stock?.ticker ?? "NVDA";

  const confluenceStack = [
    { label: "Buy-Side Sweep", active: confluenceState?.buySideSweep ?? false },
    { label: "Upside Exhaustion", active: confluenceState?.upsideExhaustion ?? false },
    { label: "Equal Highs", active: confluenceState?.equalHighs ?? false },
    { label: "Bullish Absorption", active: confluenceState?.bullishAbsorption ?? false },
    { label: "Confluence Short", active: confluenceState?.confluenceShort ?? false },
  ];

  const allIdle = confluenceStack.every((s) => !s.active);

  const regimeText =
    signalSummary?.label?.toLowerCase().includes("bull")
      ? "Bullish intraday pressure"
      : signalSummary?.label?.toLowerCase().includes("bear")
        ? "Bearish intraday pressure"
        : "Balanced intraday structure";

  const regimeTone = statTone(regimeText);

  return (
  <div className="space-y-6 min-w-0">
    <SigiRightRail
      ticker={activeTicker}
      bias={
        (signalSummary?.label ?? "").toLowerCase().includes("bull")
          ? "bullish"
          : (signalSummary?.label ?? "").toLowerCase().includes("bear")
          ? "bearish"
          : "neutral"
      }
      confidence={typeof setupConfidence === "number" ? setupConfidence : null}
    />
      <div className="glow-panel rounded-3xl p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/85">
          Live Signal Intelligence
        </div>

        <div className="mt-4 glow-card-soft rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                Active Setup
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {setupLabel}
              </div>
              <div className="mt-1 text-sm text-white/55">
                Regime-aligned live structure
              </div>
            </div>

            <div className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-300">
              Live
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="glow-card-soft rounded-2xl px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Score
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {setupScore}
              </div>
            </div>

            <div className="glow-card-soft rounded-2xl px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Confidence
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {setupConfidence}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <div className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">
              1m
            </div>
            <div className="rounded-full border border-white/10 bg-white/4 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
              Day Open
            </div>
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Live Tape Active
            </div>
          </div>
        </div>
      </div>

      <div className="glow-card rounded-3xl p-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Confluence Stack
          </div>

          {allIdle && (
            <div className="mt-1 text-[10px] text-white/35">
              Awaiting market structure
            </div>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {confluenceStack.map((item) => (
            <div
              key={item.label}
              className="glow-card-soft flex items-center justify-between rounded-2xl px-3 py-3"
            >
              <div className="text-sm text-white/85">{item.label}</div>

              <div
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  item.active
                    ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                    : "border border-white/10 bg-white/4 text-white/35"
                }`}
              >
                {item.active ? "active" : "idle"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glow-card rounded-3xl p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
          Nearest Liquidity
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                <span className="text-emerald-400">↑</span> {displayNearestUpsideLabel}
              </div>

              <div className="text-sm font-semibold text-emerald-300">
                {formatLevel(displayNearestUpside)}
              </div>
            </div>

            <div className="h-1 w-full rounded-full bg-linear-to-r from-emerald-400 via-emerald-400 to-transparent shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                <span className="text-rose-400">↓</span> {displayNearestDownsideLabel}
              </div>

              <div className="text-sm font-semibold text-rose-300">
                {formatLevel(displayNearestDownside)}
              </div>
            </div>

            <div className="h-1 w-full rounded-full bg-linear-to-r from-rose-400 via-rose-400 to-transparent shadow-[0_0_10px_rgba(244,63,94,0.6)]" />
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                VWAP
              </div>

              <div className="text-sm font-semibold text-sky-300">
                {formatLevel(displayVwap)}
              </div>
            </div>

            <div className="h-1 w-full rounded-full bg-linear-to-r from-sky-400 via-sky-400 to-transparent shadow-[0_0_10px_rgba(56,189,248,0.6)]" />
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-linear-to-b from-white/4 to-white/2 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_50px_rgba(0,0,0,0.35)]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
          Key Levels
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-3 py-2">
            <span className="text-white/55">PM High</span>
            <span className="font-semibold text-emerald-300">
              {formatLevel(resolvedSessionLevels?.premarketHigh)}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-3 py-2">
            <span className="text-white/55">PM Low</span>
            <span className="font-semibold text-rose-300">
              {formatLevel(resolvedSessionLevels?.premarketLow)}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-3 py-2">
            <span className="text-white/55">RTH High</span>
            <span className="font-semibold text-sky-300">
              {formatLevel(resolvedSessionLevels?.sessionHigh)}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-3 py-2">
            <span className="text-white/55">RTH Low</span>
            <span className="font-semibold text-amber-300">
              {formatLevel(resolvedSessionLevels?.sessionLow)}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-3 py-2">
            <span className="text-white/55">PD High</span>
            <span className="font-semibold text-violet-300">
              {formatLevel(resolvedSessionLevels?.previousDayHigh)}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-3 py-2">
            <span className="text-white/55">PD Low</span>
            <span className="font-semibold text-pink-300">
              {formatLevel(resolvedSessionLevels?.previousDayLow)}
            </span>
          </div>
        </div>
      </div>

      <div className="glow-card rounded-3xl p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
          Quick Actions
        </div>

        <div className="mt-4 grid gap-3">
          <Link
            href={`/stocks/${activeTicker}/live`}
            className="glow-card-soft rounded-2xl px-3 py-3 text-sm text-white/80 transition hover:text-white"
          >
            Focus current setup
          </Link>

          <Link
            href={`/stocks/${activeTicker}`}
            className="glow-card-soft rounded-2xl px-3 py-3 text-sm text-white/80 transition hover:text-white"
          >
            Open research page
          </Link>

          <div className="glow-card-soft rounded-2xl px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
              Regime
            </div>
            <div className={`mt-1 text-sm font-medium ${regimeTone}`}>
              {regimeText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}