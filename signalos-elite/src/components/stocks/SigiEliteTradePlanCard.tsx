"use client";

import { BellRing, CheckCircle2, Crosshair, RotateCcw, ShieldCheck, Target, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  buildEliteTradePlan,
  type EliteTradePlanInput,
} from "@/lib/engines/eliteTradePlan";
import {
  advanceElitePlanTracker,
  createElitePlanTracker,
  ELITE_PLAN_TRACKING_STORAGE_KEY,
  ELITE_PLAN_TRACKING_UPDATED_EVENT,
  isElitePlanTracker,
  type ElitePlanTracker,
  type ElitePlanTrackerEvent,
} from "@/lib/engines/elitePlanMonitor";

type SigiEliteTradePlanCardProps = EliteTradePlanInput & {
  ticker: string;
  className?: string;
};

function formatPrice(value: number | null): string {
  return value == null ? "--" : `$${value.toFixed(2)}`;
}

function statusClasses(direction: "long" | "short" | "wait"): string {
  if (direction === "long") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  }
  if (direction === "short") {
    return "border-rose-400/25 bg-rose-400/10 text-rose-200";
  }
  return "border-amber-400/25 bg-amber-400/10 text-amber-200";
}

function trackerLabel(tracker: ElitePlanTracker | null): string {
  if (tracker == null) return "Arm to track this conditional plan.";
  if (tracker?.status === "tracking") return "Entry reached. Tracking outcome.";
  if (tracker?.status === "target_reached") return "Target reached.";
  if (tracker?.status === "invalidated") return "Invalidated.";
  return "Armed for entry.";
}

function trackerEventMessage(ticker: string, event: ElitePlanTrackerEvent): string | null {
  if (event === "entry_reached") return `${ticker} entered the Elite plan zone.`;
  if (event === "target_reached") return `${ticker} reached the Elite target.`;
  if (event === "invalidated") return `${ticker} invalidated the Elite plan.`;
  return null;
}

function readTracker(ticker: string): ElitePlanTracker | null {
  try {
    const raw = window.localStorage.getItem(ELITE_PLAN_TRACKING_STORAGE_KEY);
    if (!raw) return null;
    const trackers = JSON.parse(raw) as Record<string, unknown>;
    const tracker = trackers[ticker];
    return isElitePlanTracker(tracker) ? tracker : null;
  } catch {
    return null;
  }
}

function writeTracker(ticker: string, tracker: ElitePlanTracker | null): void {
  try {
    const raw = window.localStorage.getItem(ELITE_PLAN_TRACKING_STORAGE_KEY);
    const trackers = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};

    if (tracker == null) {
      delete trackers[ticker];
    } else {
      trackers[ticker] = tracker;
    }

    window.localStorage.setItem(ELITE_PLAN_TRACKING_STORAGE_KEY, JSON.stringify(trackers));
    window.dispatchEvent(new Event(ELITE_PLAN_TRACKING_UPDATED_EVENT));
  } catch {
    // Tracking remains available for the current card session when storage is unavailable.
  }
}

function LevelRow({
  icon,
  label,
  value,
  valueClassName = "text-white",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
      <div className="flex min-w-0 items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-white/45">
        <span className="shrink-0 text-cyan-300/80">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <span className={`shrink-0 text-xs font-semibold ${valueClassName}`}>{value}</span>
    </div>
  );
}

export default function SigiEliteTradePlanCard({
  ticker,
  className,
  ...input
}: SigiEliteTradePlanCardProps) {
  const plan = buildEliteTradePlan(input);
  const normalizedTicker = ticker.trim().toUpperCase() || "Stock";
  const canArmMonitor =
    plan.status === "ready" &&
    typeof input.price === "number" &&
    Number.isFinite(input.price);
  const [tracker, setTracker] = useState<ElitePlanTracker | null>(() =>
    typeof window === "undefined" ? null : readTracker(normalizedTicker)
  );
  const [monitorMessage, setMonitorMessage] = useState<string | null>(null);

  useEffect(() => {
    const syncTracker = () => setTracker(readTracker(normalizedTicker));
    window.addEventListener("storage", syncTracker);
    window.addEventListener(ELITE_PLAN_TRACKING_UPDATED_EVENT, syncTracker);

    return () => {
      window.removeEventListener("storage", syncTracker);
      window.removeEventListener(ELITE_PLAN_TRACKING_UPDATED_EVENT, syncTracker);
    };
  }, [normalizedTicker]);

  useEffect(() => {
    if (tracker == null || input.price == null) return;

    const storedTracker = readTracker(normalizedTicker);
    if (storedTracker == null || storedTracker.id !== tracker.id) {
      setTracker(storedTracker);
      return;
    }

    const result = advanceElitePlanTracker(storedTracker, input.price);
    if (result.tracker === storedTracker) return;

    writeTracker(normalizedTicker, result.tracker);
    setTracker(result.tracker);

    const eventMessage = trackerEventMessage(normalizedTicker, result.event);
    if (eventMessage == null) return;

    setMonitorMessage(eventMessage);
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(`Sigi Elite: ${normalizedTicker}`, { body: eventMessage });
    }
  }, [input.price, normalizedTicker, tracker]);

  const armPlanMonitor = () => {
    const nextTracker = createElitePlanTracker(normalizedTicker, plan, input.price);
    if (nextTracker == null) {
      setMonitorMessage(
        plan.status === "ready"
          ? "A live price is needed before this plan can be armed."
          : "This plan needs Elite confirmation before it can be tracked."
      );
      return;
    }

    writeTracker(normalizedTicker, nextTracker);
    setTracker(nextTracker);
    setMonitorMessage(trackerLabel(nextTracker));

    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  };

  const resetPlanMonitor = () => {
    writeTracker(normalizedTicker, null);
    setTracker(null);
    setMonitorMessage("Plan monitor reset.");
  };

  return (
    <section
      aria-label={`${normalizedTicker} Sigi Elite trade plan`}
      className={[
        "rounded-2xl border border-cyan-400/16 bg-cyan-400/4.5 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
            Sigi Elite
          </div>
          <div className="mt-1 text-sm font-semibold text-white">Conditional trade plan</div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${statusClasses(
            plan.direction
          )}`}
        >
          {plan.direction === "long" ? "Long" : plan.direction === "short" ? "Short" : "Wait"}
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-white/8 bg-black/20 px-2.5 py-2.5">
        <div className="text-xs font-semibold text-white">{plan.statusLabel}</div>
        <p className="mt-1 text-[11px] leading-4 text-white/60">{plan.confirmation}</p>
      </div>

      {plan.direction === "wait" ? null : (
        <div className="mt-3 space-y-2">
          <LevelRow
            icon={<Crosshair className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Entry zone"
            value={`${formatPrice(plan.entryLow)} - ${formatPrice(plan.entryHigh)}`}
            valueClassName={plan.direction === "long" ? "text-emerald-200" : "text-rose-200"}
          />
          <LevelRow
            icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Invalidation"
            value={formatPrice(plan.invalidation)}
            valueClassName="text-rose-200"
          />
          <LevelRow
            icon={<Target className="h-3.5 w-3.5" aria-hidden="true" />}
            label="First target"
            value={formatPrice(plan.target)}
            valueClassName="text-emerald-200"
          />
          <div className="flex items-center justify-between px-1 pt-0.5 text-[10px] uppercase tracking-[0.14em] text-white/40">
            <span>Reward / risk</span>
            <span className="font-semibold text-white/75">
              {plan.rewardRisk == null ? "--" : `${plan.rewardRisk.toFixed(2)}R`}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-3">
            <div className="flex min-w-0 items-center gap-2">
              {tracker?.status === "target_reached" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
              ) : tracker?.status === "invalidated" ? (
                <XCircle className="h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
              ) : (
                <BellRing className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
              )}
              <p className="text-[11px] leading-4 text-white/55">
                {monitorMessage ??
                  (tracker != null
                    ? trackerLabel(tracker)
                    : canArmMonitor
                      ? trackerLabel(null)
                      : "Outcome tracking unlocks with Elite confirmation.")}
              </p>
            </div>

            {tracker == null ? (
              <button
                type="button"
                onClick={armPlanMonitor}
                disabled={!canArmMonitor}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100 transition hover:border-cyan-300/45 hover:bg-cyan-400/16 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/35"
              >
                <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
                {canArmMonitor ? "Arm" : "Await"}
              </button>
            ) : (
              <button
                type="button"
                onClick={resetPlanMonitor}
                title="Reset Elite plan monitor"
                aria-label="Reset Elite plan monitor"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/5 text-white/65 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}