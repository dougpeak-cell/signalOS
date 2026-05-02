"use client";

import { useEffect, useMemo, useState } from "react";

type SignalLike = {
  time: number;
  type: string;
  price?: number;
} | null;

type PriorityZone = {
  label: string;
  top: number;
  bottom: number;
  mid: number;
  strength: number;
  touches: number;
  kind: "supply" | "demand";
};

type ConfluenceState = {
  buySideSweep?: boolean;
  upsideExhaustion?: boolean;
  equalHighs?: boolean;
  bullishAbsorption?: boolean;
  confluenceShort?: boolean;
};

type TradeBriefLike = {
  bias?: string | null;
  title?: string | null;
  label?: string | null;
  entry?: number | null;
  stop?: number | null;
  target?: number | null;
  summary?: string | null;
  scenario?: string | null;
  invalidation?: string | null;
  catalysts?: string[] | null;
  risks?: string[] | null;
  confidence?: number | null;
  [key: string]: unknown;
};

type Props = {
  brief?: TradeBriefLike | null | undefined;
  selectedSignal?: SignalLike;
  livePrice?: number | null;
  priorityZones?: PriorityZone[];
  confluenceState?: ConfluenceState;
};

type AutoTradePlan = {
  bias: "Bullish" | "Bearish" | "Neutral";
  entry: number | null;
  stop: number | null;
  target: number | null;
  summary: string;
  scenario: string;
  invalidation: string;
  catalysts: string[];
  risks: string[];
};

function biasTone(bias?: string | null) {
  const b = (bias ?? "").toLowerCase();

  if (b.includes("bull")) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  }

  if (b.includes("bear")) {
    return "border-rose-500/25 bg-rose-500/10 text-rose-300";
  }

  return "border-white/10 bg-white/5 text-white/70";
}

function formatPrice(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(2)
    : "—";
}

function round2(value: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(value * 100) / 100
    : null;
}

function inferBias(
  selectedSignal?: SignalLike,
  brief?: TradeBriefLike | null,
  confluenceState?: ConfluenceState
): "Bullish" | "Bearish" | "Neutral" {
  const signalType = selectedSignal?.type?.toLowerCase?.() ?? "";
  const briefBias = brief?.bias?.toLowerCase?.() ?? "";
  const briefTitle = brief?.title?.toLowerCase?.() ?? "";
  const briefLabel =
    typeof brief?.label === "string" ? brief.label.toLowerCase() : "";

  const combined = [signalType, briefBias, briefTitle, briefLabel].join(" ");

  if (
    combined.includes("long") ||
    combined.includes("bull") ||
    combined.includes("demand") ||
    combined.includes("reclaim") ||
    combined.includes("support")
  ) {
    return "Bullish";
  }

  if (
    combined.includes("short") ||
    combined.includes("bear") ||
    combined.includes("supply") ||
    combined.includes("rejection") ||
    combined.includes("resistance") ||
    confluenceState?.confluenceShort
  ) {
    return "Bearish";
  }

  return "Neutral";
}

function buildFallbackTrade(
  sourcePrice: number,
  bias: "Bullish" | "Bearish" | "Neutral"
): AutoTradePlan {
  const bearish = bias === "Bearish";
  const neutral = bias === "Neutral";

  const entry = sourcePrice;
  const stop = neutral
    ? sourcePrice * 0.99
    : bearish
      ? sourcePrice * 1.01
      : sourcePrice * 0.99;

  const target = neutral
    ? sourcePrice * 1.02
    : bearish
      ? sourcePrice * 0.97
      : sourcePrice * 1.03;

  return {
    bias,
    entry: round2(entry),
    stop: round2(stop),
    target: round2(target),
    summary: neutral
      ? "Price is balanced, so the model falls back to a structure-neutral tactical plan."
      : bearish
        ? "Momentum favors a bearish continuation unless price quickly reclaims overhead supply."
        : "Momentum favors a bullish continuation while price holds above nearby demand.",
    scenario: neutral
      ? "Wait for confirmation around the current live price before pressing size."
      : bearish
        ? "Use rebounds into resistance/supply as short-location opportunities."
        : "Use pullbacks into support/demand as long-location opportunities.",
    invalidation: neutral
      ? `A decisive break away from ${formatPrice(sourcePrice)} invalidates the neutral setup.`
      : bearish
        ? `A sustained move back above ${formatPrice(stop)} weakens the short thesis.`
        : `A sustained move below ${formatPrice(stop)} weakens the long thesis.`,
    catalysts: neutral
      ? ["Await confirmation from tape and structure."]
      : bearish
        ? ["Watch for rejection from overhead resistance.", "Monitor continued weakness below local structure."]
        : ["Watch for demand to hold on pullbacks.", "Monitor continuation through nearby resistance."],
    risks: neutral
      ? ["No clear directional edge yet."]
      : bearish
        ? ["Fast reclaim through resistance can trap shorts."]
        : ["Failure to hold support can unwind the setup quickly."],
  };
}

function buildZoneTrade(
  sourcePrice: number,
  bias: "Bullish" | "Bearish" | "Neutral",
  priorityZones: PriorityZone[],
  confluenceState?: ConfluenceState
): AutoTradePlan {
  const validZones = (priorityZones ?? []).filter(
    (zone) =>
      zone &&
      Number.isFinite(zone.top) &&
      Number.isFinite(zone.bottom) &&
      Number.isFinite(zone.mid) &&
      Number.isFinite(zone.strength)
  );

  const activeZone =
    validZones
      .filter(
        (zone) =>
          sourcePrice >= Math.min(zone.bottom, zone.top) &&
          sourcePrice <= Math.max(zone.bottom, zone.top)
      )
      .sort((a, b) => b.strength - a.strength)[0] ?? null;

  const nearestDemand =
    activeZone?.kind === "demand"
      ? activeZone
      : validZones
          .filter((zone) => zone.kind === "demand" && zone.mid < sourcePrice)
          .sort((a, b) => b.mid - a.mid)[0] ?? null;

  const nearestSupply =
    activeZone?.kind === "supply"
      ? activeZone
      : validZones
          .filter((zone) => zone.kind === "supply" && zone.mid > sourcePrice)
          .sort((a, b) => a.mid - b.mid)[0] ?? null;

  const inferredBias =
    bias === "Neutral"
      ? activeZone?.kind === "demand"
        ? "Bullish"
        : activeZone?.kind === "supply" || confluenceState?.confluenceShort
          ? "Bearish"
          : "Neutral"
      : bias;

  const zoneRange = (zone: PriorityZone | null) =>
    zone ? Math.max(0.05, Math.abs(zone.top - zone.bottom)) : 0.5;

  if (inferredBias === "Bullish" && nearestDemand) {
    const buffer = zoneRange(nearestDemand) * 0.2;
    const entry =
      activeZone?.kind === "demand"
        ? sourcePrice
        : Math.max(nearestDemand.mid, Math.min(sourcePrice, nearestDemand.top));
    const stop = Math.min(nearestDemand.bottom, nearestDemand.top) - buffer;
    const target =
      nearestSupply?.mid ?? entry + Math.max(entry - stop, 0.25) * 2;

    return {
      bias: "Bullish",
      entry: round2(entry),
      stop: round2(stop),
      target: round2(target),
      summary: `Bullish plan is anchored to ${nearestDemand.label} as demand support, with upside mapped into ${
        nearestSupply?.label ?? "the next available expansion objective"
      }.`,
      scenario:
        activeZone?.kind === "demand"
          ? "Price is trading inside demand, so this is a live support-hold / reclaim setup."
          : "Look for pullbacks toward demand to hold before pressing continuation higher.",
      invalidation: `A clean loss of ${formatPrice(stop)} breaks the demand structure and weakens the long thesis.`,
      catalysts: [
        `Demand zone strength ${nearestDemand.strength.toFixed(2)} is supporting the plan.`,
        nearestSupply
          ? `Primary upside map is ${nearestSupply.label} near ${formatPrice(nearestSupply.mid)}.`
          : "No clear opposing supply zone detected, so target uses expansion logic.",
        confluenceState?.bullishAbsorption
          ? "Bullish absorption is active."
          : "Watch for confirmation from tape near demand.",
      ].filter(Boolean),
      risks: [
        nearestDemand.touches >= 2
          ? "Demand has been tested multiple times and may react less cleanly."
          : "Fresh demand can still fail if momentum weakens.",
        confluenceState?.confluenceShort
          ? "Bearish confluence remains active against the long setup."
          : "Failure to reclaim off demand can lead to a fast unwind.",
      ].filter(Boolean),
    };
  }

  if (inferredBias === "Bearish" && nearestSupply) {
    const buffer = zoneRange(nearestSupply) * 0.2;
    const entry =
      activeZone?.kind === "supply"
        ? sourcePrice
        : Math.min(nearestSupply.mid, Math.max(sourcePrice, nearestSupply.bottom));
    const stop = Math.max(nearestSupply.top, nearestSupply.bottom) + buffer;
    const target =
      nearestDemand?.mid ?? entry - Math.max(stop - entry, 0.25) * 2;

    return {
      bias: "Bearish",
      entry: round2(entry),
      stop: round2(stop),
      target: round2(target),
      summary: `Bearish plan is anchored to ${nearestSupply.label} as supply resistance, with downside mapped into ${
        nearestDemand?.label ?? "the next available expansion objective"
      }.`,
      scenario:
        activeZone?.kind === "supply"
          ? "Price is trading inside supply, so this is a live rejection / fade setup."
          : "Look for rebounds into supply to fail before pressing continuation lower.",
      invalidation: `A clean reclaim above ${formatPrice(stop)} breaks the supply structure and weakens the short thesis.`,
      catalysts: [
        `Supply zone strength ${nearestSupply.strength.toFixed(2)} is capping the plan.`,
        nearestDemand
          ? `Primary downside map is ${nearestDemand.label} near ${formatPrice(nearestDemand.mid)}.`
          : "No clear opposing demand zone detected, so target uses expansion logic.",
        confluenceState?.confluenceShort
          ? "Confluence short remains active."
          : "Watch for confirmation from rejection flow near supply.",
      ].filter(Boolean),
      risks: [
        nearestSupply.touches >= 2
          ? "Supply has been tested multiple times and may react less cleanly."
          : "Fresh supply can still break if momentum accelerates.",
        confluenceState?.bullishAbsorption
          ? "Bullish absorption is active against the short setup."
          : "Failure to reject from supply can squeeze the trade quickly.",
      ].filter(Boolean),
    };
  }

  return buildFallbackTrade(sourcePrice, inferredBias);
}

export default function TradeBriefPanel({
  brief,
  selectedSignal,
  livePrice,
  priorityZones = [],
  confluenceState,
}: Props) {
  const [autoTrade, setAutoTrade] = useState<AutoTradePlan | null>(null);

  useEffect(() => {
    const sourcePrice =
      typeof livePrice === "number" && Number.isFinite(livePrice)
        ? livePrice
        : typeof selectedSignal?.price === "number" && Number.isFinite(selectedSignal.price)
          ? selectedSignal.price
          : null;

    if (typeof sourcePrice !== "number" || !Number.isFinite(sourcePrice)) {
      setAutoTrade(null);
      return;
    }

    const bias = inferBias(selectedSignal, brief, confluenceState);

    const generatedPlan =
      Array.isArray(priorityZones) && priorityZones.length > 0
        ? buildZoneTrade(sourcePrice, bias, priorityZones, confluenceState)
        : buildFallbackTrade(sourcePrice, bias);

    setAutoTrade(generatedPlan);
  }, [selectedSignal, livePrice, brief, priorityZones, confluenceState]);

  const safeBrief: TradeBriefLike = useMemo(
    () => ({
      title:
        typeof brief?.title === "string" && brief.title.trim().length > 0
          ? brief.title
          : "Auto Trade Brief",
      bias:
        autoTrade?.bias ??
        (typeof brief?.bias === "string" && brief.bias.trim().length > 0
          ? brief.bias
          : "Neutral"),
      entry:
        autoTrade?.entry ??
        (typeof brief?.entry === "number" ? brief.entry : null),
      stop:
        autoTrade?.stop ??
        (typeof brief?.stop === "number" ? brief.stop : null),
      target:
        autoTrade?.target ??
        (typeof brief?.target === "number" ? brief.target : null),
      summary:
        autoTrade?.summary ??
        (typeof brief?.summary === "string" && brief.summary.trim().length > 0
          ? brief.summary
          : "No summary available."),
      scenario:
        autoTrade?.scenario ??
        (typeof brief?.scenario === "string" && brief.scenario.trim().length > 0
          ? brief.scenario
          : "No scenario available."),
      invalidation:
        autoTrade?.invalidation ??
        (typeof brief?.invalidation === "string" &&
        brief.invalidation.trim().length > 0
          ? brief.invalidation
          : "No invalidation level available."),
      catalysts:
        autoTrade?.catalysts ??
        (Array.isArray(brief?.catalysts) && brief.catalysts.length > 0
          ? brief.catalysts
          : []),
      risks:
        autoTrade?.risks ??
        (Array.isArray(brief?.risks) && brief.risks.length > 0
          ? brief.risks
          : []),
      confidence:
        typeof brief?.confidence === "number" && Number.isFinite(brief.confidence)
          ? brief.confidence
          : null,
    }),
    [brief, autoTrade]
  );

  const hasStructuredBrief = Boolean(
    brief &&
      (
        typeof brief.summary === "string" ||
        typeof brief.scenario === "string" ||
        typeof brief.invalidation === "string" ||
        (Array.isArray(brief.catalysts) && brief.catalysts.length > 0) ||
        (Array.isArray(brief.risks) && brief.risks.length > 0)
      )
  );

  const hasGeneratedTrade = Boolean(
    autoTrade?.entry != null || autoTrade?.stop != null || autoTrade?.target != null
  );

  const statusLabel = hasStructuredBrief
    ? null
    : hasGeneratedTrade
      ? "Generated Setup"
      : "No Active Signal";

  return (
    <section className="rounded-[28px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(10,16,33,0.95),rgba(7,11,22,0.98))] p-5 shadow-[0_0_0_1px_rgba(0,255,200,0.03),0_0_20px_rgba(0,255,200,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-300/85">
            AI Trade Intelligence
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="text-2xl font-semibold text-white">
              Auto Trade Brief
            </div>

            {statusLabel ? (
              <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-300">
                {statusLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {safeBrief.confidence != null ? (
            <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
              {safeBrief.confidence}% confidence
            </div>
          ) : null}

          <div
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${biasTone(
              safeBrief.bias
            )}`}
          >
            {safeBrief.bias ?? "Neutral"}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
            Entry
          </div>
          <div className="mt-2 text-lg font-semibold text-white">
            {formatPrice(safeBrief.entry)}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
            Stop
          </div>
          <div className="mt-2 text-lg font-semibold text-white">
            {formatPrice(safeBrief.stop)}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
            Target
          </div>
          <div className="mt-2 text-lg font-semibold text-white">
            {formatPrice(safeBrief.target)}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
              Summary
            </div>
            <p className="mt-3 text-sm leading-6 text-white/78">
              {safeBrief.summary}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
              Scenario
            </div>
            <p className="mt-3 text-sm leading-6 text-white/78">
              {safeBrief.scenario}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
              Invalidation
            </div>
            <p className="mt-3 text-sm leading-6 text-white/78">
              {safeBrief.invalidation}
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/4 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-300/80">
              Catalysts
            </div>
            <div className="mt-3 space-y-2">
              {safeBrief.catalysts && safeBrief.catalysts.length > 0 ? (
                safeBrief.catalysts.map((item, idx) => (
                  <div
                    key={`catalyst-${idx}`}
                    className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
                  >
                    {item}
                  </div>
                ))
              ) : (
                <div className="text-sm text-white/40">
                  No catalysts detected.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-500/15 bg-rose-500/4 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-rose-300/80">
              Risks
            </div>
            <div className="mt-3 space-y-2">
              {safeBrief.risks && safeBrief.risks.length > 0 ? (
                safeBrief.risks.map((item, idx) => (
                  <div
                    key={`risk-${idx}`}
                    className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
                  >
                    {item}
                  </div>
                ))
              ) : (
                <div className="text-sm text-white/40">
                  No major risks flagged.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}