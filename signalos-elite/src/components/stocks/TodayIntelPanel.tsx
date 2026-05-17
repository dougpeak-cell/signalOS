"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMarketData } from "@/components/providers/MarketDataProvider";
import { formatMarketClockTimeMs } from "@/lib/marketTime";

type IntelMetricChip = {
  label: string;
  value: string;
};

function commandBuildLiveChartHref(ticker: string): string {
  return `/stocks/${ticker}?source=${encodeURIComponent("/")}`;
}

function commandBuildStockHref(ticker: string): string {
  return `/stocks/${ticker}?source=${encodeURIComponent("/")}`;
}

function formatUpdatedAt(value: number | null): string {
  if (!value) return "—";
  return formatMarketClockTimeMs(value, { includeZone: true });
}

function formatWholeNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null;
  return String(Math.round(value));
}

function formatPct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function IntelCard({
  label,
  value,
  description,
  metrics = [],
  href,
  accent = false,
  warn = false,
}: {
  label: string;
  value: string;
  description?: string;
  metrics?: IntelMetricChip[];
  href?: string;
  accent?: boolean;
  warn?: boolean;
}) {
  const inner = (
    <div
      className={[
        "rounded-3xl border p-4 transition-all duration-200",
        accent
          ? "border-cyan-400/20 bg-cyan-400/10"
          : warn
            ? "border-amber-400/20 bg-amber-400/10"
            : "border-white/10 bg-white/4",
          href ? "hover:scale-[1.01] hover:border-white/20 hover:bg-white/6" : "",
      ].join(" ")}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>

      <div
        className={[
          "mt-2 text-xl font-semibold leading-tight",
          accent
            ? "text-cyan-200"
            : warn
              ? "text-amber-200"
              : "text-white",
        ].join(" ")}
      >
        {value || "—"}
      </div>

      <div className="mt-2 text-sm leading-6 text-white/62">
        {description || "No context available yet."}
      </div>

      {metrics.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {metrics.map((metric) => (
            <div
              key={`${label}-${metric.label}`}
              className="rounded-full border border-white/10 bg-black/22 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70"
            >
              {metric.label} {metric.value}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );

  if (!href) return inner;

  return (
    <Link href={href} className="block">
      {inner}
    </Link>
  );
}

export default function TodayIntelPanel() {
  const { intel, lastUpdatedAt, refreshIntel, debug } = useMarketData();

  const cards = useMemo(() => {
    const regimeMetrics: IntelMetricChip[] = [];
    const topSignalMetrics: IntelMetricChip[] = [];
    const bestSetupMetrics: IntelMetricChip[] = [];
    const moverMetrics: IntelMetricChip[] = [];
    const riskMetrics: IntelMetricChip[] = [];

    const bulls = formatWholeNumber(intel?.bullishCount);
    const bears = formatWholeNumber(intel?.bearishCount);
    if (bulls) regimeMetrics.push({ label: "Bull", value: bulls });
    if (bears) regimeMetrics.push({ label: "Bear", value: bears });

    const topScore = formatWholeNumber(intel?.topSignalScore);
    const topConviction = formatWholeNumber(intel?.topSignalConviction);
    const topMove = formatPct(intel?.topSignalChangePercent);
    if (topScore) topSignalMetrics.push({ label: "Score", value: topScore });
    if (topConviction) topSignalMetrics.push({ label: "Conv", value: topConviction });
    if (topMove) topSignalMetrics.push({ label: "Move", value: topMove });

    const setupScore = formatWholeNumber(intel?.bestSetupScore);
    const setupConviction = formatWholeNumber(intel?.bestSetupConviction);
    const setupDistance = formatPct(intel?.bestSetupTargetDistancePct);
    if (setupScore) bestSetupMetrics.push({ label: "Score", value: setupScore });
    if (setupConviction) bestSetupMetrics.push({ label: "Conv", value: setupConviction });
    if (setupDistance) bestSetupMetrics.push({ label: "Target", value: setupDistance });

    const moverChange = formatPct(intel?.moverChangePercent);
    const moverConviction = formatWholeNumber(intel?.moverConviction);
    if (moverChange) moverMetrics.push({ label: "Move", value: moverChange });
    if (moverConviction) moverMetrics.push({ label: "Conv", value: moverConviction });

    const riskStop = formatPct(intel?.riskDistanceToStopPct);
    const riskPl = formatPct(intel?.riskPlPct);
    if (riskStop) riskMetrics.push({ label: "Stop", value: riskStop });
    if (riskPl) riskMetrics.push({ label: "P/L", value: riskPl });

    return [
      {
        label: "Regime",
        value: intel?.regime ?? "—",
        description: intel?.regimeReason,
        metrics: regimeMetrics,
        href: "/?panel=regime",
        accent: intel?.regime === "Bullish",
        warn: intel?.regime === "Risk Off",
      },
      {
        label: "Top Signal",
        value: intel?.topSignal ?? "—",
        description: intel?.topSignalReason,
        href:
          intel?.topSignal && intel.topSignal !== "—"
            ? commandBuildLiveChartHref(intel.topSignal)
            : "/",
        metrics: topSignalMetrics,
        accent: true,
      },
      {
        label: "Best Setup",
        value: intel?.bestSetup ?? "—",
        description: intel?.bestSetupReason,
        href:
          intel?.bestSetup && intel.bestSetup !== "—"
            ? commandBuildLiveChartHref(intel.bestSetup)
            : "/",
        metrics: bestSetupMetrics,
        accent: true,
      },
      {
        label: "Mover",
        value: intel?.mover ?? "—",
        description: intel?.moverReason,
        href:
          intel?.mover && intel.mover !== "—"
            ? commandBuildStockHref(intel.mover)
            : "/",
        metrics: moverMetrics,
      },
      {
        label: "Risk Name",
        value: intel?.riskName ?? "—",
        description: intel?.riskNameReason,
        href:
          intel?.riskName && intel.riskName !== "—"
            ? `/stocks/${intel.riskName}?source=%2Ftoday&focus=portfolio&view=risk`
            : "/portfolio?view=risk",
        metrics: riskMetrics,
        warn: true,
      },
    ];
  }, [intel]);

  return (
    <section className="rounded-[30px] border border-white/10 bg-black/45 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/36">
            Today Intelligence
          </div>
          <div className="mt-1 text-lg font-semibold text-white">
            Server-authored market snapshot
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3 py-1.5">
            <span
              className={[
                "h-2 w-2 rounded-full",
                debug.streamConnected
                  ? "bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.7)]"
                  : "bg-white/35",
              ].join(" ")}
            />
            <span className="text-[10px] uppercase tracking-[0.16em] text-white/45">
              Live {formatUpdatedAt(lastUpdatedAt)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void refreshIntel()}
            className="rounded-2xl border border-white/10 bg-white/4 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/8"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <IntelCard
            key={card.label}
            label={card.label}
            value={card.value}
            description={card.description}
            metrics={card.metrics}
            href={card.href}
            accent={card.accent}
            warn={card.warn}
          />
        ))}
      </div>
    </section>
  );
}
