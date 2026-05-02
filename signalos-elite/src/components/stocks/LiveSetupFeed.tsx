"use client";

import { useSignal } from "@/context/SignalContext";
import type { ChartSignal } from "@/lib/chartSignals";

function getConfluenceScore(signal: {
  confidence?: number | null;
  grade?: string | null;
  bias?: string | null;
  direction?: string | null;
}) {
  const rawConfidence = Number(signal.confidence ?? 0);
  const confidence = rawConfidence > 1 ? rawConfidence / 100 : rawConfidence;

  const confidenceScore = Math.max(0, Math.min(100, confidence * 70));

  const gradeKey = String(signal.grade ?? "").toUpperCase().trim();
  const gradeScore =
    gradeKey === "A+" ? 18 :
    gradeKey === "A" ? 15 :
    gradeKey === "B+" ? 12 :
    gradeKey === "B" ? 9 :
    gradeKey === "C" ? 5 : 0;

  const biasKey = String(signal.bias ?? signal.direction ?? "").toLowerCase().trim();
  const biasScore =
    biasKey === "bullish" || biasKey === "bearish" ? 8 :
    biasKey === "neutral" ? 3 : 0;

  const total = Math.round(confidenceScore + gradeScore + biasScore);
  return Math.max(0, Math.min(99, total));
}

function getSignalIcon(type: string) {
  if (/equal highs/i.test(type)) {
    return { icon: "⇈", color: "text-rose-400" };
  }

  if (/equal lows/i.test(type)) {
    return { icon: "⇊", color: "text-emerald-400" };
  }

  if (/sweep/i.test(type)) {
    return { icon: "⚡", color: "text-amber-400" };
  }

  if (/absorption/i.test(type)) {
    return { icon: "◉", color: "text-fuchsia-400" };
  }

  if (/trend/i.test(type)) {
    return { icon: "📈", color: "text-indigo-400" };
  }

  if (/trap/i.test(type)) {
    return { icon: "⚠", color: "text-orange-400" };
  }

  return { icon: "•", color: "text-white/70" };
}

function getSignalKey(signal: ChartSignal) {
  return `${signal.type}-${signal.time}-${signal.label ?? ""}`;
}

type Props = {
  signals: ChartSignal[];
  onSignalClick?: (key: string | null, time: number | null) => void;
  selectedSignalKey?: string | null;
  selectedTime?: number | null;
};

function toneClasses(tone: ChartSignal["tone"]) {
  if (tone === "bullish") {
    return {
      border: "border-emerald-400/30",
      badge: "border border-emerald-400/30 bg-emerald-400/12 text-emerald-300",
      glow: "hover:border-emerald-400/40",
    };
  }

  if (tone === "bearish") {
    return {
      border: "border-rose-400/30",
      badge: "border border-rose-400/30 bg-rose-400/12 text-rose-300",
      glow: "hover:border-rose-400/40",
    };
  }

  return {
    border: "border-amber-400/30",
    badge: "border border-amber-400/30 bg-amber-400/12 text-amber-300",
    glow: "hover:border-amber-400/40",
  };
}

function gradeClasses(grade?: string) {
  if (grade === "A+") {
    return "border border-yellow-400/40 bg-yellow-300 text-neutral-950";
  }

  if (grade === "A") {
    return "border border-emerald-400/30 bg-emerald-400/12 text-emerald-300";
  }

  if (grade === "B" || grade === "B+") {
    return "border border-cyan-400/30 bg-cyan-400/12 text-cyan-300";
  }

  return "border border-white/10 bg-white/5 text-white/70";
}

function formatSignalTime(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function LiveSetupFeed({
  signals,
  onSignalClick,
  selectedSignalKey,
}: Props) {
  const { setSelectedSignal } = useSignal();

  if (!signals?.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/55 backdrop-blur">
        No live signals yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Live Signal Rail
          </div>
          <div className="mt-1 text-sm text-white/55">
            Swipe on mobile. Tap any card to center the chart.
          </div>
        </div>

        <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/60 backdrop-blur">
          {signals.length} signal{signals.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-3 bg-linear-to-r from-black/80 to-transparent xl:block" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-3 bg-linear-to-l from-black/80 to-transparent xl:block" />

        <div
          className="
            flex gap-3 overflow-x-auto pb-2 pr-1
            snap-x snap-mandatory scroll-smooth
            [scrollbar-width:none] [-ms-overflow-style:none]
            [&::-webkit-scrollbar]:hidden
            lg:grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 lg:overflow-visible
          "
        >
          {signals.map((signal, index) => {
            const signalKey = getSignalKey(signal);
            const isSelected = selectedSignalKey === signalKey;
            const tone = toneClasses(signal.tone);
            const iconData = getSignalIcon(signal.label ?? signal.type);
            const confluenceScore = getConfluenceScore(signal);
            const confidence = Math.round(Number(signal.confidence ?? 0));

            return (
              <button
                key={`${signal.type}-${signal.time}-${signal.label}-${index}`}
                type="button"
                onClick={() => {
                  setSelectedSignal(signal);
                  onSignalClick?.(
                    isSelected ? null : signalKey,
                    isSelected ? null : Number(signal.time)
                  );
                }}
                className={[
                  "relative min-w-62.5 snap-start rounded-2xl border p-3 text-left backdrop-blur transition-all duration-200",
                  "lg:min-w-0",
                  isSelected
                    ? "border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_14px_rgba(34,211,238,0.18)]"
                    : `border-white/10 bg-white/5 ${tone.glow} hover:bg-white/[0.07]`,
                ].join(" ")}
              >
                <div
                  className={[
                    "absolute bottom-3 left-0 top-3 w-0.75 rounded-r-full transition-all",
                    isSelected
                      ? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]"
                      : "bg-transparent",
                  ].join(" ")}
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[14px] ${iconData.color}`}>
                        {iconData.icon}
                      </span>
                      <span className="truncate text-sm font-semibold text-white">
                        {signal.label}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-white/55">
                      {formatSignalTime(Number(signal.time))}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {signal.grade ? (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${gradeClasses(
                          signal.grade
                        )}`}
                      >
                        {signal.grade}
                      </span>
                    ) : null}

                    <div className="rounded-full border border-emerald-400/30 bg-emerald-400/12 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                      CFX {confluenceScore}
                    </div>

                    <span className="rounded-full border border-fuchsia-400/35 bg-fuchsia-400/12 px-2.5 py-0.5 text-[11px] font-bold text-fuchsia-300">
                      signal
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${tone.badge}`}
                  >
                    {signal.tone}
                  </span>

                  <span className="text-sm font-semibold text-white/85">
                    {confidence}%
                  </span>
                </div>

                {signal.reasons?.length ? (
                  <div className="mt-3 space-y-1.5">
                    {signal.reasons.slice(0, 2).map((reason, idx) => (
                      <div
                        key={`${signal.time}-${idx}`}
                        className="text-[12px] leading-relaxed text-white/70"
                      >
                        {reason}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                      Signal Strength
                    </span>
                    <span
                      className={`text-[10px] font-semibold ${
                        confidence >= 85
                          ? "text-emerald-300"
                          : confidence >= 70
                            ? "text-amber-300"
                            : "text-white/60"
                      }`}
                    >
                      {confidence}%
                    </span>
                  </div>

                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-cyan-400 via-indigo-400 to-fuchsia-400"
                      style={{ width: `${confidence}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                    Focus Chart
                  </div>

                  {isSelected ? (
                    <div className="rounded-full border border-cyan-400/30 bg-cyan-400/12 px-2 py-1 text-[11px] font-semibold text-cyan-300">
                      Selected
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}