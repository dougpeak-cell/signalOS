import { formatMarketTime } from "@/lib/marketTime";
"use client";

import ConfidenceBar from "@/components/ui/ConfidenceBar";

import { useState } from "react";
import type { ChartSignal } from "@/lib/chartSignals";

function toneClasses(tone?: string) {
  if (tone === "bullish") {
    return {
      badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      dot: "bg-emerald-400",
      row: "border-emerald-500/15 hover:border-emerald-400/30 hover:bg-emerald-500/5",
      active:
        "border-emerald-400/40 bg-emerald-500/10 ring-1 ring-emerald-400/25",
    };
  }

  if (tone === "bearish") {
    return {
      badge: "border-rose-500/30 bg-rose-500/10 text-rose-300",
      dot: "bg-rose-400",
      row: "border-rose-500/15 hover:border-rose-400/30 hover:bg-rose-500/5",
      active: "border-rose-400/40 bg-rose-500/10 ring-1 ring-rose-400/25",
    };
  }

  return {
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400",
    row: "border-white/10 hover:border-white/20 hover:bg-white/[0.03]",
    active: "border-sky-400/30 bg-sky-500/10 ring-1 ring-sky-400/20",
  };
}

function formatTimeLabel(unixSeconds: number | null | undefined) {
  if (unixSeconds == null || !Number.isFinite(Number(unixSeconds))) return "—";
  return formatMarketTime(Number(unixSeconds));
}

function confidenceBarClass(confidence: number) {
  if (confidence >= 90) return "bg-emerald-400";
  if (confidence >= 80) return "bg-sky-400";
  if (confidence >= 70) return "bg-amber-400";
  return "bg-neutral-500";
}

type Props = {
  ticker: string;
  signals: ChartSignal[];
  selectedTime: number | null;
  onSignalClick: (time: number) => void;
  collapsed?: boolean;
  onToggleCollapse: () => void;
  signalCount?: number;
  floatingMode?: boolean;
};

function DesktopRail({
  ticker,
  signals,
  selectedTime,
  onSignalClick,
  collapsed = false,
  onToggleCollapse,
  signalCount,
  floatingMode = false,
}: Props) {
  return (
    <div>
      <div
        className={`h-full transition-all duration-300 ease-out ${
          collapsed
            ? "translate-x-full opacity-0 pointer-events-none"
            : "translate-x-0 opacity-100"
        } min-h-[86vh] overflow-hidden rounded-[28px] border border-white/10 ${
          floatingMode ? "bg-[#0b0f14]" : "bg-neutral-950"
        } shadow-2xl shadow-black/40`}
      >
        {collapsed ? (
          <div className="flex min-h-[86vh] flex-col items-center px-2 py-3">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/3 text-lg text-white transition hover:bg-white/8"
              aria-label="Expand signal rail"
              title="Expand signal rail"
            >
              ←
            </button>

            <div className="mt-4 flex flex-1 flex-col items-center gap-3">
              <div className="rotate-180 text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500 [writing-mode:vertical-rl]">
                Signal Rail
              </div>

              <div className="rounded-full border border-white/10 bg-white/3 px-2 py-1 text-[11px] font-semibold text-neutral-300">
                {signalCount ?? signals.length}
              </div>

              <div className="mt-2 flex flex-col gap-2">
                {signals.slice(0, 8).map((signal, index) => {
                  const styles = toneClasses(signal.tone);
                  const isActive =
                    selectedTime != null &&
                    Number(selectedTime) === Number(signal.time);

                  return (
                    <button
                      key={`${signal.type}-${signal.time}-${index}`}
                      type="button"
                      onClick={() => onSignalClick(Number(signal.time))}
                      className={`h-2.5 w-2.5 rounded-full transition ${
                        isActive ? "ring-4 ring-white/15" : ""
                      } ${styles.dot}`}
                      title={`${signal.label} • ${formatTimeLabel(
                        Number(signal.time)
                      )}`}
                      aria-label={signal.label}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                  Signal Rail
                </div>
                <div className="mt-1 text-sm text-neutral-300">
                  {ticker} • {signalCount ?? signals.length} active signals
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleCollapse}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/3 text-lg text-white transition hover:bg-white/8"
                aria-label="Collapse signal rail"
                title="Collapse signal rail"
              >
                →
              </button>
            </div>

            <div className="space-y-3 overflow-x-hidden px-3 py-3">
              {signals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/2 p-4 text-sm text-neutral-400">
                  Waiting for signal stream…
                </div>
              ) : null}

              {signals.map((signal, index) => {
                const styles = toneClasses(signal.tone);
                const isActive =
                  selectedTime != null &&
                  Number(selectedTime) === Number(signal.time);
                const confidence = Number(signal.confidence ?? 0);

                return (
                  <button
                    key={`${signal.type}-${signal.time}-${index}`}
                    type="button"
                    onClick={() => onSignalClick(Number(signal.time))}
                    className={`block w-full rounded-2xl border border-white/10 p-3 text-left transition ${
                      floatingMode
                        ? "bg-[#11161c]"
                        : "bg-white/2"
                    } ${isActive ? styles.active : styles.row}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${styles.dot}`}
                          />
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${styles.badge}`}
                          >
                            {signal.grade ?? "SIG"}
                          </span>
                        </div>

                        <div className="mt-2 truncate text-sm font-semibold text-white">
                          {signal.label}
                        </div>

                        <div className="mt-1 text-xs text-neutral-400">
                          {formatTimeLabel(Number(signal.time))}
                        </div>
                      </div>

                      <div className="text-right">
                        <ConfidenceBar
                          value={confidence}
                          tone={signal.tone === "bullish" ? "bullish" : signal.tone === "bearish" ? "bearish" : "neutral"}
                          size="md"
                        />
                        <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/45">
                          {signal.tone === "bullish"
                            ? "Long Confidence"
                            : signal.tone === "bearish"
                            ? "Short Confidence"
                            : "Confidence"}
                        </div>
                      </div>
                    </div>

                    {/* ConfidenceBar replaces custom bar above */}

                    {signal.reasons?.length ? (
                      <div className="mt-3 space-y-1">
                        {signal.reasons.slice(0, 3).map((reason, i) => (
                          <div
                            key={`${signal.type}-${signal.time}-reason-${i}`}
                            className="text-xs leading-5 text-neutral-400"
                          >
                            • {reason}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MobileSignalTray({
  signals,
  selectedTime,
  onSignalClick,
  signalCount,
}: Pick<Props, "signals" | "selectedTime" | "onSignalClick" | "signalCount">) {
  const [selectedSignalKey, setSelectedSignalKey] = useState<string | null>(
    null
  );

  return (
    <div className="xl:hidden">
         <div className="z-30 overflow-hidden rounded-[22px] border border-white/10 border-b-white/15 bg-neutral-950/95 shadow-xl shadow-black/30 backdrop-blur supports-backdrop-filter:bg-neutral-950/80">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
              Signal Feed
            </div>
            <div className="mt-1 text-sm text-neutral-300">
              Swipe cards • focus chart
            </div>
          </div>

          <div className="rounded-full border border-white/10 bg-white/3 px-3 py-1 text-[11px] font-semibold text-neutral-300">
            {signalCount ?? signals.length} signals
          </div>
        </div>

        {signals.length === 0 ? (
          <div className="px-4 py-4 text-sm text-neutral-400">
            Waiting for signal stream…
          </div>
        ) : (
          <div className="p-3">
            <div
              className="
                flex gap-3 overflow-x-auto pb-2
                snap-x snap-mandatory
                [-ms-overflow-style:none]
                [scrollbar-width:none]
                [&::-webkit-scrollbar]:hidden
              "
            >
              {signals.map((signal, index) => {
                const styles = toneClasses(signal.tone);
                const confidence = Number(signal.confidence ?? 0);
                const signalKey = `${signal.type}-${signal.time}-${signal.label ?? ""}`;
                const isSelected =
                  selectedSignalKey === signalKey ||
                  (selectedTime != null &&
                    Number(selectedTime) === Number(signal.time));

                return (
                  <button
                    key={`${signal.type}-${signal.time}-${index}`}
                    type="button"
                    onClick={() => {
                      setSelectedSignalKey(signalKey);
                      onSignalClick(Number(signal.time));
                    }}
                    className={`min-w-70 max-w-70 shrink-0 snap-start rounded-2xl border p-3 text-left transition ${
                      isSelected ? styles.active : `${styles.row} bg-white/5`
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${styles.dot}`}
                          />
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${styles.badge}`}
                          >
                            {signal.grade ?? "SIG"}
                          </span>
                        </div>

                        <div className="mt-2 truncate text-sm font-semibold text-white">
                          {signal.label}
                        </div>

                        <div className="mt-1 text-xs text-neutral-400">
                          {formatTimeLabel(Number(signal.time))}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-semibold text-white">
                          {confidence}%
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                          confidence
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div
                        className={`h-full rounded-full ${confidenceBarClass(
                          confidence
                        )}`}
                        style={{
                          width: `${Math.max(6, Math.min(100, confidence))}%`,
                        }}
                      />
                    </div>

                    {signal.reasons?.length ? (
                      <div className="mt-3 space-y-1">
                        {signal.reasons.slice(0, 2).map((reason, i) => (
                          <div
                            key={`${signal.type}-${signal.time}-reason-${i}`}
                            className="line-clamp-2 text-xs leading-5 text-neutral-400"
                          >
                            • {reason}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                      Focus chart
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SignalRailPanel(props: Props) {
  return (
    <>
      <MobileSignalTray
        signals={props.signals}
        selectedTime={props.selectedTime}
        onSignalClick={props.onSignalClick}
        signalCount={props.signalCount}
      />

      <div className="hidden xl:block">
        <DesktopRail {...props} floatingMode={props.floatingMode} />
      </div>
    </>
  );
}